from pyexpat import model
import os
import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier

def train_barca_predictor(data_path: str = 'data/processed/barca_features.csv', 
                          model_output_path: str = 'models/barca_xg_model.pkl') -> None:
    """
    Trains an XGBoost classifier to predict Barcelona's La Liga match outcomes 
    using rolling xG and goal form features.
    """
    print("[-] Loading processed La Liga feature dataset...")
    if not os.path.exists(data_path):
        print(f"[!] Error: Processed data not found at {data_path}")
        return

    df = pd.read_csv(data_path)

    # Features (X) and Target (y)
    feature_cols = [
        'is_home', 
        'barca_goals_rolling', 
        'opp_goals_rolling', 
        'barca_xg_rolling', 
        'opp_xg_rolling'
    ]
    
    X = df[feature_cols]
    y = df['target']

    # Chronological Split: Train on older matches, test on the most recent 20 matches
    split_index = len(df) - 20
    X_train, X_test = X.iloc[:split_index], X.iloc[split_index:]
    y_train, y_test = y.iloc[:split_index], y.iloc[split_index:]

    print(f"[-] Training set shape: {X_train.shape}, Test set shape: {X_test.shape}")

    # Initialize and train XGBoost Classifier
    print("[-] Training XGBoost model on La Liga data...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        random_state=42,
        eval_metric='mlogloss'
    )
    
    model.fit(X_train, y_train)

   # Evaluate model performance on recent unseen matches
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print(f"\n[+] La Liga Model Training Complete!")
    print(f"[+] Test Set Accuracy: {acc * 100:.2f}%")
    print("\n--- Classification Report ---")
    
    # Dynamically handle classes present in y_test to prevent sizing errors
    unique_labels = np.unique(np.concatenate([y_test, y_pred]))
    target_names_map = {0: 'Loss (0)', 1: 'Draw (1)', 2: 'Win (2)'}
    active_target_names = [target_names_map[l] for l in unique_labels]
    
    print(classification_report(y_test, y_pred, labels=unique_labels, target_names=active_target_names, zero_division=0))
    # Save trained model artifact
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(model, model_output_path)
    print(f"[+] Saved trained model artifact to {model_output_path}")

if __name__ == "__main__":
    train_barca_predictor()