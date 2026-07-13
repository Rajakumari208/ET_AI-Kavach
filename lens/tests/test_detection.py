"""
Basic sanity tests for the Lens detection pipeline, run against the
synthetic test images in tests/sample_images/ (clearly not real currency
images - see model.py docstring for scope notes).

Run with: python lens/tests/test_detection.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "detection"))

from model import analyze_note  # noqa: E402

SAMPLES = Path(__file__).parent / "sample_images"


def test_genuine_like_note_scores_higher_than_counterfeit():
    genuine = analyze_note(SAMPLES / "synthetic_genuine_note.jpg")
    counterfeit = analyze_note(SAMPLES / "synthetic_counterfeit_note.jpg")
    assert genuine["confidence"] > counterfeit["confidence"], (
        f"Expected genuine confidence ({genuine['confidence']}) > "
        f"counterfeit confidence ({counterfeit['confidence']})"
    )


def test_blank_note_flags_all_regions():
    counterfeit = analyze_note(SAMPLES / "synthetic_counterfeit_note.jpg")
    failed = [name for name, r in counterfeit["regions"].items() if not r["passed"]]
    assert len(failed) >= 2, f"Expected multiple flagged regions, got {failed}"


def test_result_has_expected_shape():
    result = analyze_note(SAMPLES / "synthetic_genuine_note.jpg")
    assert "verdict" in result
    assert "confidence" in result
    assert "regions" in result
    assert set(result["regions"].keys()) == {
        "security_thread", "microprint_zone", "serial_number_zone"
    }


if __name__ == "__main__":
    test_genuine_like_note_scores_higher_than_counterfeit()
    test_blank_note_flags_all_regions()
    test_result_has_expected_shape()
    print("All Lens tests passed.")
