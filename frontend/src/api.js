// Thin fetch wrapper. All URLs are relative and proxied to FastAPI (see
// vite.config.js). Errors surface the backend's clear message (e.g. a missing
// API key returns 503 with an instruction rather than fake data).

async function handle(resp) {
  if (!resp.ok) {
    let detail = `${resp.status} ${resp.statusText}`;
    try {
      const body = await resp.json();
      if (body.detail) detail = body.detail;
    } catch {
      /* non-JSON error */
    }
    throw new Error(detail);
  }
  return resp.json();
}

export const api = {
  cities: () => fetch("/api/cities").then(handle),
  sensors: (city) => fetch(`/api/sensors?city=${city}`).then(handle),
  reports: (city) => fetch(`/api/reports?city=${city}`).then(handle),
  fires: (city) => fetch(`/api/fires?city=${city}`).then(handle),
  hotspots: (city) => fetch(`/api/hotspots?city=${city}`).then(handle),
  forecast: (lat, lon) =>
    fetch(`/api/forecast?lat=${lat}&lon=${lon}`).then(handle),

  submitReport: (formData) =>
    fetch("/api/reports", { method: "POST", body: formData }).then(handle),

  dispatch: (cellId, city, action, status = "dispatched") => {
    const fd = new FormData();
    fd.append("cell_id", cellId);
    fd.append("city", city);
    if (action) fd.append("action", action);
    fd.append("status", status);
    return fetch("/api/alerts/dispatch", { method: "POST", body: fd }).then(handle);
  },
};
