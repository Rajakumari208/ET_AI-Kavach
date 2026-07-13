"""
Kavach Map - Command Centre Dashboard
-----------------------------------------
Streamlit dashboard visualizing flagged Guardian/Lens incidents on a map,
with hotspot filtering by type/severity/date for patrol prioritization.

IMPORTANT: sample_data/incidents.csv is SYNTHETIC data generated for this
hackathon prototype - it does not represent real incidents or real
locations of any actual case. See map/sample_data/README.md.

Run:
    pip install streamlit pandas pydeck
    streamlit run map/dashboard/app.py
"""
import pandas as pd
import streamlit as st
import pydeck as pdk
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "sample_data" / "incidents.csv"

st.set_page_config(page_title="Kavach Command Centre", layout="wide")

st.title("Kavach — Command Centre Dashboard")
st.caption(
    "Geospatial view of flagged Guardian (scam) and Lens (counterfeit) incidents. "
    "**Data shown is synthetic sample data for prototype demonstration only.**"
)


@st.cache_data
def load_data():
    df = pd.read_csv(DATA_PATH, parse_dates=["reported_at"])
    return df


df = load_data()

# --- Sidebar filters ---
st.sidebar.header("Filters")
cities = st.sidebar.multiselect("City", sorted(df["city"].unique()), default=list(df["city"].unique()))
types = st.sidebar.multiselect("Incident type", sorted(df["incident_type"].unique()), default=list(df["incident_type"].unique()))
severities = st.sidebar.multiselect("Severity", sorted(df["severity"].unique()), default=list(df["severity"].unique()))

filtered = df[
    df["city"].isin(cities) & df["incident_type"].isin(types) & df["severity"].isin(severities)
]

col1, col2, col3 = st.columns(3)
col1.metric("Total incidents (filtered)", len(filtered))
col2.metric("High severity", int((filtered["severity"] == "high").sum()))
col3.metric("Cities represented", filtered["city"].nunique())

severity_color = {
    "low": [90, 160, 90, 160],
    "medium": [210, 160, 40, 180],
    "high": [200, 40, 40, 200],
}
filtered = filtered.copy()
filtered["color"] = filtered["severity"].map(severity_color)

st.subheader("Incident Map")
if len(filtered) > 0:
    view_state = pdk.ViewState(
        latitude=filtered["latitude"].mean(),
        longitude=filtered["longitude"].mean(),
        zoom=4.2,
        pitch=0,
    )
    layer = pdk.Layer(
        "ScatterplotLayer",
        data=filtered,
        get_position="[longitude, latitude]",
        get_fill_color="color",
        get_radius=6000,
        pickable=True,
    )
    tooltip = {"text": "{incident_type} — {severity}\n{city}\n{reported_at}"}
    st.pydeck_chart(pdk.Deck(layers=[layer], initial_view_state=view_state, tooltip=tooltip))
else:
    st.info("No incidents match the current filters.")

st.subheader("Incidents by City")
st.bar_chart(filtered.groupby("city").size())

st.subheader("Incident Type Breakdown")
st.bar_chart(filtered.groupby("incident_type").size())

with st.expander("Raw filtered data"):
    st.dataframe(filtered.drop(columns=["color"]))

st.caption(
    "Production version: this dashboard is designed to ingest live, "
    "authorized feeds from NCRB / state cybercrime cell / 1930 helpline "
    "reporting systems in place of the synthetic sample data shown here."
)
