"""
Guardian Classifier - Inference Helper
-----------------------------------------
Loads the trained model and exposes a simple predict_risk() function that
returns a risk verdict with matched-marker explanation, ready to be called
from the alert service or a demo UI.

Usage:
    from model import predict_risk
    result = predict_risk("The caller said I am under digital arrest and must stay on video")
"""
import pickle
from pathlib import Path

HERE = Path(__file__).parent
MODEL_PATH = HERE / "guardian_model.pkl"

# Labels considered scam markers (everything except "benign")
SCAM_LABELS = {
    "authority_impersonation",
    "isolation_tactic",
    "illegitimate_payment_request",
    "fabricated_urgency",
    "fake_custody_framing",
}

_LABEL_DESCRIPTIONS = {
    "authority_impersonation": "caller claiming to be a law-enforcement / government official",
    "isolation_tactic": "instruction to stay on the call and not contact others",
    "illegitimate_payment_request": "request to transfer funds to a 'verification' or 'safe' account",
    "fabricated_urgency": "artificial time pressure (arrest, freezing accounts) to prevent reflection",
    "fake_custody_framing": "framing the call itself as a form of arrest or detention",
    "benign": "no scam markers detected",
}

_pipeline = None


def _load():
    global _pipeline
    if _pipeline is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "guardian_model.pkl not found. Run `python train.py` first."
            )
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)
        _pipeline = bundle["pipeline"]
    return _pipeline


def predict_risk(text: str, threshold: float = 0.35) -> dict:
    """
    Predicts scam risk for a single transcript snippet.

    Returns a dict with:
        label: top predicted marker category
        confidence: probability of the top label
        is_scam_marker: True if label is not "benign" and confidence >= threshold
        explanation: human-readable description of the matched marker
        all_scores: dict of label -> probability, for full transparency
    """
    pipeline = _load()
    proba = pipeline.predict_proba([text])[0]
    classes = pipeline.classes_

    scores = {str(c): float(p) for c, p in zip(classes, proba)}
    top_label = max(scores, key=scores.get)
    top_conf = scores[top_label]

    is_marker = top_label in SCAM_LABELS and top_conf >= threshold

    return {
        "label": top_label,
        "confidence": round(top_conf, 3),
        "is_scam_marker": bool(is_marker),
        "explanation": _LABEL_DESCRIPTIONS.get(top_label, ""),
        "all_scores": {k: round(v, 3) for k, v in scores.items()},
    }


def assess_call_risk(transcript_snippets: list[str], threshold: float = 0.35) -> dict:
    """
    Assesses overall risk across multiple snippets from a single call
    (e.g. rolling transcript windows) and reports how many distinct
    scam markers were matched - mirrors the "4 of 6 markers matched"
    explainability framing described in the submission.
    """
    matched = {}
    for snippet in transcript_snippets:
        result = predict_risk(snippet, threshold=threshold)
        if result["is_scam_marker"]:
            label = result["label"]
            if label not in matched or result["confidence"] > matched[label]["confidence"]:
                matched[label] = result

    total_possible = len(SCAM_LABELS)
    matched_count = len(matched)
    risk_score = matched_count / total_possible

    return {
        "risk_score": round(risk_score, 3),
        "matched_markers": list(matched.keys()),
        "marker_count": f"{matched_count} of {total_possible}",
        "details": matched,
        "recommend_alert": matched_count >= 2,  # 2+ distinct markers = alert trusted contact
    }


if __name__ == "__main__":
    # quick manual smoke test
    demo_call = [
        "The caller said he is from the CBI and my Aadhaar is linked to a crime",
        "He told me not to hang up or tell my family about this call",
        "They asked me to transfer money to a verification account immediately",
        "Let's catch up for coffee this weekend",
    ]
    result = assess_call_risk(demo_call)
    print(result)
