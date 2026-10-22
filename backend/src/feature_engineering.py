import os
import pandas as pd
import numpy as np

def engineer_features(input_path: str = 'data/raw/barca_understat_matches.csv', 
                      output_path: str = 'data/processed/barca_features.csv') -> pd.DataFrame:
    """
    Transforms raw match records into rolling form features for machine learning.
    """
    print("[-] Loading raw match data...")
    if not os.path.exists(input_path):
        print(f"[!] Error: Raw data file not found at {input_path}")
        return pd.DataFrame()

    df = pd.read_csv(input_path)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)

    # Map target variable (Match Result for Barca: Win=2, Draw=1, Loss=0)
    result_map = {'w': 2, 'd': 1, 'l': 0}
    df['target'] = df['result'].map(result_map)

    # Calculate Rolling Averages (Last 5 matches form)
    # shift(1) ensures we only use PAST matches, preventing data leakage!
    window = 5
    
    df['barca_goals_rolling'] = df['barca_goals'].shift(1).rolling(window=window, min_periods=1).mean()
    df['opp_goals_rolling'] = df['opp_goals'].shift(1).rolling(window=window, min_periods=1).mean()
    
    df['barca_xg_rolling'] = df['barca_xg'].shift(1).rolling(window=window, min_periods=1).mean()
    df['opp_xg_rolling'] = df['opp_xg'].shift(1).rolling(window=window, min_periods=1).mean()

    # Drop rows with missing rolling values (the very first match of the dataset)
    df = df.dropna(subset=['barca_xg_rolling']).reset_index(drop=True)

    # Save processed features
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[+] Feature engineering complete! Saved processed dataset to {output_path}")
    print(f"[+] Total usable training rows: {len(df)}")
    
    return df

if __name__ == "__main__":
    engineer_features()