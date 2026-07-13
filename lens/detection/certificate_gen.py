"""
Lens - Detection Certificate Generator
------------------------------------------
Produces a structured, timestamped, hash-signed JSON "certificate" for
every note analyzed - turning a bare classifier verdict into a
recordkeeping artifact a bank or field officer can retain, and that
supports the submission's auditability / legal-admissibility goal.

Note: "hash-signed" here means a SHA-256 integrity hash over the
certificate's content, which lets anyone verify the certificate was not
altered after generation. It is NOT a cryptographic digital signature
tied to an identity/PKI - a production system would add that via an
HSM-backed signing key issued to the deploying institution.

Usage:
    from certificate_gen import generate_certificate
    cert = generate_certificate(analysis_result, image_path="note.jpg", officer_id="B12345")
"""
import hashlib
import json
import uuid
import datetime
from pathlib import Path

HERE = Path(__file__).parent
CERT_DIR = HERE / "certificates"
CERT_DIR.mkdir(exist_ok=True)


def _content_hash(payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def generate_certificate(analysis_result: dict, image_path: str, officer_id: str = "unassigned") -> dict:
    cert_id = str(uuid.uuid4())
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    payload = {
        "certificate_id": cert_id,
        "timestamp_utc": timestamp,
        "source_image": str(image_path),
        "officer_id": officer_id,
        "denomination": analysis_result["denomination"],
        "verdict": analysis_result["verdict"],
        "confidence": analysis_result["confidence"],
        "regions": analysis_result["regions"],
        "methodology_note": analysis_result["note"],
    }

    payload["content_hash_sha256"] = _content_hash(payload)

    out_path = CERT_DIR / f"certificate_{cert_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    payload["_saved_to"] = str(out_path)
    return payload


def verify_certificate(cert_path: str) -> bool:
    """Recomputes the hash over the certificate's content (excluding the
    stored hash field itself) and checks it matches - detects tampering."""
    with open(cert_path, "r", encoding="utf-8") as f:
        cert = json.load(f)

    stored_hash = cert.pop("content_hash_sha256", None)
    recomputed = _content_hash(cert)
    return stored_hash == recomputed


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from model import analyze_note

    if len(sys.argv) < 2:
        print("Usage: python certificate_gen.py <path_to_note_image>")
        sys.exit(1)

    result = analyze_note(sys.argv[1])
    cert = generate_certificate(result, image_path=sys.argv[1], officer_id="DEMO-001")
    print(json.dumps(cert, indent=2))
    print(f"\nCertificate valid: {verify_certificate(cert['_saved_to'])}")
