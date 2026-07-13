import React, { useState } from 'react';
import { Camera, AlertCircle, CheckCircle2, AlertTriangle, FileText, Download, Upload } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function LensTab() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [denomination, setDenomination] = useState("500");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select or drop a banknote image first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('denomination', denomination);

    try {
      const response = await fetch(`${API_BASE}/api/lens/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Image analysis failed.");
      }

      const data = await response.json();
      setResult(data);

      // Report incident to Map dynamically in real-time (located in Hyderabad)
      try {
        const lat = 17.3850 + (Math.random() - 0.5) * 0.15;
        const lng = 78.4867 + (Math.random() - 0.5) * 0.15;
        let severity = "low";
        if (data.verdict === "likely_counterfeit") {
          severity = "high";
        } else if (data.verdict === "inconclusive") {
          severity = "medium";
        }
        await fetch(`${API_BASE}/api/map/incidents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: "Hyderabad",
            incident_type: "counterfeit_currency",
            severity: severity,
            latitude: lat,
            longitude: lng
          }),
        });
      } catch (mapErr) {
        console.error("Failed to log real-time banknote incident on map:", mapErr);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCertificate = () => {
    if (!result || !result.certificate) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.certificate, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `kavach_certificate_${result.certificate.certificate_id.substring(0,8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getVerdictDetails = (verdict) => {
    switch (verdict) {
      case 'likely_genuine':
        return {
          label: 'LIKELY GENUINE',
          color: 'text-emerald-400 border-emerald-500 bg-emerald-950/20',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        };
      case 'inconclusive':
        return {
          label: 'INCONCLUSIVE',
          color: 'text-amber-400 border-amber-500 bg-amber-950/20',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />
        };
      case 'likely_counterfeit':
      default:
        return {
          label: 'LIKELY COUNTERFEIT',
          color: 'text-red-400 border-red-500 bg-red-950/20',
          icon: <AlertCircle className="w-5 h-5 text-red-400" />
        };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Upload Panel */}
      <div className="lg:col-span-5 bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Camera className="w-6 h-6 text-teal-400" />
            <h2 className="text-xl font-semibold text-slate-100">Lens Image Analysis</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Upload a high-resolution banknote photograph to run region-based density validation.
          </p>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
              previewUrl
                ? 'border-slate-600 bg-slate-900/30'
                : 'border-slate-700 hover:border-teal-500 hover:bg-slate-900/10'
            }`}
            onClick={() => document.getElementById('fileInput').click()}
          >
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {previewUrl ? (
              <div className="relative w-full max-h-[200px] overflow-hidden rounded-lg flex items-center justify-center">
                <img src={previewUrl} alt="Banknote preview" className="max-h-[180px] object-contain rounded" />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 hover:opacity-100 transition flex items-center justify-center text-xs font-semibold text-slate-200">
                  Click to replace
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-300">Click to upload or drag banknote here</p>
                <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WEBP</p>
              </div>
            )}
          </div>

          {/* Denomination Picker */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase font-mono">Select Denomination</label>
            <select
              value={denomination}
              onChange={(e) => setDenomination(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-teal-500 transition text-sm"
            >
              <option value="500">₹500 Note</option>
              <option value="100">₹100 Note</option>
              <option value="200">₹200 Note</option>
              <option value="2000">₹2000 Note</option>
            </select>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !selectedFile}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Run Lens Pipeline
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {result ? (
          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              {/* Verdict Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 font-sans">Analysis Outcome</h3>
                  <span className="text-xs text-slate-400 font-mono">Tested Denomination: ₹{result.denomination}</span>
                </div>
                <div className={`px-4 py-2 border rounded-full text-xs font-bold flex items-center gap-1.5 ${getVerdictDetails(result.verdict).color}`}>
                  {getVerdictDetails(result.verdict).icon}
                  {getVerdictDetails(result.verdict).label}
                </div>
              </div>

              {/* Confidence Rating */}
              <div className="mb-6">
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>ANALYSIS CONFIDENCE SCORE</span>
                  <span>{Math.round(result.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      result.verdict === 'likely_genuine'
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/50'
                        : result.verdict === 'inconclusive'
                        ? 'bg-amber-500 shadow-md shadow-amber-500/50'
                        : 'bg-red-500 shadow-md shadow-red-500/50'
                    }`}
                    style={{ width: `${result.confidence * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Region Grid & Heatmap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono mb-3">Region Analysis</h4>
                  <div className="space-y-2.5">
                    {Object.entries(result.analysis.regions).map(([name, region], index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-300 capitalize">{name.replace(/_/g, ' ')}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Density: {region.edge_density.toFixed(3)} (Min: {region.threshold.toFixed(2)})
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                          region.passed
                            ? 'text-emerald-400 bg-emerald-950/30'
                            : 'text-red-400 bg-red-950/30'
                        }`}>
                          {region.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono mb-3">Explainability Heatmap</h4>
                  <div className="border border-slate-700 bg-slate-900/50 rounded-xl overflow-hidden p-2 flex items-center justify-center">
                    <img
                      src={`${API_BASE}${result.heatmap_url}`}
                      alt="Explainability Heatmap"
                      className="max-h-[160px] object-contain rounded"
                      onError={(e) => {
                        e.target.src = previewUrl; // fallback to user's original image if path error
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate block */}
            <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <FileText className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-300">Auditable Decrypted Certificate</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                    SHA-256 integrity hash-signed certification file available for evidentiary legal submission.
                  </p>
                </div>
              </div>
              <button
                onClick={downloadCertificate}
                className="whitespace-nowrap bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON Certificate
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/20 border border-slate-700/30 border-dashed rounded-2xl p-12 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
            <Camera className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-medium text-slate-400 mb-1">Awaiting Note Submission</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Upload a banknote photo in the left panel and click "Run Lens Pipeline" to generate audit reports.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
