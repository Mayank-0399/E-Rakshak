// Road Hazard Intelligence Service
// Implements hazard reporting, proximity search, and community verification

import { db } from "../data/mockDatabase.js";

// Haversine formula to compute distance in km between two lat/lng pairs
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function isUserSubmittedHazard(hazard) {
  return Number(String(hazard.id).replace("haz_", "")) > 1000000000000;
}

function getBoundingBox({ lat, lng, radiusKm }) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(Number(lat) * Math.PI / 180));

  return {
    minLat: Number(lat) - latDelta,
    minLng: Number(lng) - lngDelta,
    maxLat: Number(lat) + latDelta,
    maxLng: Number(lng) + lngDelta
  };
}

function getFirstIncidentCoordinate(incident) {
  const coordinates = incident.geometry?.coordinates;

  if (!Array.isArray(coordinates)) return null;

  const first = Array.isArray(coordinates[0]?.[0]) ? coordinates[0][0] : coordinates[0];
  if (!Array.isArray(first) || first.length < 2) return null;

  return {
    lng: Number(first[0]),
    lat: Number(first[1])
  };
}

function mapTomTomCategory(iconCategory) {
  const categoryMap = {
    1: "accident",
    3: "road_hazard",
    6: "congestion",
    7: "lane_closure",
    8: "road_closure",
    9: "construction",
    11: "waterlogging",
    14: "vehicle_breakdown"
  };

  return categoryMap[Number(iconCategory)] || "traffic_incident";
}

function mapTomTomSeverity(magnitudeOfDelay) {
  const magnitude = Number(magnitudeOfDelay);

  if (magnitude >= 3) return "high";
  if (magnitude === 2) return "medium";
  return "low";
}

function normalizeTomTomIncident(incident) {
  const coordinate = getFirstIncidentCoordinate(incident);
  const properties = incident.properties || {};
  const event = properties.events?.[0] || {};
  const description = event.description || properties.from || "Live traffic incident reported by TomTom.";

  if (!coordinate) return null;

  return {
    id: `tomtom_${incident.id || `${coordinate.lat}_${coordinate.lng}_${properties.startTime || Date.now()}`}`,
    category: mapTomTomCategory(properties.iconCategory),
    title: description,
    description: [
      properties.from && properties.to ? `${properties.from} to ${properties.to}` : null,
      properties.roadNumbers?.length ? `Road: ${properties.roadNumbers.join(", ")}` : null,
      properties.delay ? `Delay: ${Math.round(Number(properties.delay) / 60)} min` : null
    ].filter(Boolean).join(" • ") || "Live traffic incident from TomTom Traffic API.",
    latitude: coordinate.lat,
    longitude: coordinate.lng,
    severity: mapTomTomSeverity(properties.magnitudeOfDelay),
    verification_status: "live_traffic_source",
    confidence: 0.9,
    reported_at: properties.lastReportTime || properties.startTime || new Date().toISOString(),
    expires_at: properties.endTime || new Date(Date.now() + 60 * 60000).toISOString(),
    upvotes: 0,
    source: "TomTom Traffic API"
  };
}

async function fetchTomTomTrafficHazards({ lat, lng, radiusKm = 10 }) {
  const apiKey = process.env.TOMTOM_API_KEY;

  if (!apiKey || apiKey.includes("paste_your") || lat === undefined || lng === undefined) {
    return [];
  }

  const bbox = getBoundingBox({ lat, lng, radiusKm });
  const fields = "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length,delay,roadNumbers,lastReportTime}}}";
  const params = new URLSearchParams({
    bbox: `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    fields,
    language: "en-GB",
    key: apiKey
  });

  const response = await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TomTom traffic incidents failed with ${response.status}: ${errorText.slice(0, 160)}`);
  }

  const data = await response.json();

  return (data.incidents || [])
    .map(normalizeTomTomIncident)
    .filter(Boolean);
}

