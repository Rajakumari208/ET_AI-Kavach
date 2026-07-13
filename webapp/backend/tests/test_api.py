import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure sys.path includes the backend folder and Kavach root
HERE = Path(__file__).parent
BACKEND_DIR = HERE.parent
KAVACH_ROOT = BACKEND_DIR.parent.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(KAVACH_ROOT) not in sys.path:
    sys.path.insert(0, str(KAVACH_ROOT))

from app import app  # noqa: E402

client = TestClient(app)

# 1. Guardian Endpoint Tests
def test_guardian_assess_valid():
    snippets = [
        "The caller said he is from the CBI and my Aadhaar is linked to a crime",
        "He told me not to hang up or tell my family about this call",
        "They asked me to transfer money to a verification account immediately"
    ]
    response = client.post("/api/guardian/assess", json={"snippets": snippets})
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "matched_markers" in data
    assert "recommend_alert" in data
    assert data["recommend_alert"] is True
    assert len(data["matched_markers"]) >= 2

def test_guardian_assess_empty():
    response = client.post("/api/guardian/assess", json={"snippets": []})
    assert response.status_code == 400
    assert "detail" in response.json()

def test_guardian_assess_blank_strings():
    response = client.post("/api/guardian/assess", json={"snippets": ["   ", ""]})
    assert response.status_code == 400
    assert "detail" in response.json()

def test_guardian_alert_valid():
    risk_result = {
        "risk_score": 0.5,
        "matched_markers": ["authority_impersonation", "isolation_tactic"],
        "marker_count": "2 of 6",
        "recommend_alert": True
    }
    payload = {
        "victim_name": "Amma",
        "trusted_contact_phone": "+919876543210",
        "risk_result": risk_result
    }
    response = client.post("/api/guardian/alert", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "logged"
    assert data["to"] == "+919876543210"

def test_guardian_alert_missing_fields():
    # Test blank name
    payload = {
        "victim_name": "   ",
        "trusted_contact_phone": "+919876543210",
        "risk_result": {}
    }
    response = client.post("/api/guardian/alert", json=payload)
    assert response.status_code == 400

# 2. Lens Endpoint Tests
def test_lens_analyze_genuine():
    sample_img_path = KAVACH_ROOT / "lens" / "tests" / "sample_images" / "synthetic_genuine_note.jpg"
    assert sample_img_path.exists(), "Sample genuine note image not found"
    
    with open(sample_img_path, "rb") as f:
        response = client.post(
            "/api/lens/analyze",
            files={"file": ("synthetic_genuine_note.jpg", f, "image/jpeg")},
            data={"denomination": "500"}
        )
    assert response.status_code == 200
    data = response.json()
    assert "verdict" in data
    assert "confidence" in data
    assert "heatmap_url" in data
    assert "certificate_url" in data
    assert "certificate" in data
    assert data["verdict"] == "inconclusive"
    assert data["confidence"] >= 0.66

def test_lens_analyze_counterfeit():
    sample_img_path = KAVACH_ROOT / "lens" / "tests" / "sample_images" / "synthetic_counterfeit_note.jpg"
    assert sample_img_path.exists(), "Sample counterfeit note image not found"
    
    with open(sample_img_path, "rb") as f:
        response = client.post(
            "/api/lens/analyze",
            files={"file": ("synthetic_counterfeit_note.jpg", f, "image/jpeg")},
            data={"denomination": "500"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "likely_counterfeit"
    assert data["confidence"] < 0.67

def test_lens_analyze_invalid_file_type():
    response = client.post(
        "/api/lens/analyze",
        files={"file": ("test.txt", b"dummy file content", "text/plain")},
        data={"denomination": "500"}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

# 3. Map Endpoint Tests
def test_map_incidents_all():
    response = client.get("/api/map/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "incident_id" in first
    assert "city" in first
    assert "severity" in first
    assert "incident_type" in first

def test_map_incidents_filter_city():
    response = client.get("/api/map/incidents?city=Hyderabad")
    assert response.status_code == 200
    data = response.json()
    for item in data:
        assert item["city"].lower() == "hyderabad"

def test_map_incidents_filter_multiple():
    response = client.get("/api/map/incidents?city=Hyderabad,Delhi&severity=high")
    assert response.status_code == 200
    data = response.json()
    for item in data:
        assert item["city"].lower() in ["hyderabad", "delhi"]
        assert item["severity"] == "high"

# 4. Authentication Endpoint Tests
def test_auth_login_success():
    payload = {
        "username": "officer@kavach.gov.in",
        "password": "kavach2026"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "token" in data
    assert data["user"]["email"] == "officer@kavach.gov.in"

def test_auth_login_failure():
    payload = {
        "username": "officer@kavach.gov.in",
        "password": "wrongpassword"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert "detail" in response.json()
