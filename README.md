# AutoValuate AI — Car Resale Price Prediction & Market Analytics

An intelligent, end-to-end Machine Learning web application and analytics platform designed to accurately estimate the resale valuation of pre-owned vehicles. Built on transaction records, the engine applies multiple regression algorithms, hyperparameter search, and feature importance weighting to deliver real-time valuations, confidence intervals, 5-year depreciation forecasts, and model benchmarks.

![Python](https://img.shields.io/badge/Python-3.13-blue.svg)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.9.1-orange.svg)
![Flask](https://img.shields.io/badge/Flask-3.1.3-black.svg)
![R2-Score](https://img.shields.io/badge/Model_R²-0.9765-emerald.svg)

---

## 🌟 Key Features

* **Real-Time Interactive Valuation:** Dynamic slider and numerical controls for Showroom Price, Odometer Mileage, Vehicle Age, Fuel Type, Transmission, Seller Type, and Ownership History.
* **Instant Model Inference:** Sub-millisecond response using optimized serialized tree ensembles (`ExtraTreesRegressor` & `RandomForestRegressor`).
* **5-Year Value Trajectory:** Interactive canvas chart predicting how the car will depreciate over the subsequent 5 years with annual mileage accumulation.
* **Fair Price Gauge:** Automatic value retention rating (e.g. *Excellent Value Retention*, *Healthy Market Average*).
* **Model Benchmarks & Transparency:** Side-by-side comparison of multiple architectures (Extra Trees, Random Forest, Gradient Boosting, Linear Regression) with evaluation metrics ($R^2$, MAE, RMSE).
* **One-Click Presets:** Instant loading of verified real-world vehicle profiles (e.g. Toyota Fortuner, Honda City, Maruti Swift, Royal Enfield Classic 350).
* **Self-Contained Training Pipeline:** Automated dataset acquisition, feature engineering, cross-validation tuning, and model persistence.

---

## 📊 Model Performance Benchmarks

All models were evaluated on an unseen 25% test partition:

| Model Architecture | $R^2$ Score (Accuracy) | MAE (Lakhs ₹) | RMSE | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Extra Trees Regressor** | **0.9765** | **0.498** | **0.803** | 🏆 **Best Performer** |
| **Tuned Random Forest** | 0.9699 | 0.596 | 0.910 | High Precision |
| **Random Forest Regressor** | 0.9691 | 0.599 | 0.922 | Evaluated |
| **Gradient Boosting** | 0.9683 | 0.537 | 0.933 | Evaluated |
| **Linear Regression** | 0.8770 | 1.228 | 1.838 | Baseline |

### Key Feature Drivers
1. **Showroom / Original Price** (~53.5% weight)
2. **Individual vs Dealer Seller** (~23.3% weight)
3. **Vehicle Age** (~8.9% weight)
4. **Fuel Type (Diesel / Petrol)** (~6.8% weight)
5. **Transmission (Manual vs Auto)** (~4.0% weight)
6. **Odometer Mileage** (~3.3% weight)

---

## 🚀 Quick Start Guide

### 1. Prerequisites & Environment Setup
Clone the repository and initialize the Python virtual environment:

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

### 2. Train the Machine Learning Pipeline
To train models, perform hyperparameter searches, and generate diagnostic plots:

```bash
python train.py
```

### 3. Launch the Web Application
Start the interactive valuation web server:

```bash
python app.py
```

Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🔌 REST API Endpoints

### `POST /api/predict`
Calculates instant price estimation and depreciation forecast.

**Request Body:**
```json
{
  "present_price": 9.85,
  "kms_driven": 6900,
  "year": 2017,
  "fuel_type": "Petrol",
  "seller_type": "Dealer",
  "transmission": "Manual",
  "owner": 0
}
```

**Response:**
```json
{
  "predicted_price_lakhs": 7.25,
  "predicted_price_formatted": "₹ 7.25 Lakh",
  "price_range_formatted": "₹ 6.89 Lakh - ₹ 7.61 Lakh",
  "depreciation_percent": 26.4,
  "value_retention_percent": 73.6,
  "deal_rating": "Excellent Value Retention",
  "projection": [
    {"projected_year": 2024, "price_lakhs": 7.25},
    {"projected_year": 2025, "price_lakhs": 6.80},
    {"projected_year": 2026, "price_lakhs": 6.35}
  ]
}
```

### `GET /api/metadata`
Returns model training history, benchmark metrics, dataset summaries, and preset vehicle specifications.

### `POST /api/retrain`
Triggers background retraining of all models and dynamically updates the production model weights.

---

## 📁 Repository Structure

```
Car-price-prediction/
├── app.py                      # Flask web application & REST API server
├── train.py                    # Complete training, CV tuning & evaluation pipeline
├── car_prediction_data.csv     # Clean transaction dataset (301 records)
├── car_price_model.pkl         # Serialized high-accuracy model (Extra Trees)
├── model_meta.json             # Serialized benchmark scores & feature weights
├── requirements.txt            # Python package dependencies
├── car-price-prediction.ipynb  # Interactive exploratory data analysis notebook
├── static/
│   ├── style.css               # Vanilla CSS dark/light modern design system
│   ├── app.js                  # Frontend dynamic sliders, canvas chart & API logic
│   ├── feature_importance.png  # Feature importance bar chart
│   └── actual_vs_predicted.png # Scatter plot of model predictions vs actuals
└── templates/
    └── index.html              # Responsive web dashboard interface
```
