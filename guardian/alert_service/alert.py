"""
Guardian Alert Service
------------------------
When Guardian's classifier flags a call as high-risk (2+ distinct scam
markers matched), this service notifies a pre-designated trusted contact
WITHOUT interrupting the victim's own screen - the core design choice
described in the submission: sidestep the isolation tactic instead of
relying on the victim to break out of it.

This module ships with a console/log "DummyProvider" by default so the
project runs out of the box with no external accounts. Swap in the
Twilio/WhatsApp Business API provider for a live demo by setting
provider="twilio" and the required environment variables.

Usage:
    from alert import send_trusted_contact_alert
    send_trusted_contact_alert(
        victim_name="Amma",
        trusted_contact_phone="+91XXXXXXXXXX",
        risk_result={"marker_count": "4 of 6", "matched_markers": [...]},
    )
"""
import os
import json
import datetime
from pathlib import Path

HERE = Path(__file__).parent
ALERT_LOG = HERE / "alert_log.jsonl"


class DummyProvider:
    """Default provider - logs the alert locally instead of sending a real
    message. Safe for demos and CI; no external credentials required."""

    def send(self, to: str, message: str) -> dict:
        print(f"[DummyProvider] Would send to {to}:\n{message}\n")
        return {"status": "logged", "to": to}


class TwilioWhatsAppProvider:
    """Real provider using Twilio's WhatsApp Business API sandbox.
    Requires: pip install twilio
    Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
    """

    def __init__(self):
        from twilio.rest import Client  # imported lazily so DummyProvider works without twilio installed

        self.client = Client(
            os.environ["TWILIO_ACCOUNT_SID"],
            os.environ["TWILIO_AUTH_TOKEN"],
        )
        self.from_number = os.environ["TWILIO_WHATSAPP_FROM"]

    def send(self, to: str, message: str) -> dict:
        msg = self.client.messages.create(
            from_=f"whatsapp:{self.from_number}",
            to=f"whatsapp:{to}",
            body=message,
        )
        return {"status": msg.status, "to": to, "sid": msg.sid}


def _build_message(victim_name: str, risk_result: dict) -> str:
    markers = ", ".join(m.replace("_", " ") for m in risk_result.get("matched_markers", []))
    return (
        f"KAVACH SAFETY ALERT\n\n"
        f"{victim_name}'s call is showing signs of a possible digital arrest "
        f"scam ({risk_result.get('marker_count', 'multiple')} known markers matched: {markers}).\n\n"
        f"They may be on a call where they've been told not to hang up or "
        f"contact anyone. Consider calling their landline, messaging a "
        f"different number, or checking on them in person.\n\n"
        f"This is an automated alert. No audio or video was shared - only "
        f"a risk pattern match."
    )


def send_trusted_contact_alert(
    victim_name: str,
    trusted_contact_phone: str,
    risk_result: dict,
    provider: str = "dummy",
) -> dict:
    message = _build_message(victim_name, risk_result)

    if provider == "twilio":
        provider_instance = TwilioWhatsAppProvider()
    else:
        provider_instance = DummyProvider()

    result = provider_instance.send(trusted_contact_phone, message)

    # Append to local alert log for auditability
    log_entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "victim_name": victim_name,
        "trusted_contact": trusted_contact_phone,
        "risk_result": risk_result,
        "provider_result": result,
    }
    with open(ALERT_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")

    return result


if __name__ == "__main__":
    demo_risk = {
        "marker_count": "3 of 6",
        "matched_markers": ["authority_impersonation", "isolation_tactic", "fabricated_urgency"],
    }
    send_trusted_contact_alert(
        victim_name="Test User",
        trusted_contact_phone="+910000000000",
        risk_result=demo_risk,
        provider="dummy",
    )
