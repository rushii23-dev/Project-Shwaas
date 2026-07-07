import { useState } from "react";
import { api } from "../api";
import ForecastChart from "./ForecastChart";

// Phase 4 + 6: ranked hotspot list = the municipal "alert panel". Each card
// shows why the cell fired, a 24h forecast on expand, and a dispatch button
// that flips DB status so a field team can mark it handled.
export default function HotspotPanel({ city, hotspots, meta, onDispatched, onFocus }) {
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);

  async function dispatch(h) {
    setBusy(h.cell_id);
    try {
      await api.dispatch(h.cell_id, city, h.suggested_action, "dispatched");
      onDispatched();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="section" style={{ borderBottom: "none" }}>
      <h2>Municipal alert panel</h2>
      <p className="hint">
        {meta ? (
          <>
            {meta.hidden_count} hidden hotspot{meta.hidden_count === 1 ? "" : "s"} ·{" "}
            {hotspots.length} total · {meta.sensor_count} sensors · {meta.report_count}{" "}
            citizen reports · {meta.fire_count} fire pixels
          </>
        ) : (
          "Loading…"
        )}
      </p>

      {hotspots.length === 0 && (
        <p className="mini-note">
          No hotspots cleared the threshold yet. Submit a smoke/fire photo report
          in an area with no sensor to watch a hidden hotspot form.
        </p>
      )}

      {hotspots.map((h) => (
        <div key={h.cell_id} className={`hotspot-card ${h.hidden_hotspot ? "hidden" : ""}`}>
          <div className="badge-row">
            {h.hidden_hotspot && <span className="tag hidden">HIDDEN — no sensor</span>}
            {h.evidence.fire_pixels > 0 && <span className="tag fire">🔥 satellite</span>}
            {h.sensor_covered && <span className="tag covered">sensor-covered</span>}
            <span
              className={`status-pill ${h.alert_status === "dispatched" ? "dispatched" : "open"}`}
            >
              {h.alert_status}
            </span>
          </div>

          <div className="row">
            <div>
              <span className="score" style={{ color: h.color }}>
                {h.score}
              </span>{" "}
              <span className="mini-note">/ 100</span>
            </div>
            <button className="ghost" onClick={() => onFocus(h)}>
              📍 focus
            </button>
          </div>

          <div className="meta">
            {h.lat.toFixed(4)}, {h.lon.toFixed(4)} · reports {h.evidence.citizen_reports} ·
            fires {h.evidence.fire_pixels}
            {h.nearest_sensor_aqi != null && <> · nearest sensor AQI {Math.round(h.nearest_sensor_aqi)}</>}
          </div>

          <div className="mini-note">
            signals — sensor {h.subscores.sensor} · citizen {h.subscores.citizen} · sat{" "}
            {h.subscores.satellite}
          </div>

          <div className="action">
            <b>Suggested:</b> {h.suggested_action}
          </div>

          <div className="row">
            <button
              className="ghost"
              onClick={() => setExpanded(expanded === h.cell_id ? null : h.cell_id)}
            >
              {expanded === h.cell_id ? "Hide 24h forecast" : "Show 24h forecast"}
            </button>
            <button
              className="primary"
              disabled={busy === h.cell_id || h.alert_status === "dispatched"}
              onClick={() => dispatch(h)}
            >
              {h.alert_status === "dispatched"
                ? `✔ dispatched`
                : busy === h.cell_id
                ? "…"
                : "Dispatch"}
            </button>
          </div>

          {expanded === h.cell_id && <ForecastChart hotspot={h} />}
        </div>
      ))}
    </div>
  );
}
