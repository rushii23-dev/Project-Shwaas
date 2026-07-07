"""
AQI band classification, shared by sensors, hotspots and forecasts so the map
legend stays consistent everywhere. Bands follow the CPCB / India National AQI
scale (the scale an MP's municipal team will recognise), keyed on the dominant
pollutant's sub-index. For the hackathon we band on PM2.5 concentration
(ug/m3) when a raw AQI number isn't provided, using CPCB PM2.5 breakpoints.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Band:
    label: str
    color: str  # hex, used directly by Leaflet markers + legend


# CPCB National AQI category colours.
BANDS = [
    Band("Good", "#009865"),
    Band("Satisfactory", "#a3c853"),
    Band("Moderate", "#fff833"),
    Band("Poor", "#f29305"),
    Band("Very Poor", "#e93f33"),
    Band("Severe", "#af2d24"),
]

# CPCB PM2.5 (24h avg, ug/m3) breakpoints -> AQI category upper bounds.
_PM25_BREAKS = [30, 60, 90, 120, 250]  # boundaries between the 6 bands


def band_for_aqi(aqi: float) -> Band:
    """Band a 0-500 National AQI index value."""
    cuts = [50, 100, 200, 300, 400]
    for i, cut in enumerate(cuts):
        if aqi <= cut:
            return BANDS[i]
    return BANDS[5]


def band_for_pm25(pm25: float) -> Band:
    for i, cut in enumerate(_PM25_BREAKS):
        if pm25 <= cut:
            return BANDS[i]
    return BANDS[5]


def pm25_to_aqi(pm25: float) -> float:
    """
    Convert PM2.5 ug/m3 to India National AQI sub-index via CPCB linear
    interpolation. Used so citizen/satellite-free sensor points still get a
    comparable 0-500 number for scoring and display.
    """
    # (conc_low, conc_high, aqi_low, aqi_high)
    table = [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 500, 401, 500),
    ]
    for c_lo, c_hi, a_lo, a_hi in table:
        if pm25 <= c_hi:
            return round(a_lo + (a_hi - a_lo) * (pm25 - c_lo) / (c_hi - c_lo), 1)
    return 500.0
