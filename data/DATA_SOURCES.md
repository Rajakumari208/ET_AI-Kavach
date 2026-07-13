# Data Sources & Provenance

This file documents where every piece of data used in Kavach came from,
in line with the hackathon's rules on originality and authorized use of
third-party material. Nothing in this repository was scraped, copied, or
reused from an existing dataset, codebase, or proprietary source.

## 1. Guardian — Scam Pattern Taxonomy (`guardian/classifier/patterns.json`)

**What it is:** ~100 short example sentences, hand-authored by the team,
labeled into six categories (`authority_impersonation`, `isolation_tactic`,
`illegitimate_payment_request`, `fabricated_urgency`, `fake_custody_framing`,
`benign`).

**How it was built:** the team read publicly available reporting on digital
arrest scams — Ministry of Home Affairs advisories, RBI Annual Report 2025
commentary, and mainstream news coverage describing the *mechanics* of
these scams (e.g. impersonation of CBI/ED/Customs officials, victims told
not to disconnect, fabricated urgency about warrants and frozen accounts).
The team then **wrote original example sentences** in their own words that
illustrate each pattern category. No transcripts, verbatim scripts, or
existing labeled scam-call datasets were used as source material.

**Why this matters:** the classifier is trained on the team's own writing,
not on any third party's copyrighted or proprietary text.

## 2. Lens — Counterfeit Detection Heuristics (`lens/detection/model.py`)

**What it is:** a rule-based image analysis pipeline (edge-density checks
on defined note regions) plus a small set of synthetic test images
(`lens/tests/sample_images/`).

**How it was built:** the region definitions (security thread location,
microprint zone, serial number zone) are based on publicly known,
general descriptions of Indian currency note security features as
described by the RBI in public consumer-education material — not on any
proprietary detection dataset. The test images used to validate the
pipeline are **synthetically generated** (drawn programmatically with
OpenCV) and are explicitly not photographs of real currency, to avoid
any question of using unauthorized currency imagery.

**Limitation acknowledged openly:** this is a heuristic proxy for a
hackathon prototype, not a production classifier trained on a real,
RBI-authorized note-image dataset. See `lens/detection/model.py` docstring
for the full scope note.

## 3. Map — Incident Data (`map/sample_data/incidents.csv`)

**What it is:** 120 rows of synthetic incident records (city, coordinates,
incident type, severity, timestamp).

**How it was built:** generated programmatically with randomized jitter
around five Indian metro-area coordinates and randomly assigned incident
types/severities/dates. This is placeholder data only, clearly labeled as
such in `map/sample_data/README.md`, standing in for a live authorized
feed (NCRB / state cybercrime cell / 1930 helpline) in production.

## 4. Open-Source Libraries Used

All libraries used are open-source with permissive licenses, installed via
standard package managers (pip), and used as intended by their
documentation:

| Library | License | Purpose |
|---|---|---|
| scikit-learn | BSD-3-Clause | Guardian's TF-IDF + Logistic Regression classifier |
| opencv-python | Apache 2.0 | Lens image analysis and heatmap rendering |
| pandas | BSD-3-Clause | Data handling for Map dashboard |
| streamlit | Apache 2.0 | Map dashboard UI |
| pydeck | Apache 2.0 | Map visualization layer |
| twilio (optional) | MIT | WhatsApp alert delivery (Guardian alert service) |

No paid or restricted-license API was used without authorization. The
optional Twilio integration uses Twilio's free WhatsApp sandbox for
demo purposes; the default alert provider is a local `DummyProvider`
that requires no external account.

## 5. Declaration

All code, the scam-pattern taxonomy, the CV heuristics, and the synthetic
datasets in this repository were created by the team during the hackathon
build period. Public information (news articles, government advisories)
informed our understanding of the problem but was not copied into the
repository in any form.
