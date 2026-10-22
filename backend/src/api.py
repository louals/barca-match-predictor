import os
import re
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# ─────────────────────────────────────────────────────────────
# Path Configuration (Safe across any working directory)
# ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "barca_xg_model.pkl"
FEATURES_CSV = BASE_DIR / "data" / "processed" / "barca_features.csv"

# Global in-memory cache for high performance & DoS resistance
APP_CACHE: Dict = {
    "model": None,
    "features_df": None,
    "latest_barca_form": None,
}

# ─────────────────────────────────────────────────────────────
# In-Memory Rate Limiter (Token/Sliding Window per IP)
# ─────────────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_SECONDS = 60
MAX_PREDICTIONS_PER_WINDOW = 30  # Max 30 prediction requests per minute per IP
IP_REQUEST_LOG: Dict[str, List[float]] = defaultdict(list)


def is_rate_limited(client_ip: str, limit: int = MAX_PREDICTIONS_PER_WINDOW) -> bool:
    """Checks if an IP has exceeded rate limit within sliding window."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS

    # Filter out timestamps older than the window
    recent_requests = [ts for ts in IP_REQUEST_LOG[client_ip] if ts > cutoff]
    IP_REQUEST_LOG[client_ip] = recent_requests

    if len(recent_requests) >= limit:
        return True

    IP_REQUEST_LOG[client_ip].append(now)

    # Periodic cleanup of inactive IPs to avoid memory leaks
    if len(IP_REQUEST_LOG) > 5000:
        stale_ips = [ip for ip, timestamps in IP_REQUEST_LOG.items() if not timestamps or timestamps[-1] < cutoff]
        for ip in stale_ips:
            del IP_REQUEST_LOG[ip]

    return False


# ─────────────────────────────────────────────────────────────
# Resource Loading Helpers
# ─────────────────────────────────────────────────────────────
def load_resources():
    """Loads the model and processed features into memory once."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    if not FEATURES_CSV.exists():
        raise FileNotFoundError(f"Features file not found at {FEATURES_CSV}")

    APP_CACHE["model"] = joblib.load(MODEL_PATH)
    df = pd.read_csv(FEATURES_CSV)
    APP_CACHE["features_df"] = df

    # Pre-cache Barca's latest rolling form (the last row)
    latest_row = df.iloc[-1]
    APP_CACHE["latest_barca_form"] = {
        "barca_goals_rolling": float(latest_row["barca_goals_rolling"]),
        "barca_xg_rolling": float(latest_row["barca_xg_rolling"]),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for clean startup and shutdown."""
    try:
        load_resources()
    except Exception as e:
        print(f"[!] Warning during model/data preloading: {e}")
    yield


# ─────────────────────────────────────────────────────────────
# FastAPI App Initialization
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="FC Barcelona Match Predictor API",
    description="Production-ready match outcome predictor powered by XGBoost, rolling xG metrics, and Understat data.",
    version="2.1.0",
    lifespan=lifespan,
)

# CORS configuration: Allow frontend local dev and production hosting
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "https://barca-match-predictor.vercel.app,http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# Security Headers & Body Size Middleware
@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # Reject oversized payloads (> 50KB) to prevent memory exhaustion attacks
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 50_000:
        return Response(content="Payload Too Large", status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    response = await call_next(request)

    # Apply strict security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ─────────────────────────────────────────────────────────────
# Request Schema & Validation
# ─────────────────────────────────────────────────────────────
class MatchRequest(BaseModel):
    opponent: str = Field(
        ...,
        min_length=2,
        max_length=60,
        description="Opponent team name (e.g., Real Madrid, Sevilla, Athletic Club)",
    )
    is_home: int = Field(
        ...,
        ge=0,
        le=1,
        description="Match venue: 1 for Home (Camp Nou), 0 for Away",
    )

    @field_validator("opponent")
    @classmethod
    def sanitize_opponent(cls, value: str) -> str:
        clean = value.strip()
        # Only allow alphabetic characters, numbers, spaces, dots, hyphens, and standard accents
        if not re.match(r"^[\w\s\.\-\'áéíóúÁÉÍÓÚñÑüÜçÇ]+$", clean):
            raise ValueError("Opponent name contains invalid characters.")
        return clean


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    """Root info endpoint."""
    return {
        "status": "online",
        "service": "FC Barcelona Match Predictor API",
        "version": "2.1.0",
        "author": "Louai Al Sabbagh",
    }


@app.get("/health")
@app.get("/wake")
def health_check():
    """
    Wake-up & health check endpoint.
    Used by hosting platforms (Render, Railway, Fly.io, Vercel) and frontend to keep or wake instances.
    """
    is_ready = APP_CACHE["model"] is not None and APP_CACHE["features_df"] is not None
    return {
        "status": "healthy" if is_ready else "degraded",
        "awake": True,
        "model_loaded": APP_CACHE["model"] is not None,
        "dataset_loaded": APP_CACHE["features_df"] is not None,
        "timestamp": int(time.time()),
    }


@app.post("/predict")
def predict_match(data: MatchRequest, request: Request):
    """
    Predicts match outcome probabilities based on team form and rolling xG.
    Protected with rate limiting and in-memory execution.
    """
    client_ip = request.client.host if request.client else "unknown"

    # Enforce rate limit
    if is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a minute before requesting another prediction.",
            headers={"Retry-After": "60"},
        )

    # Ensure model and features are available (fallback reload if needed)
    if APP_CACHE["model"] is None or APP_CACHE["features_df"] is None:
        try:
            load_resources()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Predictor resources not ready: {str(e)}",
            )

    try:
        df = APP_CACHE["features_df"]
        latest_barca = APP_CACHE["latest_barca_form"]

        barca_goals_rolling = latest_barca["barca_goals_rolling"]
        barca_xg_rolling = latest_barca["barca_xg_rolling"]

        # Opponent historical form retrieval
        opponent_name = data.opponent
        opp_history = df[df["opponent"].str.lower() == opponent_name.lower()]

        if not opp_history.empty:
            latest_opp_row = opp_history.iloc[-1]
            opp_goals_rolling = float(latest_opp_row["opp_goals_rolling"])
            opp_xg_rolling = float(latest_opp_row["opp_xg_rolling"])
        else:
            # Fallback to league average defaults for new or unfamiliar teams
            opp_goals_rolling = 1.2
            opp_xg_rolling = 1.1

        # Format input for model
        input_df = pd.DataFrame(
            [
                {
                    "is_home": data.is_home,
                    "barca_goals_rolling": barca_goals_rolling,
                    "opp_goals_rolling": opp_goals_rolling,
                    "barca_xg_rolling": barca_xg_rolling,
                    "opp_xg_rolling": opp_xg_rolling,
                }
            ]
        )

        model = APP_CACHE["model"]
        probabilities = model.predict_proba(input_df)[0]
        predicted_class = int(model.predict(input_df)[0])

        class_labels = {0: "Loss", 1: "Draw", 2: "Win"}

        return {
            "fixture": {
                "opponent": opponent_name,
                "venue": "Home" if data.is_home == 1 else "Away",
            },
            "retrieved_metrics": {
                "barca_goals_rolling": barca_goals_rolling,
                "barca_xg_rolling": barca_xg_rolling,
                "opp_goals_rolling": opp_goals_rolling,
                "opp_xg_rolling": opp_xg_rolling,
            },
            "prediction": {
                "outcome": class_labels[predicted_class],
                "probabilities": {
                    "loss": round(float(probabilities[0]) * 100, 2),
                    "draw": round(float(probabilities[1]) * 100, 2),
                    "win": round(float(probabilities[2]) * 100, 2),
                },
            },
        }

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
