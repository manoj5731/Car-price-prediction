import os
import json
import datetime
import urllib.request
import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_PATH = "car_prediction_data.csv"
DATA_URL = "https://raw.githubusercontent.com/amankharwal/Website-data/master/car%20data.csv"
MODEL_PATH = "car_price_model.pkl"
META_PATH = "model_meta.json"
STATIC_DIR = "static"

def ensure_dataset():
    if not os.path.exists(DATA_PATH):
        print(f"Dataset not found locally. Downloading from {DATA_URL}...")
        urllib.request.urlretrieve(DATA_URL, DATA_PATH)
        print("Dataset downloaded successfully.")

def preprocess_data(df, reference_year=2024):
    df_clean = df.copy()
    
    # Feature Engineering: Age of the car
    df_clean['number_of_year'] = reference_year - df_clean['Year']
    
    # Select feature columns
    features_df = df_clean[['Selling_Price', 'Present_Price', 'Kms_Driven', 'Owner', 'number_of_year', 'Fuel_Type', 'Seller_Type', 'Transmission']]
    
    # One-hot encoding categorical variables
    # Fuel_Type: CNG is dropped baseline -> Fuel_Type_Diesel, Fuel_Type_Petrol
    # Seller_Type: Dealer is dropped baseline -> Seller_Type_Individual
    # Transmission: Automatic is dropped baseline -> Transmission_Manual
    features_encoded = pd.get_dummies(features_df, drop_first=True, dtype=int)
    
    # Ensure expected dummy columns exist even with small subsets
    expected_dummies = [
        'Present_Price', 'Kms_Driven', 'Owner', 'number_of_year',
        'Fuel_Type_Diesel', 'Fuel_Type_Petrol',
        'Seller_Type_Individual', 'Transmission_Manual'
    ]
    
    for col in expected_dummies:
        if col not in features_encoded.columns:
            features_encoded[col] = 0
            
    X = features_encoded[expected_dummies]
    y = features_encoded['Selling_Price']
    
    return X, y, df_clean

