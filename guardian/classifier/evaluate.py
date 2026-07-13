"""
Guardian Classifier - Evaluation Script
-----------------------------------------
With ~100 hand-authored examples, a single train/test split gives a noisy,
easily-cherry-picked accuracy number. Instead this script runs stratified
5-fold cross-validation across the full labeled dataset and reports
aggregated precision, recall, F1, and a confusion matrix built from
out-of-fold predictions - a fairer estimate of real-world performance
and one that is easy for judges to reproduce.

Usage:
    python evaluate.py
"""
from pathlib import Path

from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import classification_report, confusion_matrix

from train import build_pipeline, load_dataset

HERE = Path(__file__).parent
RESULTS_PATH = HERE / "results.md"


def main():
    texts, labels = load_dataset()
    labels_sorted = sorted(set(labels))

    # Smallest class has 14 examples -> 5-fold keeps >=2 per class per fold
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    pipeline = build_pipeline()

    y_pred = cross_val_predict(pipeline, texts, labels, cv=cv)

    report = classification_report(labels, y_pred, labels=labels_sorted, digits=3)
    cm = confusion_matrix(labels, y_pred, labels=labels_sorted)

    print(f"Stratified 5-fold cross-validation over {len(texts)} examples\n")
    print("Classification Report\n")
    print(report)
    print("Confusion Matrix (rows=actual, cols=predicted)")
    print("Labels:", labels_sorted)
    print(cm)

    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        f.write("# Guardian Classifier - Evaluation Results\n\n")
        f.write(
            f"Method: stratified 5-fold cross-validation over the full "
            f"labeled dataset ({len(texts)} examples, {len(labels_sorted)} classes).\n\n"
        )
        f.write(
            "A single train/test split was avoided because the dataset "
            "is small enough that one split gives a noisy, easily "
            "misleading accuracy number. Cross-validation reports "
            "performance across every example while it was held out, "
            "giving a fairer and reproducible estimate.\n\n"
        )
        f.write("## Classification Report\n\n```\n")
        f.write(report)
        f.write("\n```\n\n")
        f.write("## Confusion Matrix\n\n")
        f.write(f"Labels (in order): {labels_sorted}\n\n```\n")
        f.write(str(cm))
        f.write("\n```\n\n")
        f.write(
            "## Known Limitations\n\n"
            "- Training set is small (~100 examples) and hand-authored for "
            "the hackathon based on publicly reported scam patterns; "
            "production deployment requires a much larger, professionally "
            "reviewed and red-teamed dataset.\n"
            "- The classifier operates on transcript text, not raw audio; "
            "a production system needs a real-time ASR front-end (e.g. "
            "Whisper) feeding this classifier continuously during a call.\n"
            "- False-positive rate on the 'benign' class should be "
            "monitored closely and tightened further before any "
            "citizen-facing deployment, per the brief's requirement for a "
            "very low false-positive rate on citizen-facing tools.\n"
            "- Cross-validation on a small, single-author dataset likely "
            "overstates real-world performance because all examples share "
            "one writing style; real scam calls and real benign "
            "conversations will be more linguistically diverse.\n"
        )

    print(f"\nResults written to {RESULTS_PATH}")


if __name__ == "__main__":
    main()
