import { useState } from "react";
import { api } from "../api";

// Phase 2: citizen submits a photo + location. Location is either a pin the
// user dropped on the map (pinMode) or a typed address (geocoded server-side).
export default function ReportForm({ city, pinMode, setPinMode, pickedPin, clearPin, onSubmitted }) {
  const [photo, setPhoto] = useState(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!photo) return setError("Please attach a photo.");
    if (!pickedPin && !address.trim())
      return setError("Drop a pin on the map or type an address.");

    const fd = new FormData();
    fd.append("city", city);
    fd.append("photo", photo);
    if (pickedPin) {
      fd.append("lat", pickedPin[0]);
      fd.append("lon", pickedPin[1]);
    } else {
      fd.append("address", address);
    }
    if (note) fd.append("note", note);

    setBusy(true);
    try {
      const res = await api.submitReport(fd);
      setResult(res);
      setPhoto(null);
      setAddress("");
      setNote("");
      clearPin();
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <h2>Report pollution</h2>
      <p className="hint">
        Photo of smoke / dust / haze, plus where you saw it. The photo is
        classified by Gemini vision, then folded into the hotspot score.
      </p>

      <form onSubmit={submit}>
        <div className="field">
          <label>Photo</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />
        </div>

        <div className="field">
          <label>Location</label>
          <button
            type="button"
            className={pinMode ? "primary" : "ghost"}
            onClick={() => setPinMode(!pinMode)}
            style={{ width: "100%", marginBottom: 6 }}
          >
            {pickedPin
              ? `📍 Pin set (${pickedPin[0].toFixed(4)}, ${pickedPin[1].toFixed(4)}) — click to change`
              : pinMode
              ? "Click on the map to drop a pin…"
              : "📍 Drop a pin on the map"}
          </button>
          <input
            placeholder="…or type an address / landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Note (optional)</label>
          <textarea
            rows={2}
            placeholder="e.g. garbage being burned near the junction"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button className="primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Classifying photo…" : "Submit report"}
        </button>
      </form>

      {error && <div className="error-banner" style={{ margin: "10px 0 0" }}>{error}</div>}
      {result && (
        <div className="error-banner" style={{ margin: "10px 0 0", background: "#14321f", borderColor: "#1c4", color: "#c8f7d4" }}>
          Classified as <b>{result.classification}</b> ({Math.round(result.confidence * 100)}%
          confidence). {result.description}
        </div>
      )}
    </div>
  );
}
