import sys
import os
import uuid
import json
import pandas as pd
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Add Kavach root to path to ensure local module imports work
HERE = Path(__file__).parent
KAVACH_ROOT = HERE.parent.parent
if str(KAVACH_ROOT) not in sys.path:
    sys.path.insert(0, str(KAVACH_ROOT))

try:
    from guardian.classifier.model import assess_call_risk
    from guardian.alert_service.alert import send_trusted_contact_alert
    from lens.detection.model import analyze_note
    from lens.detection.heatmap import draw_heatmap
    from lens.detection.certificate_gen import generate_certificate
except ImportError as e:
    print(f"Error importing original Kavach modules: {e}")
    # Fallback/diagnostic print of paths
    print(f"KAVACH_ROOT resolved to: {KAVACH_ROOT}")
    print(f"sys.path: {sys.path}")
    raise

# Define and create static directories
STATIC_DIR = HERE / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"
HEATMAPS_DIR = STATIC_DIR / "heatmaps"
CERTIFICATES_DIR = STATIC_DIR / "certificates"

for d in [UPLOADS_DIR, HEATMAPS_DIR, CERTIFICATES_DIR]:
    d.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Kavach Unified Public Safety API",
    description="Unified API backend wrapper for Guardian, Lens, and Map modules."
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input Validation Models
class AssessRequest(BaseModel):
    snippets: List[str]

class AlertRequest(BaseModel):
    victim_name: str
    trusted_contact_phone: str
    risk_result: dict

# 1. Guardian Endpoints
@app.post("/api/guardian/assess")
def assess_guardian(payload: AssessRequest):
    if not payload.snippets:
        raise HTTPException(
            status_code=400,
            detail="Transcript snippets cannot be empty."
        )
    cleaned = [s.strip() for s in payload.snippets if s.strip()]
    if not cleaned:
        raise HTTPException(
            status_code=400,
            detail="Transcript snippets cannot contain only blank strings."
        )
    try:
        result = assess_call_risk(cleaned)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error executing risk assessment: {str(e)}"
        )

@app.post("/api/guardian/alert")
def alert_guardian(payload: AlertRequest):
    if not payload.victim_name.strip():
        raise HTTPException(
            status_code=400,
            detail="Victim name cannot be empty."
        )
    if not payload.trusted_contact_phone.strip():
        raise HTTPException(
            status_code=400,
            detail="Trusted contact phone cannot be empty."
        )
    try:
        res = send_trusted_contact_alert(
            victim_name=payload.victim_name,
            trusted_contact_phone=payload.trusted_contact_phone,
            risk_result=payload.risk_result,
            provider="dummy"
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trigger trusted-contact alert: {str(e)}"
        )

# 2. Lens Endpoints
@app.post("/api/lens/analyze")
async def analyze_lens(
    file: UploadFile = File(...),
    denomination: str = Form("500")
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No image file provided."
        )
    
    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a JPG, PNG, or WEBP image."
        )
    
    unique_id = uuid.uuid4().hex
    input_filename = f"{unique_id}{ext}"
    input_path = UPLOADS_DIR / input_filename
    
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )
        with open(input_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save uploaded image: {str(e)}"
        )
    
    # Verify image integrity via OpenCV
    import cv2
    img = cv2.imread(str(input_path))
    if img is None:
        if input_path.exists():
            input_path.unlink()
        raise HTTPException(
            status_code=400,
            detail="Failed to decode image. File may be corrupted or not a valid image."
        )
        
    try:
        # Run heuristic detection
        analysis_result = analyze_note(str(input_path), denomination=denomination)
        
        # Generate heatmaps
        heatmap_filename = f"heatmap_{unique_id}.jpg"
        heatmap_path = HEATMAPS_DIR / heatmap_filename
        draw_heatmap(str(input_path), analysis_result, str(heatmap_path))
        
        # Generate hash-signed certificate
        cert = generate_certificate(
            analysis_result,
            image_path=str(input_path),
            officer_id="KAVACH-WEB-01"
        )
        
        # Save a copy of the certificate JSON to the static directory
        cert_filename = f"cert_{cert['certificate_id']}.json"
        cert_static_path = CERTIFICATES_DIR / cert_filename
        with open(cert_static_path, "w", encoding="utf-8") as f:
            json.dump(cert, f, indent=2)
            
        return {
            "verdict": analysis_result["verdict"],
            "confidence": analysis_result["confidence"],
            "analysis": analysis_result,
            "heatmap_url": f"/static/heatmaps/{heatmap_filename}",
            "certificate_url": f"/static/certificates/{cert_filename}",
            "certificate": cert
        }
        
    except Exception as e:
        if input_path.exists():
            input_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during Lens pipeline execution: {str(e)}"
        )

# 3. Authentication Endpoints
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(payload: LoginRequest):
    if payload.username.strip() == "officer@kavach.gov.in" and payload.password == "kavach2026":
        return {
            "status": "success",
            "token": "kavach_session_token_xyz",
            "user": {
                "email": "officer@kavach.gov.in",
                "role": "Security Officer"
            }
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

# 4. Map Endpoints
INCIDENTS_CSV_PATH = KAVACH_ROOT / "map" / "sample_data" / "incidents.csv"

# In-memory store for real-time incidents reported during session
REALTIME_INCIDENTS = []

class NewIncidentRequest(BaseModel):
    city: str
    incident_type: str
    severity: str
    latitude: float
    longitude: float

@app.post("/api/map/incidents")
def create_map_incident(payload: NewIncidentRequest):
    import datetime
    inc_id = f"INC-RT-{1000 + len(REALTIME_INCIDENTS)}"
    new_inc = {
        "incident_id": inc_id,
        "city": payload.city,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "incident_type": payload.incident_type,
        "severity": payload.severity,
        "reported_at": datetime.datetime.now().isoformat()
    }
    REALTIME_INCIDENTS.append(new_inc)
    return new_inc

@app.get("/api/map/incidents")
def get_map_incidents(
    city: Optional[List[str]] = Query(None),
    incident_type: Optional[List[str]] = Query(None),
    severity: Optional[List[str]] = Query(None)
):
    if not INCIDENTS_CSV_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Incident data repository CSV file not found."
        )
    
    try:
        df = pd.read_csv(INCIDENTS_CSV_PATH)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to ingest incident data: {str(e)}"
        )
        
    # Fill NaN values to prevent JSON conversion crashes
    df = df.fillna("")
    
    # Merge with real-time in-memory incidents
    if REALTIME_INCIDENTS:
        rt_df = pd.DataFrame(REALTIME_INCIDENTS)
        df = pd.concat([df, rt_df], ignore_index=True)
    
    # Helper to parse multi-values or comma-separated query values
    def parse_filters(raw_list: Optional[List[str]]) -> List[str]:
        if not raw_list:
            return []
        items = []
        for x in raw_list:
            if "," in x:
                items.extend([v.strip() for v in x.split(",") if v.strip()])
            elif x.strip():
                items.append(x.strip())
        return items

    cities = parse_filters(city)
    types = parse_filters(incident_type)
    severities = parse_filters(severity)
    
    if cities:
        df = df[df["city"].str.lower().isin([c.lower() for c in cities])]
    if types:
        df = df[df["incident_type"].str.lower().isin([t.lower() for t in types])]
    if severities:
        df = df[df["severity"].str.lower().isin([s.lower() for s in severities])]
        
    return df.to_dict(orient="records")

# Mount Static Files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
