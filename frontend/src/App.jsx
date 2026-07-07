import { useEffect, useState, useCallback } from "react";
import MapView from "./components/MapView";
import ReportForm from "./components/ReportForm";
import HotspotPanel from "./components/HotspotPanel";
import { api } from "./api";

const BANDS = [
  ["Good", "#009865"],
  ["Satisfactory", "#a3c853"],
  ["Moderate", "#fff833"],
  ["Poor", "#f29305"],
  ["Very Poor", "#e93f33"],
  ["Severe", "#af2d24"],
];

export default function App() {
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState("delhi");
  const [center, setCenter] = useState([28.6139, 77.209]);

  const [sensors, setSensors] = useState([]);
  const [reports, setReports] = useState([]);
  const [fires, setFires] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotMeta, setHotspotMeta] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [layers, setLayers] = useState({
    sensors: true,
    reports: true,
    fires: true,
    hotspots: true,
    satellite: false,
  });

  const [pinMode, setPinMode] = useState(false);
  const [pickedPin, setPickedPin] = useState(null);
  const [focusHotspot, setFocusHotspot] = useState(null);

  useEffect(() => {
    api.cities().then(setCities).catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const errs = [];
    // Each layer loads independently so one missing key doesn't blank the map.
    const [s, r, f, h] = await Promise.allSettled([
      api.sensors(city),
      api.reports(city),
      api.fires(city),
      api.hotspots(city),
    ]);

    if (s.status === "fulfilled") {
      setSensors(s.value.features);
      errs.push(...(s.value.meta.errors || []));
    } else errs.push({ source: "sensors", error: s.reason.message });

    if (r.status === "fulfilled") setReports(r.value.features);
    else errs.push({ source: "reports", error: r.reason.message });

    if (f.status === "fulfilled") setFires(f.value.features);
    else errs.push({ source: "FIRMS", error: f.reason.message });

    if (h.status === "fulfilled") {
      setHotspots(h.value.hotspots);
      setHotspotMeta(h.value.meta);
    } else errs.push({ source: "hotspots", error: h.reason.message });

    setErrors(errs);
    setLoading(false);
  }, [city]);

  useEffect(() => {
    const c = cities.find((x) => x.slug === city);
    if (c) setCenter([c.lat, c.lon]);
    loadAll();
  }, [city, cities, loadAll]);

  const onPickPin = (latlng) => {
    setPickedPin(latlng);
    setPinMode(false);
  };

  return (
    <div className="app">
      <div className="map-wrap">
        <div className="topbar">
          <a className="brand" href="/" style={{ textDecoration: "none", color: "inherit" }}>
            ← SHWAAS
            <small>Neighbourhood Pollution Hotspot Map</small>
          </a>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={loadAll} disabled={loading}>
            {loading ? "Refreshing…" : "↻ Refresh live data"}
          </button>
          <div className="layer-toggles">
            {Object.keys(layers).map((k) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={layers[k]}
                  onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })}
                />
                {k === "satellite" ? "GIBS imagery" : k}
              </label>
            ))}
          </div>
        </div>

        <MapView
          center={center}
          layers={layers}
          sensors={sensors}
          reports={reports}
          fires={fires}
          hotspots={hotspots}
          pinMode={pinMode}
          pickedPin={pickedPin}
          onPickPin={onPickPin}
          onSelectHotspot={setFocusHotspot}
        />

        <div className="legend">
          <div style={{ fontWeight: 600, marginBottom: 4 }}>AQI band</div>
          {BANDS.map(([label, color]) => (
            <div className="row" key={label}>
              <span className="swatch" style={{ background: color }} />
              {label}
            </div>
          ))}
          <div className="row" style={{ marginTop: 6 }}>
            <span className="swatch" style={{ background: "#ff2bd6" }} />
            Hidden hotspot
          </div>
        </div>
      </div>

      <div className="sidebar">
        {errors.length > 0 && (
          <div className="error-banner">
            <b>Live-data notices:</b>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {errors.map((e, i) => (
                <li key={i}>
                  <b>{e.source}:</b> {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <ReportForm
          city={city}
          pinMode={pinMode}
          setPinMode={setPinMode}
          pickedPin={pickedPin}
          clearPin={() => setPickedPin(null)}
          onSubmitted={loadAll}
        />

        <HotspotPanel
          city={city}
          hotspots={hotspots}
          meta={hotspotMeta}
          onDispatched={loadAll}
          onFocus={(h) => {
            setCenter([h.lat, h.lon]);
            setFocusHotspot(h);
          }}
        />
      </div>
    </div>
  );
}
