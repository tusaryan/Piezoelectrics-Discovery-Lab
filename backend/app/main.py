from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import joblib
import pandas as pd
from app.ml_engine import train_and_evaluate, ALL_ELEMENTS, parse_formula_robust

app = FastAPI()

# Allow CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = "saved_models"
DATASET_PATH = "datasets/current_data.csv"

# Helper to clean filenames
def clean_filename(name):
    return name.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")

# --- 1. PREDICTION ENDPOINT ---
class PredictionRequest(BaseModel):
    formula: str

@app.post("/predict")
def predict(req: PredictionRequest):
    # Load Production Models using safe names
    try:
        model_d33 = joblib.load(os.path.join(MODEL_DIR, "production_d33_pC_N.pkl"))
    except: model_d33 = None
    
    try:
        model_tc = joblib.load(os.path.join(MODEL_DIR, "production_Tc_C.pkl"))
    except: model_tc = None

    # Parse Input
    features = parse_formula_robust(req.formula)
    if sum(features.values()) == 0:
        return {"error": "Invalid Formula"}

    # Prepare DF
    df = pd.DataFrame([features])
    # Ensure columns match training (ALL_ELEMENTS)
    for col in ALL_ELEMENTS:
        if col not in df.columns: df[col] = 0.0
    df = df[ALL_ELEMENTS]

    # Predict
    d33 = float(model_d33.predict(df)[0]) if model_d33 else None
    tc = float(model_tc.predict(df)[0]) if model_tc else None

    return {
        "composition": {k: v for k, v in features.items() if v > 0},
        "d33": round(d33, 2) if d33 else "N/A",
        "Tc": round(tc, 2) if tc else "N/A"
    }

# --- 2. TRAINING ENDPOINT ---
@app.post("/train")
async def train_models(
    n_estimators: int = 100, 
    learning_rate: float = 0.1, 
    max_depth: int = 5,
    file: UploadFile = File(...)
):
    # Save uploaded dataset
    os.makedirs("datasets", exist_ok=True)
    with open(DATASET_PATH, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    params = {"n_estimators": n_estimators, "learning_rate": learning_rate, "max_depth": max_depth}
    
    # Run training logic
    results_d33 = train_and_evaluate(DATASET_PATH, "d33 (pC/N)", params)
    results_tc = train_and_evaluate(DATASET_PATH, "Tc (C)", params)

    return {
        "d33_metrics": results_d33,
        "tc_metrics": results_tc
    }

# --- 3. CONFIRM MODEL ---
@app.post("/confirm-model")
def confirm_model():
    # Update this to match the clean filenames
    for target in ["d33 (pC/N)", "Tc (C)"]:
        safe_target = clean_filename(target)
        cand = os.path.join(MODEL_DIR, f"candidate_{safe_target}.pkl")
        prod = os.path.join(MODEL_DIR, f"production_{safe_target}.pkl")
        if os.path.exists(cand):
            if os.path.exists(prod): os.remove(prod)
            os.rename(cand, prod)
    return {"status": "Models Updated to Production"}

# --- 4. DATASET VIEW ---
@app.get("/dataset")
def get_dataset():
    if os.path.exists(DATASET_PATH):
        df = pd.read_csv(DATASET_PATH).head(50) # Return first 50 rows
        return df.to_dict(orient="records")
    return []

@app.get("/elements")
def get_elements():
    return ALL_ELEMENTS