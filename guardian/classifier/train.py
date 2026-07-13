"""
Guardian Classifier - Training Script
--------------------------------------
Trains a TF-IDF + Logistic Regression multi-class classifier on the
scam-pattern taxonomy defined in patterns.json.

Labels:
    authority_impersonation
    isolation_tactic
    illegitimate_payment_request
    fabricated_urgency
    fake_custody_framing
    benign

Usage:
    python train.py
"""
import json
import pickle
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

HERE = Path(__file__).parent
DATA_PATH = HERE / "patterns.json"
MODEL_PATH = HERE / "guardian_model.pkl"


def load_dataset():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        records = json.load(f)
    texts = [r["text"] for r in records]
    labels = [r["label"] for r in records]
    return texts, labels


def build_pipeline():
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 1),
            min_df=2,
            stop_words="english",
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            C=0.7,
        )),
    ])


def main():
    """
    Trains the FINAL deployment model on the full dataset (this is the
    model saved to guardian_model.pkl and used by model.py for inference).

    NOTE: With ~100 hand-authored examples, a single train/test split is
    too noisy to be a meaningful accuracy estimate (a handful of test
    examples swings the score wildly). Honest evaluation for a dataset
    this size is stratified k-fold cross-validation, which is what
    evaluate.py reports. This script trains the deployable model; run
    evaluate.py separately for the audited performance numbers.
    """
    texts, labels = load_dataset()
    print(f"Loaded {len(texts)} labeled examples across {len(set(labels))} classes.")

    pipeline = build_pipeline()
    pipeline.fit(texts, labels)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump({"pipeline": pipeline, "texts": texts, "labels": labels}, f)

    train_acc = pipeline.score(texts, labels)
    print(f"Full-data fit accuracy (NOT a generalization estimate): {train_acc:.3f}")
    print(f"Model saved to {MODEL_PATH}")
    print("Run `python evaluate.py` for cross-validated performance numbers.")


if __name__ == "__main__":
    main()
