import os
import joblib
import pandas as pd
import numpy as np

def predict_match(is_home: int, 
                  barca_goals_rolling: float, 
                  opp_goals_rolling: float, 
                  barca_xg_rolling: float, 
                  opp_xg_rolling: float, 
                  model_path: str = 'models/barca_xg_model.pkl') -> None:
    """
    Loads the trained XGBoost model and predicts the outcome probabilities 
    for an upcoming FC Barcelona fixture based on rolling form metrics.
    """
    if not os.path.exists(model_path):
        print(f"[!] Error: Trained model not found at {model_path}. Run train_model.py first.")
        return

    # Load model
    model = joblib.load(model_path)

    # Format input into a dataframe with exact matching feature names
    input_data = pd.DataFrame([{
        'is_home': is_home,
        'barca_goals_rolling': barca_goals_rolling,
        'opp_goals_rolling': opp_goals_rolling,
        'barca_xg_rolling': barca_xg_rolling,
        'opp_xg_rolling': opp_xg_rolling
    }])

    # Predict probabilities for each class [Loss (0), Draw (1), Win (2)]
    probabilities = model.predict_proba(input_data)[0]
    predicted_class = model.predict(input_data)[0]

    # Map classes to human-readable labels
    class_labels = {0: 'Loss', 1: 'Draw', 2: 'Win'}
    
    print("\n" + "="*40)
    print(" ⚽ FC BARCELONA MATCH PREDICTION REPORT ")
    print("="*40)
    print(f" Venue: {'Home (Camp Nou / Estadi Olímpic)' if is_home == 1 else 'Away'}")
    print(f" Barca Recent Goals (Last 5 avg): {barca_goals_rolling:.2f}")
    print(f" Opponent Recent Goals (Last 5 avg): {opp_goals_rolling:.2f}")
    print(f" Barca Recent xG (Last 5 avg): {barca_xg_rolling:.2f}")
    print(f" Opponent Recent xG (Last 5 avg): {opp_xg_rolling:.2f}")
    print("-"*40)
    print(f" Predicted Outcome: {class_labels[predicted_class].upper()} ({predicted_class})")
    print("-"*40)
    print(" Probability Breakdown:")
    print(f"   - Loss (0):  {probabilities[0] * 100:.2f}%")
    print(f"   - Draw (1):  {probabilities[1] * 100:.2f}%")
    print(f"   - Win (2):   {probabilities[2] * 100:.2f}%")
    print("="*40 + "\n")

if __name__ == "__main__":
    predict_match(
        is_home=0,              # Away match
        barca_goals_rolling=2.4,# Average goals scored over last 5 games
        opp_goals_rolling=0.8,  # Average goals conceded over last 5 games
        barca_xg_rolling=2.1,   # Average xG generated over last 5 games
        opp_xg_rolling=1.1      # Average xG conceded over last 5 games
    )