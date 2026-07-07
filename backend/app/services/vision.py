"""
Gemini vision classification of citizen-submitted photos. Using Gemini is a
deliberate fit for a Google/GDG event. The model is asked to classify the
dominant air-quality event in the photo into a fixed vocabulary and return
strict JSON so the rest of the pipeline can rely on it.

Classes: smoke | dust | haze | fire | none
  - fire  : visible flames / active burning (garbage fire, crop burning)
  - smoke : smoke plume without clearly visible flame
  - dust  : construction / road dust, brown particulate haze near ground
  - haze  : general smog / low-visibility haze
  - none  : clear air, or photo doesn't show an air-quality event
"""
import json

import google.generativeai as genai

from ..config import require_env

MODEL = "gemini-2.5-flash"

_PROMPT = """You are an air-quality triage assistant for a municipal pollution map.
Look at this citizen-submitted photo and classify the dominant air-quality event.

Respond with ONLY a JSON object, no markdown, in exactly this shape:
{
  "classification": "smoke" | "dust" | "haze" | "fire" | "none",
  "confidence": <float 0.0-1.0>,
  "description": "<one short sentence describing what you see>"
}

Definitions:
- "fire": visible flames or active burning (e.g. garbage-dump fire, crop burning).
- "smoke": a smoke plume/cloud without clearly visible flames.
- "dust": construction or road dust; brownish near-ground particulate.
- "haze": general smog or low-visibility hazy air over a scene.
- "none": clear air, or the photo does not depict any air-quality event.

Be conservative: if unsure between an event and clear air, lower the confidence."""

_VALID = {"smoke", "dust", "haze", "fire", "none"}


def classify_photo(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Synchronous (google-generativeai is sync); called via run_in_threadpool."""
    from fastapi import HTTPException

    genai.configure(api_key=require_env("GEMINI_API_KEY"))
    model = genai.GenerativeModel(MODEL)

    try:
        resp = model.generate_content(
            [_PROMPT, {"mime_type": mime_type, "data": image_bytes}],
            generation_config={"temperature": 0.1, "response_mime_type": "application/json"},
        )
    except Exception as exc:  # noqa: BLE001 - translate SDK errors into a clear message
        # e.g. a suspended/invalid key raises PermissionDenied. Per the project's
        # no-fake-data rule we do NOT guess a classification -- we surface why.
        msg = str(exc)
        if "SUSPENDED" in msg or "PermissionDenied" in msg or "API_KEY_INVALID" in msg:
            raise HTTPException(
                status_code=503,
                detail="Gemini rejected the API key (suspended or invalid). "
                "Create a fresh key in a new project at https://aistudio.google.com/app/apikey, "
                "set GEMINI_API_KEY in backend/.env, and restart. "
                "The app will not fabricate a classification.",
            )
        raise HTTPException(status_code=502, detail=f"Gemini vision call failed: {msg[:200]}")

    raw = (resp.text or "").strip()
    data = _parse(raw)

    cls = str(data.get("classification", "none")).lower()
    if cls not in _VALID:
        cls = "none"
    try:
        conf = max(0.0, min(1.0, float(data.get("confidence", 0.0))))
    except (TypeError, ValueError):
        conf = 0.0
    return {
        "classification": cls,
        "confidence": conf,
        "description": str(data.get("description", ""))[:280],
    }


def _parse(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Strip accidental ```json fences if the model added them.
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {"classification": "none", "confidence": 0.0,
                    "description": "Could not parse model response."}
