import os
import pandas as pd
from understatapi import UnderstatClient

def fetch_barca_matches(num_seasons: int = 5) -> pd.DataFrame:
    """
    Fetches match data and xG metrics for FC Barcelona directly 
    from Understat API across multiple seasons.
    """

    seasons = ['2022', '2023', '2024', '2025', '2026']
    
    all_matches = []
    
    print(f"[-] Fetching Barcelona data directly from Understat API for seasons: {seasons}...")
    
    try:
        with UnderstatClient() as client:
            for season in seasons:
                # Retrieve all match logs for Barcelona in the given season
                match_data = client.team(team="Barcelona").get_match_data(season=season)
                for match in match_data:
                    # Skip upcoming matches where results or goals are not yet recorded
                    if not match.get('result') or not match.get('goals') or match['goals'].get('h') is None or match['goals'].get('a') is None:
                        continue

                    # Clean and append match stats
                    is_home = match['side'] == 'h'
                    barca_goals = int(match['goals']['h']) if is_home else int(match['goals']['a'])
                    opp_goals = int(match['goals']['a']) if is_home else int(match['goals']['h'])
                    
                    barca_xg = float(match['xG']['h']) if is_home and match['xG']['h'] else 0.0
                    opp_xg = float(match['xG']['a']) if is_home and match['xG']['a'] else (float(match['xG']['h']) if not is_home and match['xG']['h'] else 0.0)
                    
                    # Match result relative to Barca: win (w), draw (d), loss (l)
                    result = match['result'].lower()
                    
                    all_matches.append({
                        'id': match['id'],
                        'date': match['datetime'],
                        'season': season,
                        'is_home': 1 if is_home else 0,
                        'opponent': match['a']['title'] if is_home else match['h']['title'],
                        'barca_goals': barca_goals,
                        'opp_goals': opp_goals,
                        'barca_xg': barca_xg,
                        'opp_xg': opp_xg,
                        'forecast_w': float(match['forecast']['w']) if 'forecast' in match and match['forecast'] else None,
                        'forecast_d': float(match['forecast']['d']) if 'forecast' in match and match['forecast'] else None,
                        'forecast_l': float(match['forecast']['l']) if 'forecast' in match and match['forecast'] else None,
                        'result': result
                    })

        df = pd.DataFrame(all_matches)
        
        # Sort chronologically
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)
        
        print(f"[+] Successfully fetched {len(df)} finished match records for FC Barcelona!")
        
        # Save raw CSV
        os.makedirs('data/raw', exist_ok=True)
        df.to_csv('data/raw/barca_understat_matches.csv', index=False)
        print("[+] Saved data to data/raw/barca_understat_matches.csv")
        
        return df

    except Exception as e:
        print(f"[!] Error fetching from Understat API: {e}")
        return pd.DataFrame()

if __name__ == "__main__":
    fetch_barca_matches(num_seasons=5)