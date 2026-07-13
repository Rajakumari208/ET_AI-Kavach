# Kavach — Digital Public Safety Intelligence Platform

**Theme:** Smart Cities / Public Safety / Digital Trust / Geospatial Law Enforcement
**Problem statement:** AI for Digital Public Safety — Defeating Counterfeiting, Fraud & Digital Arrest Scams

Kavach is built around one core insight: digital arrest scam victims are
not uninformed, they are **isolated** — often on a live video call, told
explicitly not to hang up or contact anyone. Tools that require the
victim to actively ask for help arrive too late. Kavach is designed to
act *during* that isolation window instead of after it.

Full write-up: see [`ARCHITECTURE.md`](ARCHITECTURE.md) for system design
and [`data/DATA_SOURCES.md`](data/DATA_SOURCES.md) for data provenance.

## Modules

| Module | What it does | Code |
|---|---|---|
| **Guardian** | Real-time scam-pattern classifier + trusted-contact alerting | `guardian/` |
| **Lens** | Explainable counterfeit currency detection with signed certificates | `lens/` |
| **Map** | Geospatial command-centre dashboard for patrol prioritization | `map/` |

## Quick Start

### Prerequisites
```bash
python --version   # 3.10+
pip install -r requirements.txt
```

### 1. Guardian — train and evaluate the classifier
```bash
cd guardian/classifier
python train.py       # trains the deployable model -> guardian_model.pkl
python evaluate.py     # runs cross-validated evaluation -> results.md
python model.py        # quick smoke test with a sample call
```

Run the trusted-contact alert demo (uses a local dummy provider by
default — no external account needed):
```bash
cd ../alert_service
python alert.py
```

Run tests:
```bash
cd /path/to/kavach
python guardian/tests/test_classifier.py
```

### 2. Lens — analyze a currency note image
```bash
cd lens/detection
python model.py ../tests/sample_images/synthetic_genuine_note.jpg
python heatmap.py ../tests/sample_images/synthetic_genuine_note.jpg
python certificate_gen.py ../tests/sample_images/synthetic_genuine_note.jpg
```

> The bundled sample images are **synthetically generated** for pipeline
> testing, not real currency photographs — see `lens/detection/model.py`
> for why, and `data/DATA_SOURCES.md` for full provenance.

Run tests:
```bash
python lens/tests/test_detection.py
```

### 3. Map — run the command-centre dashboard
```bash
cd map/dashboard
streamlit run app.py
```
Opens a browser dashboard at `http://localhost:8501` showing synthetic
sample incidents (`map/sample_data/incidents.csv`) on a filterable map.

### 4. Unified Web Application (FastAPI + React Dashboard)
The unified application consolidates the three modules into a single web interface:
- **Guardian**: Call transcript NLP classification and safety alerts.
- **Lens**: Note edge density checks with annotating heatmaps and PDF/JSON certificate exports.
- **Map**: Visual command center plotting incident coordinates with custom filters.

#### Running in Development Mode
1. **FastAPI Backend**:
   ```bash
   pip install -r webapp/backend/requirements.txt
   python -m uvicorn webapp.backend.app:app --port 8000
   ```
   Exposes APIs at `http://localhost:8000`.

2. **React + Tailwind Frontend**:
   ```bash
   cd webapp/frontend
   npm install
   npm run dev
   ```
   Opens development console at `http://localhost:5173`.

3. **Running API Tests**:
   ```bash
   python -m pytest webapp/backend/tests/ -v
   ```

#### Running via Docker (Production / Deployment Ready)
Run both frontend and backend coordinated via Docker Compose.
```bash
cd webapp
docker compose up --build
```
This builds both services and routes traffic through Nginx at `http://localhost`.

## Repository Structure

```
kavach/
├── README.md                  ← you are here
├── ARCHITECTURE.md            ← system design + diagram
├── LICENSE
├── requirements.txt
├── guardian/
│   ├── classifier/            ← scam-pattern NLP classifier
│   │   ├── patterns.json      ← hand-authored labeled taxonomy
│   │   ├── train.py
│   │   ├── evaluate.py
│   │   ├── model.py
│   │   └── results.md         ← cross-validated performance numbers
│   ├── alert_service/         ← trusted-contact alerting
│   └── tests/
├── lens/
│   ├── detection/              ← CV counterfeit detection pipeline
│   │   ├── model.py
│   │   ├── heatmap.py
│   │   └── certificate_gen.py
│   └── tests/
│       └── sample_images/      ← synthetic test images
├── map/
│   ├── dashboard/               ← Streamlit command-centre app
│   └── sample_data/             ← synthetic incident data
├── data/
│   └── DATA_SOURCES.md          ← full data/library provenance
└── docs/
    └── architecture.png
```

## Honesty & Scope Notes

This is a hackathon-scope prototype. We have deliberately documented
limitations rather than hidden them:

- Guardian's classifier is trained on a small, hand-authored dataset
  (~100 examples). Cross-validated performance numbers and known
  limitations are in `guardian/classifier/results.md`.
- Lens uses heuristic image analysis rather than a model trained on a
  real, authorized counterfeit-currency dataset.
- Map's dashboard runs on synthetic sample data pending a live,
  authorized law-enforcement data feed.

See `ARCHITECTURE.md` for the full breakdown.

## Originality Declaration

All code, the scam-pattern taxonomy, and the datasets in this repository
were created by the team during the hackathon build period. See
`data/DATA_SOURCES.md` for exactly how each dataset was constructed and
which public information (not text) informed it.

## License

MIT — see [`LICENSE`](LICENSE).
