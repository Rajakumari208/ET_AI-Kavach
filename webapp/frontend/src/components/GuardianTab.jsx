import React, { useState } from 'react';
import { Shield, AlertTriangle, Send, CheckCircle2, User, Phone, HelpCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function GuardianTab() {
  const [transcript, setTranscript] = useState(
    "The caller said he is from the CBI and my Aadhaar is linked to a crime\n" +
    "He told me not to hang up or tell my family about this call\n" +
    "They asked me to transfer money to a verification account immediately"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Alert Modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [victimName, setVictimName] = useState("Amma");
  const [trustedPhone, setTrustedPhone] = useState("+91 98765 43210");
  const [alertSending, setAlertSending] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(null);

  const handleAssess = async () => {
    setIsLoading(true);
    setError(null);
    setAlertSuccess(null);
    
    const snippets = transcript.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    if (snippets.length === 0) {
      setError("Please enter at least one transcript snippet.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/guardian/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snippets }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Server returned an error");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    setAlertSending(true);
    setError(null);
    setAlertSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/api/guardian/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          victim_name: victimName,
          trusted_contact_phone: trustedPhone,
          risk_result: result
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to trigger alert");
      }

      const data = await response.json();
      setAlertSuccess(data);
      setShowAlertModal(false);

      // Report incident to Map dynamically in real-time (located in Hyderabad)
      try {
        const lat = 17.3850 + (Math.random() - 0.5) * 0.15;
        const lng = 78.4867 + (Math.random() - 0.5) * 0.15;
        await fetch(`${API_BASE}/api/map/incidents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: "Hyderabad",
            incident_type: "digital_arrest_scam",
            severity: "high",
            latitude: lat,
            longitude: lng
          }),
        });
      } catch (mapErr) {
        console.error("Failed to log real-time incident on map:", mapErr);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAlertSending(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 0.5) return 'text-red-500 border-red-500 bg-red-950/20';
    if (score >= 0.3) return 'text-amber-500 border-amber-500 bg-amber-950/20';
    return 'text-teal-400 border-teal-500 bg-teal-950/20';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Input panel */}
      <div className="lg:col-span-6 bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-teal-400" />
          <h2 className="text-xl font-semibold text-slate-100">Guardian Scam-Call Assessment</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Paste speech-to-text transcripts below (one snippet or sentence per line) to evaluate real-time scam patterns.
        </p>

        <textarea
          className="flex-1 w-full min-h-[220px] bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition font-mono text-sm leading-relaxed"
          placeholder="Example:
I am calling from Mumbai Police HQ.
Your bank account is linked to a Money Laundering case.
You must stay on this WhatsApp call and not speak to anyone."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />

        <button
          onClick={handleAssess}
          disabled={isLoading}
          className="mt-4 w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Assess Risk
            </>
          )}
        </button>

        {error && !showAlertModal && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results panel */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        {result ? (
          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Evaluation Analysis</h3>
                  <span className="text-xs text-slate-400 font-mono">Matched: {result.marker_count} markers</span>
                </div>
                <div className={`px-4 py-2 border rounded-full text-sm font-bold ${getRiskColor(result.risk_score)}`}>
                  {result.risk_score >= 0.5 ? 'CRITICAL RISK' : result.risk_score >= 0.3 ? 'SUSPICIOUS' : 'SECURE'}
                </div>
              </div>

              {/* Risk meter */}
              <div className="mb-6">
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>SCAM THREAT LEVEL</span>
                  <span>{Math.round(result.risk_score * 100)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      result.risk_score >= 0.5
                        ? 'bg-red-500 shadow-md shadow-red-500/50'
                        : result.risk_score >= 0.3
                        ? 'bg-amber-500 shadow-md shadow-amber-500/50'
                        : 'bg-teal-500 shadow-md shadow-teal-500/50'
                    }`}
                    style={{ width: `${result.risk_score * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Matched markers list */}
              <h4 className="text-sm font-medium text-slate-300 mb-3">Scam Taxonomy Match</h4>
              {result.matched_markers.length > 0 ? (
                <div className="space-y-3">
                  {Object.values(result.details).map((marker, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/40 border border-slate-700/40 rounded-xl flex items-start gap-3 hover:border-slate-600 transition"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-amber-400 font-mono uppercase">
                          {marker.label.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-slate-300 capitalize">{marker.explanation}</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                          Pattern confidence: {(marker.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl text-center text-slate-500 text-sm">
                  No scam markers detected in this transcript sample.
                </div>
              )}
            </div>

            {/* Alert triggering block */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              {result.recommend_alert ? (
                <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-400">Critical Threat Identified</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                        Scammer is utilizing isolation and authority impersonation. Triggering trusted-contact alert is recommended.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAlertModal(true)}
                    className="whitespace-nowrap bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/20 self-start md:self-auto"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Notify Contact
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3 text-slate-400 text-xs">
                  <HelpCircle className="w-4 h-4 text-teal-400" />
                  No alerts triggered. Kavach alerts the trusted contact once 2 or more distinct markers are identified.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/20 border border-slate-700/30 border-dashed rounded-2xl p-12 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
            <Shield className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-medium text-slate-400 mb-1">Awaiting Assessment</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Input a call transcript snippet in the input panel and click "Assess Risk" to display results.
            </p>
          </div>
        )}

        {/* Dummy Alert success log display */}
        {alertSuccess && (
          <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold text-sm">Alert Sent Successfully (Simulation)</span>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
              <div><span className="text-slate-500">Provider:</span> DummyProvider</div>
              <div><span className="text-slate-500">To:</span> {alertSuccess.to}</div>
              <div><span className="text-slate-500">Status:</span> {alertSuccess.status}</div>
              <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-normal">
                [DummyProvider Log] Safe simulation completed. No live SMS fees charged. Details recorded to <code className="text-teal-400 font-mono">alert_log.jsonl</code>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert Contact Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-bold text-slate-200">Send Safety Alert</h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              This will bypass the victim's screen and send a discrete WhatsApp alert to their designated trusted contact.
            </p>

            <form onSubmit={handleSendAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono">Victim's Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500 transition text-sm"
                    value={victimName}
                    onChange={(e) => setVictimName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono">Trusted Contact Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500 transition text-sm"
                    value={trustedPhone}
                    onChange={(e) => setTrustedPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-xl transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={alertSending}
                  className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-medium py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-1.5 shadow-lg shadow-red-900/20"
                >
                  {alertSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Confirm & Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
