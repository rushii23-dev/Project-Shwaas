import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { api } from "../api";

// Phase 5: 24h AQI projection for a selected hotspot. History + forecast are
// stitched into one series; a dashed vertical line marks "now".
export default function ForecastChart({ hotspot }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hotspot) return;
    setLoading(true);
    setError(null);
    setData(null);
    api
      .forecast(hotspot.lat, hotspot.lon)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [hotspot?.cell_id]);

  if (!hotspot) return null;
  if (loading) return <div className="spinner">Fetching recent trend + projecting 24h…</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return null;
  if (!data.available)
    return <p className="hint" style={{ padding: "0 16px" }}>{data.reason}</p>;

  const nowIdx = data.history.length - 1;
  const series = [
    ...data.history.map((h, i) => ({ i, aqi: h.aqi, kind: "history" })),
    ...data.forecast.map((f, i) => ({ i: nowIdx + i + 1, forecast: f.aqi })),
  ];

  return (
    <div style={{ padding: "0 8px 12px" }}>
      <p className="hint" style={{ padding: "0 8px" }}>
        Nearest station: <b>{data.station || "n/a"}</b> · {data.method}
        {data.spike_expected && (
          <span className="tag fire" style={{ marginLeft: 8 }}>
            ⚠ spike expected (peak ~{data.peak_aqi})
          </span>
        )}
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={series} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
          <XAxis dataKey="i" tick={{ fontSize: 10, fill: "#8b9bab" }} />
          <YAxis tick={{ fontSize: 10, fill: "#8b9bab" }} domain={[0, "dataMax + 40"]} />
          <Tooltip
            contentStyle={{ background: "#182430", border: "1px solid #2a3a4a", fontSize: 12 }}
            labelFormatter={() => ""}
          />
          <ReferenceLine x={nowIdx} stroke="#4da3ff" strokeDasharray="4 4" label={{ value: "now", fill: "#4da3ff", fontSize: 10 }} />
          <ReferenceLine y={200} stroke="#e93f33" strokeDasharray="2 2" />
          <Line type="monotone" dataKey="aqi" stroke="#a3c853" strokeWidth={2} dot={false} name="observed" />
          <Line type="monotone" dataKey="forecast" stroke="#f29305" strokeWidth={2} strokeDasharray="5 3" dot={false} name="forecast" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
