import pandas as pd
import numpy as np
import re
import chemparse
import joblib
import os
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.ensemble import RandomForestRegressor

# --- CONFIG ---
MODEL_DIR = "saved_models"
if not os.path.exists(MODEL_DIR): os.makedirs(MODEL_DIR)

ALL_ELEMENTS = ['Ag', 'Al', 'B', 'Ba', 'Bi', 'C', 'Ca', 'Fe', 'Hf', 'Ho', 'K',
                'Li', 'Mn', 'Na', 'Nb', 'O', 'Pr', 'Sb', 'Sc', 'Sr', 'Ta', 'Ti',
                'Zn', 'Zr']

# --- 1. ROBUST PARSER (Single Source of Truth) ---
def parse_formula_robust(formula_str):
    """
    Parses complex solid solutions, dots, and coefficients.
    Returns a dictionary of elements.
    """
    total_composition = {el: 0.0 for el in ALL_ELEMENTS}
    if not isinstance(formula_str, str): return total_composition

    clean_str = formula_str.replace(" ", "")
    clean_str = re.sub(r'\.(?=[A-Z]|\()', '-', clean_str)
    
    parts = re.split(r'[\-\+]', clean_str)

    for part in parts:
        if not part: continue
        coeff_match = re.match(r"^([\d\.]+)", part)
        if coeff_match:
            multiplier = float(coeff_match.group(1))
            sub_formula = part[len(coeff_match.group(1)):]
        else:
            multiplier = 1.0
            sub_formula = part

        sub_formula = sub_formula.lstrip("*")
        try:
            part_composition = chemparse.parse_formula(sub_formula)
            for el, amt in part_composition.items():
                el_clean = ''.join([i for i in el if not i.isdigit()])
                if el_clean in ALL_ELEMENTS:
                    total_composition[el_clean] += amt * multiplier
        except:
            continue
            
    return total_composition

# --- 2. FEATURE ENGINEERING ---
def create_feature_matrix(formula_series):
    data = [parse_formula_robust(str(f)) for f in formula_series]
    df = pd.DataFrame(data, columns=ALL_ELEMENTS).fillna(0.0)
    return df

# --- 3. TRAINING & PLOTTING ENGINE ---
def train_and_evaluate(csv_path, target_name_key, params=None):
    df = pd.read_csv(csv_path)

    # --- SMART COLUMN SEARCH ---
    target_col = None

    if target_name_key in df.columns:
        target_col = target_name_key
    else:
        key_term = target_name_key.split(" ")[0] # get "d33" or "Tc"
        for c in df.columns:
            if key_term in c:
                target_col = c
                break

    if target_col is None:
        print(f"Error: Could not find column for {target_name_key}")
        return None
    # ---------------------------

    df = df.dropna(subset=['Component', target_col]).reset_index(drop=True)

    X = create_feature_matrix(df['Component'])
    y = df[target_col]

    if len(df) < 5:
        X_train, X_test, y_train, y_test = X, X, y, y
    else:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    models = {
        "XGBoost": xgb.XGBRegressor(n_jobs=-1, random_state=42),
        "LightGBM": lgb.LGBMRegressor(verbose=-1, random_state=42),
        "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42)
    }

    if params:
        models["XGBoost"] = xgb.XGBRegressor(
            n_estimators=int(params.get('n_estimators', 100)),
            max_depth=int(params.get('max_depth', 3)),
            learning_rate=float(params.get('learning_rate', 0.1)),
            n_jobs=-1
        )

    results = []
    best_model = None
    best_r2 = -float("inf")
    best_name = ""

    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        r2 = r2_score(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        results.append({"Model": name, "R2": r2, "RMSE": rmse})

        if r2 > best_r2:
            best_r2 = r2
            best_model = model
            best_name = name

    if best_model is None:
        best_model = models["XGBoost"]
        best_name = "XGBoost"

    # --- GENERATE PLOTS ---
    res_df = pd.DataFrame(results)
    plt.figure(figsize=(10, 5))
    sns.barplot(x='Model', y='R2', data=res_df, palette='viridis')
    plt.title(f'{target_col} Model Comparison')
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    bar_plot_b64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()

    best_preds = best_model.predict(X_test)
    plt.figure(figsize=(6, 6))
    plt.scatter(y_test, best_preds, color='blue', alpha=0.5)
    plt.plot([y.min(), y.max()], [y.min(), y.max()], 'k--', lw=2)
    plt.xlabel('Actual')
    plt.ylabel('Predicted')
    plt.title(f'Actual vs Predicted ({best_name})')
    buf2 = io.BytesIO()
    plt.savefig(buf2, format='png')
    buf2.seek(0)
    scatter_plot_b64 = base64.b64encode(buf2.read()).decode('utf-8')
    plt.close()

    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    safe_name = target_name_key.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
    joblib.dump(best_model, os.path.join(MODEL_DIR, f"candidate_{safe_name}.pkl"))

    return {
        "best_model": best_name,
        "r2": best_r2,
        "rmse": results[0]['RMSE'],
        "bar_plot": bar_plot_b64,
        "scatter_plot": scatter_plot_b64
    }