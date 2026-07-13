# Guardian Classifier - Evaluation Results

Method: stratified 5-fold cross-validation over the full labeled dataset (99 examples, 6 classes).

A single train/test split was avoided because the dataset is small enough that one split gives a noisy, easily misleading accuracy number. Cross-validation reports performance across every example while it was held out, giving a fairer and reproducible estimate.

## Classification Report

```
                              precision    recall  f1-score   support

     authority_impersonation      0.733     0.647     0.688        17
                      benign      0.765     0.765     0.765        17
          fabricated_urgency      0.467     0.412     0.438        17
        fake_custody_framing      0.353     0.429     0.387        14
illegitimate_payment_request      0.688     0.647     0.667        17
            isolation_tactic      0.526     0.588     0.556        17

                    accuracy                          0.586        99
                   macro avg      0.589     0.581     0.583        99
                weighted avg      0.596     0.586     0.589        99

```

## Confusion Matrix

Labels (in order): ['authority_impersonation', 'benign', 'fabricated_urgency', 'fake_custody_framing', 'illegitimate_payment_request', 'isolation_tactic']

```
[[11  0  3  3  0  0]
 [ 0 13  1  0  2  1]
 [ 1  1  7  3  2  3]
 [ 1  0  2  6  1  4]
 [ 1  2  1  1 11  1]
 [ 1  1  1  4  0 10]]
```

## Known Limitations

- Training set is small (~100 examples) and hand-authored for the hackathon based on publicly reported scam patterns; production deployment requires a much larger, professionally reviewed and red-teamed dataset.
- The classifier operates on transcript text, not raw audio; a production system needs a real-time ASR front-end (e.g. Whisper) feeding this classifier continuously during a call.
- False-positive rate on the 'benign' class should be monitored closely and tightened further before any citizen-facing deployment, per the brief's requirement for a very low false-positive rate on citizen-facing tools.
- Cross-validation on a small, single-author dataset likely overstates real-world performance because all examples share one writing style; real scam calls and real benign conversations will be more linguistically diverse.
