"""
Basic sanity tests for the Guardian classifier.
Run with: python -m pytest guardian/tests/test_classifier.py -v
(or simply: python guardian/tests/test_classifier.py)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "classifier"))

from model import predict_risk, assess_call_risk  # noqa: E402


def test_benign_text_not_flagged():
    result = predict_risk("Can you send me the report by tomorrow morning")
    assert result["label"] == "benign", f"Expected benign, got {result['label']}"


def test_scam_snippet_flagged():
    result = predict_risk(
        "The caller said I must transfer money immediately to a verification account"
    )
    assert result["is_scam_marker"] is True


def test_multi_marker_call_recommends_alert():
    call = [
        "The caller said he is from the CBI and my Aadhaar is linked to a crime",
        "He told me not to hang up or tell my family about this call",
        "They asked me to transfer money to a verification account immediately",
    ]
    result = assess_call_risk(call)
    assert result["recommend_alert"] is True
    assert result["risk_score"] > 0


def test_single_benign_call_does_not_recommend_alert():
    call = [
        "Let's catch up for coffee this weekend",
        "The meeting has been rescheduled to 3 PM",
    ]
    result = assess_call_risk(call)
    assert result["recommend_alert"] is False


if __name__ == "__main__":
    test_benign_text_not_flagged()
    test_scam_snippet_flagged()
    test_multi_marker_call_recommends_alert()
    test_single_benign_call_does_not_recommend_alert()
    print("All Guardian tests passed.")