async function fetchWeatherHazards({ lat, lng }) {
  if (lat === undefined || lng === undefined) return [];

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,precipitation,rain,showers,weather_code,wind_speed_10m",
    timezone: "auto"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo failed with status ${response.status}`);
  }

  const data = await response.json();
  const current = data.current || {};
  const precipitation = Number(current.precipitation || current.rain || current.showers || 0);
  const windSpeed = Number(current.wind_speed_10m || 0);
  const weatherCode = Number(current.weather_code || 0);
  const hazards = [];

  if (precipitation >= 2 || [95, 96, 99].includes(weatherCode)) {
    const severity = precipitation >= 10 || [96, 99].includes(weatherCode) ? "high" : "medium";
    hazards.push({
      id: `weather_water_${Date.now()}`,
      category: "waterlogging",
      title: severity === "high" ? "Live Heavy Rain / Waterlogging Risk" : "Live Rain / Slippery Road Risk",
      description: `Open-Meteo reports ${precipitation} mm precipitation now. Low-clearance EVs should avoid flooded underpasses and deep puddles.`,
      latitude: Number(lat),
      longitude: Number(lng),
      severity,
      verification_status: "live_weather_source",
      confidence: precipitation >= 10 ? 0.9 : 0.75,
      reported_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 60000).toISOString(),
      upvotes: 0,
      source: "Open-Meteo live weather"
    });
  }

  if (windSpeed >= 35) {
    hazards.push({
      id: `weather_wind_${Date.now()}`,
      category: "weather",
      title: "Live High Wind Advisory",
      description: `Open-Meteo reports wind speed around ${windSpeed} km/h. Light EVs and loaded e-rickshaws may be unstable on exposed roads.`,
      latitude: Number(lat),
      longitude: Number(lng),
      severity: windSpeed >= 50 ? "high" : "medium",
      verification_status: "live_weather_source",
      confidence: 0.8,
      reported_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60000).toISOString(),
      upvotes: 0,
      source: "Open-Meteo live weather"
    });
  }

  return hazards;
}

export class HazardService {
  /**
   * Get active hazards near a given coordinate
   */
  static getNearbyHazards({ lat, lng, radiusKm = 10, category } = {}) {
    const now = new Date();

    return db.hazards
      .filter(h => {
        if (!isUserSubmittedHazard(h)) return false;
        // Exclude expired
        if (h.expires_at && new Date(h.expires_at) < now) return false;
        if (category && category !== "all" && h.category !== category) return false;
        return true;
      })
      .map(h => {
        const dist = (lat !== undefined && lng !== undefined)
          ? haversineDistanceKm(lat, lng, h.latitude, h.longitude)
          : null;
        return {
          ...h,
          distance_from_query_km: dist
        };
      })
      .filter(h => h.distance_from_query_km === null || h.distance_from_query_km <= radiusKm)
      .sort((a, b) => {
        if (a.distance_from_query_km !== null && b.distance_from_query_km !== null) {
          return a.distance_from_query_km - b.distance_from_query_km;
        }
        return new Date(b.reported_at) - new Date(a.reported_at);
      });
  }

  static async getLiveNearbyHazards({ lat, lng, radiusKm = 10, category } = {}) {
    const communityHazards = this.getNearbyHazards({ lat, lng, radiusKm, category })
      .map(h => ({ ...h, source: "Community report" }));
    let weatherHazards = [];
    let trafficHazards = [];

    try {
      weatherHazards = await fetchWeatherHazards({ lat, lng });
    } catch (error) {
      console.warn("Live weather hazard source unavailable:", error.message);
    }

    try {
      trafficHazards = await fetchTomTomTrafficHazards({ lat, lng, radiusKm });
    } catch (error) {
      console.warn("Live traffic hazard source unavailable:", error.message);
    }

    const liveHazards = [...trafficHazards, ...weatherHazards].filter(h => {
      if (category && category !== "all" && h.category !== category) return false;
      return true;
    });

    return [...liveHazards, ...communityHazards].sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });
  }

  /**
   * Submit a new hazard report
   */
  static createHazardReport({ category, title, description, latitude, longitude, severity = "medium" }) {
    if (!category || !latitude || !longitude) {
      throw new Error("Category, latitude, and longitude are required");
    }

    const newHazard = {
      id: `haz_${Date.now()}`,
      category,
      title: title || `${category.replace('_', ' ').toUpperCase()} on Route`,
      description: description || "User reported road hazard",
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      severity,
      verification_status: "community_submitted",
      confidence: 0.70,
      reported_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 12 * 3600000).toISOString(), // 12-hour default expiry
      upvotes: 1,
      source: "Community report"
    };

    db.hazards.unshift(newHazard);
    return newHazard;
  }

  /**
   * Upvote/confirm a hazard report
   */
  static upvoteHazard(hazardId) {
    const hazard = db.hazards.find(h => h.id === hazardId);
    if (!hazard) return null;
    hazard.upvotes += 1;
    if (hazard.upvotes >= 3 && hazard.verification_status === "community_submitted") {
      hazard.verification_status = "community_confirmed";
      hazard.confidence = 0.85;
    }
    return hazard;
  }
}