def train_and_evaluate():
    ensure_dataset()
    os.makedirs(STATIC_DIR, exist_ok=True)
    
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    
    X, y, df_clean = preprocess_data(df)
    feature_names = list(X.columns)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42
    )
    
    print(f"Training set: {len(X_train)} samples, Test set: {len(X_test)} samples")
    
    # Candidate models
    models = {
        "Linear Regression": LinearRegression(),
        "Extra Trees": ExtraTreesRegressor(random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(random_state=42),
        "Random Forest": RandomForestRegressor(random_state=42)
    }
    
    results = {}
    fitted_models = {}
    
    for name, m in models.items():
        m.fit(X_train, y_train)
        preds = m.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        mse = mean_squared_error(y_test, preds)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_test, preds)
        results[name] = {"MAE": mae, "MSE": mse, "RMSE": rmse, "R2": r2}
        fitted_models[name] = m
        print(f"[{name}] MAE: {mae:.3f} | RMSE: {rmse:.3f} | R²: {r2:.3f}")
        
    # Hyperparameter tuning on Random Forest (matching notebook workflow)
    print("\nRunning Hyperparameter Tuning on Random Forest...")
    rf_grid = {
        'n_estimators': [50, 100, 200, 300, 500],
        'max_features': ['sqrt', 'log2', 1.0],
        'max_depth': [5, 10, 15, 20, 25, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    }
    
    rf_search = RandomizedSearchCV(
        estimator=RandomForestRegressor(random_state=42),
        param_distributions=rf_grid,
        scoring='neg_mean_squared_error',
        n_iter=25,
        cv=5,
        random_state=42,
        n_jobs=-1
    )
    rf_search.fit(X_train, y_train)
    best_rf = rf_search.best_estimator_
    best_preds = best_rf.predict(X_test)
    
    tuned_mae = mean_absolute_error(y_test, best_preds)
    tuned_mse = mean_squared_error(y_test, best_preds)
    tuned_rmse = np.sqrt(tuned_mse)
    tuned_r2 = r2_score(y_test, best_preds)
    
    results["Tuned Random Forest"] = {
        "MAE": tuned_mae,
        "MSE": tuned_mse,
        "RMSE": tuned_rmse,
        "R2": tuned_r2
    }
    print(f"[Tuned Random Forest] MAE: {tuned_mae:.3f} | RMSE: {tuned_rmse:.3f} | R²: {tuned_r2:.3f}")
    
    # Select best model based on R2 Score
    best_model_name = max(results, key=lambda k: results[k]["R2"])
    if best_model_name == "Tuned Random Forest":
        selected_model = best_rf
    else:
        selected_model = fitted_models[best_model_name]
        
    print(f"\nWinning Model: {best_model_name} (R² = {results[best_model_name]['R2']:.4f})")
    
    # Save best model
    joblib.dump(selected_model, MODEL_PATH)
    print(f"Model serialized to {MODEL_PATH}")
    
    # Compute feature importances
    if hasattr(selected_model, 'feature_importances_'):
        importances = dict(zip(feature_names, [float(v) for v in selected_model.feature_importances_]))
    else:
        importances = {f: 1.0 / len(feature_names) for f in feature_names}
        
    # Generate Evaluation Charts
    test_preds = selected_model.predict(X_test)
    
    # 1. Feature Importance Plot
    plt.figure(figsize=(9, 5))
    sorted_feat = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    feats, vals = zip(*sorted_feat)
    plt.barh(feats[::-1], vals[::-1], color='#3b82f6')
    plt.title("Feature Importance for Car Price Prediction", fontsize=14, fontweight='bold', pad=12)
    plt.xlabel("Relative Importance")
    plt.tight_layout()
    plt.savefig(os.path.join(STATIC_DIR, "feature_importance.png"), dpi=150)
    plt.close()
    
    # 2. Actual vs Predicted Plot
    plt.figure(figsize=(7, 6))
    plt.scatter(y_test, test_preds, color='#6366f1', alpha=0.7, edgecolors='k', s=50)
    min_val = min(min(y_test), min(test_preds))
    max_val = max(max(y_test), max(test_preds))
    plt.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label='Ideal 45°')
    plt.title(f"Actual vs Predicted Selling Price (Lakhs ₹)\n{best_model_name} (R²={results[best_model_name]['R2']:.3f})", fontsize=12)
    plt.xlabel("Actual Selling Price (Lakhs ₹)")
    plt.ylabel("Predicted Selling Price (Lakhs ₹)")
    plt.legend()
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.savefig(os.path.join(STATIC_DIR, "actual_vs_predicted.png"), dpi=150)
    plt.close()
    
    # Extract distinct car samples from dataset for quick presets
    top_cars = df_clean.groupby('Car_Name').agg({
        'Present_Price': 'mean',
        'Year': 'median',
        'Kms_Driven': 'median',
        'Fuel_Type': lambda x: x.mode()[0] if not x.empty else 'Petrol',
        'Transmission': lambda x: x.mode()[0] if not x.empty else 'Manual',
        'Seller_Type': lambda x: x.mode()[0] if not x.empty else 'Dealer',
        'Selling_Price': 'mean'
    }).reset_index()
    
    # Pick recognizable top popular models
    sample_presets = []
    popular_names = ['city', 'fortuner', 'innova', 'verna', 'corolla altis', 'ciaz', 'swift', 'i20', 'brio', 'wagon r', 'Royal Enfield Classic 350']
    for name in popular_names:
        row = top_cars[top_cars['Car_Name'].str.lower() == name.lower()]
        if not row.empty:
            r = row.iloc[0]
            sample_presets.append({
                "name": r['Car_Name'].title(),
                "present_price": round(float(r['Present_Price']), 2),
                "year": int(r['Year']),
                "kms_driven": int(r['Kms_Driven']),
                "fuel_type": str(r['Fuel_Type']),
                "transmission": str(r['Transmission']),
                "seller_type": str(r['Seller_Type']),
                "avg_selling_price": round(float(r['Selling_Price']), 2)
            })
            
    # Save Metadata JSON
    metadata = {
        "best_model": best_model_name,
        "feature_names": feature_names,
        "feature_importances": importances,
        "metrics": results,
        "dataset_summary": {
            "total_records": int(len(df)),
            "min_price": float(df['Selling_Price'].min()),
            "max_price": float(df['Selling_Price'].max()),
            "mean_price": float(df['Selling_Price'].mean()),
            "min_kms": int(df['Kms_Driven'].min()),
            "max_kms": int(df['Kms_Driven'].max()),
            "fuel_types": list(df['Fuel_Type'].unique()),
            "transmission_types": list(df['Transmission'].unique()),
            "seller_types": list(df['Seller_Type'].unique())
        },
        "presets": sample_presets,
        "trained_at": datetime.datetime.now().isoformat()
    }
    
    with open(META_PATH, 'w') as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Metadata exported to {META_PATH}")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
