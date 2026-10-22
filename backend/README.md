# FC Barcelona La Liga Match Predictor Suite

A machine learning application that predicts FC Barcelona's La Liga match outcomes (Win, Draw, or Loss) using expected goals (xG), historical match data, and rolling performance metrics. The project combines a data processing pipeline, an XGBoost classification model, and a FastAPI REST API.

## Features

- **Automated Data Ingestion:** Retrieves historical match data from Understat for supported seasons.
- **Feature Engineering:** Calculates five-match rolling averages for goals scored, goals conceded, and expected goals.
- **Machine Learning:** Uses an XGBoost multiclass classifier to predict match outcomes.
- **REST API:** Exposes predictions through a FastAPI backend.
- **Automated Feature Retrieval:** Accepts an opponent and venue indicator, then retrieves the relevant historical performance metrics.
- **Prediction Probabilities:** Returns estimated probabilities for a win, draw, or loss.

## Technology Stack

| Component | Technologies |
|---|---|
| Programming Language | Python 3.12 |
| Data Collection | understatapi |
| Data Processing | pandas, NumPy |
| Machine Learning | scikit-learn, XGBoost |
| Model Persistence | joblib |
| API Framework | FastAPI |
| ASGI Server | Uvicorn |
| Data Validation | Pydantic |

## Project Structure

```text
barca-match-predictor/
├── data/
│   ├── raw/
│   └── processed/
│       └── barca_features.csv
├── models/
│   └── barca_xg_model.pkl
├── src/
│   ├── data_loader.py
│   ├── feature_engineering.py
│   ├── train_model.py
│   └── api.py
├── requirements.txt
└── README.md
```

- `data/raw/`: Stores collected historical match data.
- `data/processed/`: Contains datasets prepared for model training.
- `models/`: Stores the trained machine learning model.
- `src/data_loader.py`: Collects and cleans match data.
- `src/feature_engineering.py`: Generates rolling performance metrics.
- `src/train_model.py`: Trains and evaluates the classifier.
- `src/api.py`: Implements the prediction API.
- `requirements.txt`: Lists the project's Python dependencies.

The structure represents the intended organization of the project. Actual file names and generated artifacts depend on the implementation.

## Installation

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd barca-match-predictor
```

Replace `<YOUR_REPOSITORY_URL>` with the URL of your repository.

### 2. Create a Virtual Environment

On macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows:

```powershell
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies

Install the dependencies listed in the project configuration:

```bash
pip install -r requirements.txt
```


## Machine Learning Pipeline

Execute the following scripts from the project root in the specified order.

### Step 1: Data Collection

```bash
python src/data_loader.py
```

Retrieves historical match data from the configured source and prepares the raw dataset.

### Step 2: Feature Engineering

```bash
python src/feature_engineering.py
```

Processes the collected data and calculates rolling performance metrics for subsequent model training.

### Step 3: Model Training

```bash
python src/train_model.py
```

Trains the XGBoost classifier, evaluates its performance, and saves the model artifact if configured in the training script.

The pipeline must successfully generate the required datasets and trained model before the API can serve predictions.

## Running the API

### 1. Start the Server

From the project root, execute:

```bash
uvicorn src.api:app --reload
```

Once the server starts successfully, the API is available at:

- **Base URL:** http://127.0.0.1:8000
- **Swagger UI:** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc

These URLs assume the default local Uvicorn configuration.

## Methodology

The prediction workflow consists of six stages:

1. **Data collection:** Retrieve historical match statistics from the configured data source.
2. **Data preparation:** Clean and organize match records for analysis.
3. **Feature engineering:** Calculate rolling statistics representing recent team performance.
4. **Model training:** Train an XGBoost multiclass classifier to distinguish between wins, draws, and losses.
5. **Prediction:** Retrieve the relevant features for the requested fixture and generate a prediction.
6. **Probability estimation:** Return the estimated probability for each outcome when supported by the trained classifier.

## Limitations

- Predictions are estimates and cannot guarantee match results.
- Historical performance may not reflect current team conditions, injuries, tactical changes, or other relevant factors.
- Prediction quality depends on the coverage, accuracy, and relevance of the underlying data.
- The feature retrieval process must handle opponents with insufficient historical data.
- Model evaluation should use a separate test dataset and a time-aware validation strategy to reduce data leakage.
- Probability estimates should be evaluated for calibration before being interpreted as reliable real-world probabilities.

## Model Evaluation

Model performance should be assessed using appropriate classification metrics, including:

- Accuracy
- Precision, recall, and F1-score
- Confusion matrix
- Multiclass log loss
- Probability calibration

Any reported performance figure, including test accuracy, should be supported by reproducible evaluation results. Performance on historical data does not guarantee equivalent results on future fixtures.

## Future Improvements

Potential extensions include:

- Incorporating player availability, injuries, and suspensions.
- Adding opponent-specific historical performance and head-to-head statistics.
- Comparing XGBoost with alternative classification models.
- Implementing automated data refresh and scheduled model retraining.
- Adding prediction history and model performance monitoring.
- Deploying the API with appropriate logging, validation, and monitoring.

## Disclaimer

This project is intended for analytical purposes. Predictions are generated from historical data and statistical models and should not be treated as guaranteed outcomes.

