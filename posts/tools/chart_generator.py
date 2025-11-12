import yfinance as yf
import pandas as pd
import json
import os
import argparse
import datetime

def calculate_rsi(data, window=14):
    """Calculates the 14-day Relative Strength Index (RSI)."""
    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def get_chart_data(ticker_symbol, days=365):
    """
    Fetches 365 days of data for a ticker, calculates RSI,
    and returns it as a dictionary.
    """
    print(f"Fetching {days} days of data for {ticker_symbol}...")
    
    # Calculate start date
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days)
    
    # Fetch data
    data = yf.download(ticker_symbol, start=start_date, end=end_date)
    
    if data.empty:
        print(f"No data found for ticker {ticker_symbol}.")
        return None
        
    print("Data fetched successfully. Calculating RSI...")

    # Calculate 14-day RSI
    data['RSI'] = calculate_rsi(data)
    
    # Clean up data (drop NaN values from RSI calculation)
    data = data.dropna(subset=['RSI'])
    
    # Format for JSON
    chart_data = {
        'dates': data.index.strftime('%Y-%m-%d').tolist(),
        'prices': data['Close'].round(2).tolist(),
        'volumes': data['Volume'].tolist(),
        'rsi': data['RSI'].round(2).tolist()
    }
    
    print("RSI calculated.")
    return chart_data

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description="Fetch YF data and save as JSON for charts."
    )
    parser.add_argument(
        'ticker', 
        type=str, 
        help='The ticker symbol to fetch (e.g., ORCL, MU, NVDA).'
    )
    args = parser.parse_args()
    
    ticker = args.ticker.upper()
    
    # Define file path
    output_dir = "charts"
    # Using a static date in the filename as per the user's request format
    # In a real app, you might use today's date
    static_date = "251112" 
    filename = f"{ticker}_{static_date}.json"
    output_path = os.path.join(output_dir, filename)
    
    # Create 'charts' directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
        
    # Get data
    data = get_chart_data(ticker, days=365)
    
    # Save data to JSON
    if data:
        with open(output_path, 'w') as f:
            json.dump(data, f)
        print(f"Successfully saved data to {output_path}")

if __name__ == "__main__":
    main()
