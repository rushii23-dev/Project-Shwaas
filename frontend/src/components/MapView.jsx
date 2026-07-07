import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  LayerGroup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

// NASA GIBS: MODIS Terra true-colour, near-real-time. No key required.
// {Time} is filled with yesterday's date (today's tile is often not ready).
function gibsUrl() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const day = d.toISOString().slice(0, 10);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

// Fire icon (satellite thermal anomaly).
const fireIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:18px;line-height:18px">🔥</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Citizen report icons keyed by Gemini classification.
const REPORT_EMOJI = { smoke: "💨", dust: "🌫️", haze: "😶‍🌫️", fire: "🔥", none: "📷" };
function reportIcon(cls) {
  return L.divIcon({
    className: "",
    html: `<div style="font-size:20px;line-height:20px;filter:drop-shadow(0 0 2px #000)">${
      REPORT_EMOJI[cls] || "📷"
    }</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

// Recenter the map when the city changes.
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center[0], center[1]]);
  return null;
}

// Capture clicks so a citizen can drop a report pin.
function ClickToPin({ enabled, onPick }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function MapView({
  center,
  layers,
  sensors,
  reports,
  fires,
  hotspots,
  pinMode,
  pickedPin,
  onPickPin,
  onSelectHotspot,
}) {
  return (
    <MapContainer center={center} zoom={12} preferCanvas>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {layers.satellite && (
        <TileLayer
          key="gibs"
          url={gibsUrl()}
          opacity={0.55}
          attribution="Imagery &copy; NASA GIBS / Worldview"
        />
      )}

      <Recenter center={center} />
      <ClickToPin enabled={pinMode} onPick={onPickPin} />

      {/* Phase 1: ground sensors — AQI dot + pollution source label */}
      {layers.sensors && (
        <LayerGroup>
          {sensors.map((f, i) => {
            const p = f.properties;
            const hasSource = p.pollution_source && p.pollution_source.length > 0;
            const icon = L.divIcon({
              className: "",
              html: `<div class="sensor-marker">
                <div class="sensor-dot" style="background:${p.color};border-color:${p.color === '#fff833' || p.color === '#a3c853' ? '#555' : p.color}">
                  <span class="sensor-aqi">${Math.round(p.aqi)}</span>
                </div>
                ${hasSource ? `<div class="sensor-source-label">${p.source_icon || ''} ${p.pollution_source}</div>` : ''}
              </div>`,
              iconSize: [80, hasSource ? 52 : 28],
              iconAnchor: [40, 14],
            });
            return (
              <Marker key={`s${i}`} position={[p.lat, p.lon]} icon={icon}>
                <Popup>
                  <b>{p.name}</b>
                  <br />
                  Source: {p.source}
                  <br />
                  AQI ~ <b>{Math.round(p.aqi)}</b> ({p.band})
                  <br />
                  {p.parameter?.toUpperCase()}: {p.value} {p.unit}
                  {p.pollution_source && (
                    <>
                      <br />
                      <span style={{ color: "#ff9800", fontWeight: 600 }}>
                        {p.source_icon} Cause: {p.pollution_source}
                      </span>
                      {p.source_detail && (
                        <>
                          <br />
                          <span style={{ fontSize: 11, color: "#888" }}>
                            {p.source_detail}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </LayerGroup>
      )}

      {/* Phase 4: hotspots (drawn under markers, above tiles) */}
      {layers.hotspots && (
        <LayerGroup>
          {hotspots.map((h) => (
            <CircleMarker
              key={h.cell_id}
              center={[h.lat, h.lon]}
              radius={h.hidden_hotspot ? 16 : 12}
              pathOptions={{
                color: h.hidden_hotspot ? "#ff2bd6" : "#000",
                weight: h.hidden_hotspot ? 3 : 1,
                fillColor: h.color,
                fillOpacity: 0.45,
                className: h.hidden_hotspot ? "pulse" : "",
              }}
              eventHandlers={{ click: () => onSelectHotspot(h) }}
            >
              <Popup>
                <b>Hotspot — score {h.score}</b>
                {h.hidden_hotspot && (
                  <>
                    <br />
                    <span style={{ color: "#ff2bd6", fontWeight: 700 }}>
                      HIDDEN — no official sensor nearby
                    </span>
                  </>
                )}
                <br />
                Citizen reports: {h.evidence.citizen_reports}
                <br />
                Fire pixels: {h.evidence.fire_pixels}
                <br />
                <i>{h.suggested_action}</i>
              </Popup>
            </CircleMarker>
          ))}
        </LayerGroup>
      )}

      {/* Phase 3: satellite fires */}
      {layers.fires && (
        <LayerGroup>
          {fires.map((f, i) => {
            const p = f.properties;
            return (
              <Marker key={`f${i}`} position={[p.lat, p.lon]} icon={fireIcon}>
                <Popup>
                  <b>🔥 FIRMS thermal anomaly</b>
                  <br />
                  Brightness: {p.brightness} K
                  <br />
                  FRP: {p.frp} MW
                  <br />
                  Confidence: {p.confidence}
                  <br />
                  {p.acq_date} {p.acq_time} ({p.daynight})
                </Popup>
              </Marker>
            );
          })}
        </LayerGroup>
      )}

      {/* Phase 2: citizen reports */}
      {layers.reports && (
        <LayerGroup>
          {reports.map((f, i) => {
            const p = f.properties;
            return (
              <Marker key={`r${i}`} position={[p.lat, p.lon]} icon={reportIcon(p.classification)}>
                <Popup>
                  <b>Citizen report: {p.classification}</b> ({Math.round((p.confidence || 0) * 100)}%)
                  <br />
                  {p.description}
                  <br />
                  {p.photo_url && (
                    <img src={p.photo_url} alt="report" style={{ width: 160, marginTop: 6, borderRadius: 6 }} />
                  )}
                  <br />
                  <span className="mini-note">{p.created_at}</span>
                </Popup>
              </Marker>
            );
          })}
        </LayerGroup>
      )}

      {/* Pending pin the citizen just dropped */}
      {pickedPin && (
        <CircleMarker
          center={pickedPin}
          radius={9}
          pathOptions={{ color: "#4da3ff", weight: 3, fillColor: "#4da3ff", fillOpacity: 0.4 }}
        />
      )}
    </MapContainer>
  );
}
