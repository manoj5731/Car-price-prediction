import os
import json
import datetime
import joblib
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

MODEL_PATH = "car_price_model.pkl"
META_PATH = "model_meta.json"
DATA_PATH = "car_prediction_data.csv"

# Global model and metadata cache
model = None
metadata = {}

def load_resources():
    global model, metadata
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"Error loading model: {e}")
            model = None
    if os.path.exists(META_PATH):
        try:
            with open(META_PATH, 'r') as f:
                metadata = json.load(f)
        except Exception as e:
            print(f"Error loading metadata: {e}")
            metadata = {}

load_resources()

def format_inr_lakhs(val_lakhs):
    """Formats numeric Lakhs value into human-readable INR currency."""
    val = max(0.05, float(val_lakhs))
    inr_total = val * 100000
    if inr_total >= 100000:
        return f"₹ {val:.2f} Lakh"
    else:
        return f"₹ {int(inr_total):,}"

@app.route('/')
def home():
    load_resources()
    presets = metadata.get("presets", [])
    metrics = metadata.get("metrics", {})
    best_model = metadata.get("best_model", "Random Forest Regressor")
    best_metrics = metrics.get(best_model, {})
    return render_template(
        'index.html',
        presets=presets,
        best_model=best_model,
        best_metrics=best_metrics,
        summary=metadata.get("dataset_summary", {})
    )

@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    load_resources()
    return jsonify(metadata)

@app.route('/api/predict', methods=['POST'])
def predict():
    global model, metadata
    if model is None:
        load_resources()
        if model is None:
            return jsonify({"error": "Model not loaded. Please train first."}), 500

    try:
        data = request.get_json(force=True)
        
        # User input fields
        present_price = float(data.get('present_price', 5.0))
        kms_driven = int(data.get('kms_driven', 30000))
        year = int(data.get('year', 2018))
        owner = int(data.get('owner', 0))
        fuel_type = str(data.get('fuel_type', 'Petrol')).strip().capitalize()
        seller_type = str(data.get('seller_type', 'Dealer')).strip().capitalize()
        transmission = str(data.get('transmission', 'Manual')).strip().capitalize()
        
        # Reference year for model is 2024
        current_year = 2024
        number_of_year = max(0, current_year - year)
        
        # Binary encoded columns:
        # Fuel_Type: Diesel (1), Petrol (1), CNG (both 0)
        fuel_diesel = 1 if fuel_type == 'Diesel' else 0
        fuel_petrol = 1 if fuel_type == 'Petrol' else 0
        
        # Seller_Type: Individual (1), Dealer (0)
        seller_indiv = 1 if seller_type == 'Individual' else 0
        
        # Transmission: Manual (1), Automatic (0)
        trans_manual = 1 if transmission == 'Manual' else 0
        
        # Create input array matching train order:
        # ['Present_Price', 'Kms_Driven', 'Owner', 'number_of_year',
        #  'Fuel_Type_Diesel', 'Fuel_Type_Petrol', 'Seller_Type_Individual', 'Transmission_Manual']
        input_features = np.array([[
            present_price,
            kms_driven,
            owner,
            number_of_year,
            fuel_diesel,
            fuel_petrol,
            seller_indiv,
            trans_manual
        ]])
        
        # Raw model prediction (in Lakhs)
        pred_raw = float(model.predict(input_features)[0])
        # Resale price should not exceed showroom price and has realistic floor
        predicted_price = round(max(0.05, min(present_price * 0.98, pred_raw)), 2)
        
        # Confidence interval using model RMSE
        best_model_name = metadata.get("best_model", "Random Forest")
        rmse = metadata.get("metrics", {}).get(best_model_name, {}).get("RMSE", 1.2)
        margin = max(0.2, round(rmse * 0.45, 2))
        price_min = round(max(0.05, predicted_price - margin), 2)
        price_max = round(min(present_price, predicted_price + margin), 2)
        
        # Depreciation percentage from showroom price
        depreciation_pct = 0.0
        if present_price > 0:
            depreciation_pct = round(((present_price - predicted_price) / present_price) * 100, 1)
            
        # 5-Year Depreciation Projection curve
        projection = []
        for extra_year in range(0, 6):
            proj_features = np.array([[
                present_price,
                kms_driven + (extra_year * 10000),
                owner,
                number_of_year + extra_year,
                fuel_diesel,
                fuel_petrol,
                seller_indiv,
                trans_manual
            ]])
            p_val = float(model.predict(proj_features)[0])
            p_val = round(max(0.05, min(present_price, p_val)), 2)
            projection.append({
                "year_offset": extra_year,
                "projected_year": datetime.datetime.now().year + extra_year,
                "price_lakhs": p_val,
                "formatted": format_inr_lakhs(p_val)
            })
            
        # Value rating assessment
        retention = (predicted_price / present_price) * 100 if present_price > 0 else 0
        if retention >= 65:
            deal_rating = "Excellent Value Retention"
            rating_color = "#10b981" # Emerald
        elif retention >= 45:
            deal_rating = "Healthy Market Average"
            rating_color = "#3b82f6" # Blue
        elif retention >= 25:
            deal_rating = "Moderate Value Depreciation"
            rating_color = "#f59e0b" # Amber
        else:
            deal_rating = "High Depreciation Vehicle"
            rating_color = "#ef4444" # Red
            
        return jsonify({
            "predicted_price_lakhs": predicted_price,
            "predicted_price_formatted": format_inr_lakhs(predicted_price),
            "price_range_lakhs": [price_min, price_max],
            "price_range_formatted": f"{format_inr_lakhs(price_min)} - {format_inr_lakhs(price_max)}",
            "present_price_formatted": format_inr_lakhs(present_price),
            "depreciation_percent": depreciation_pct,
            "value_retention_percent": round(100.0 - depreciation_pct, 1),
            "deal_rating": deal_rating,
            "rating_color": rating_color,
            "projection": projection,
            "inputs_echo": {
                "present_price": present_price,
                "kms_driven": kms_driven,
                "year": year,
                "car_age": number_of_year,
                "fuel_type": fuel_type,
                "seller_type": seller_type,
                "transmission": transmission,
                "owner": owner
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/retrain', methods=['POST'])
def retrain():
    try:
        from train import train_and_evaluate
        meta = train_and_evaluate()
        load_resources()
        return jsonify({"status": "success", "message": "Model retrained successfully", "metadata": meta})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Car Price Prediction Web App on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
