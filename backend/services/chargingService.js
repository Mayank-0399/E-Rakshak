// Charging Recommendation Service
// Implements compatibility filtering, reachability assessment, and multi-factor ranking

import { db } from "../data/mockDatabase.js";
import { RangeEstimationService } from "./rangeEstimationService.js";
import { RouteService } from "./routeService.js";

function calculateDistanceKm(a, b) {
  if (!a || !b) return null;

  const toRadians = degrees => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(Number(b.lat) - Number(a.lat));
  const dLng = toRadians(Number(b.lng) - Number(a.lng));
  const lat1 = toRadians(Number(a.lat));
  const lat2 = toRadians(Number(b.lat));

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function mapConnectionType(connectionTitle = "") {
  const title = connectionTitle.toLowerCase();

  if (title.includes("ccs")) return "CCS2";
  if (title.includes("type 2") || title.includes("type2") || title.includes("mennekes")) return "Type_2";
  if (title.includes("gb/t") || title.includes("gbt")) return "GB/T";
  if (title.includes("type d") || title.includes("domestic") || title.includes("bs1363")) return "15A_3pin";

  return "Type_2";
}

function normalizeOpenChargeMapStation(item) {
  const address = item.AddressInfo || {};
  const connections = item.Connections || [];
  const connectors = [...new Set(connections.map(conn => mapConnectionType(conn.ConnectionType?.Title)))];
  const powerValues = connections.map(conn => Number(conn.PowerKW || 0)).filter(Boolean);
  const maxPowerKw = powerValues.length ? Math.max(...powerValues) : 3.3;

  return {
    id: `ocm_${item.ID}`,
    name: address.Title || "EV Charging Station",
    operator: item.OperatorInfo?.Title || "Open Charge Map",
    latitude: Number(address.Latitude),
    longitude: Number(address.Longitude),
    distance_km: Number(address.Distance || 0),
    detour_km: 0,
    address: [
      address.AddressLine1,
      address.Town,
      address.StateOrProvince,
      address.Postcode
    ].filter(Boolean).join(", ") || "Address unavailable",
    supported_connectors: connectors.length ? connectors : ["Type_2"],
    compatible_vehicle_types: ["e_rickshaw", "e_scooter", "e_cycle", "other"],
    power_kw: maxPowerKw,
    tariff_inr_per_kwh: "Varies",
    availability_status: item.StatusType?.IsOperational === false ? "unknown" : "available",
    available_slots: Math.max(1, connections.length || 1),
    total_slots: Math.max(1, connections.length || 1),
    source: "Open Charge Map Live",
    last_verified_at: item.DateLastVerified || item.DateLastStatusUpdate || new Date().toISOString(),
    is_battery_swap: false,
    rating: item.UserComments?.length ? 4.2 : 4.0
  };
}

function mapTomTomConnector(connectorType = "") {
  const type = String(connectorType).toLowerCase();
  if (type.includes("ccs") || type.includes("combo")) return "CCS2";
  if (type.includes("type2") || type.includes("type 2") || type.includes("mennekes")) return "Type_2";
  if (type.includes("household") || type.includes("domestic") || type.includes("3pin") || type.includes("standard")) return "15A_3pin";
  if (type.includes("gb_t") || type.includes("gbt")) return "GB/T";
  if (type.includes("chademo")) return "CHAdeMO";
  return "15A_3pin";
}

function normalizeTomTomStation(item, originCoords) {
  const poi = item.poi || {};
  const addr = item.address || {};
  const pos = item.position || {};
  const lat = Number(pos.lat);
  const lng = Number(pos.lon);

  const rawConnectors = item.chargingPark?.connectors || [];
  const connectors = [...new Set(rawConnectors.map(c => mapTomTomConnector(c.connectorType)))];
  if (!connectors.length) {
    connectors.push("15A_3pin", "Type_2");
  }

  const powerValues = rawConnectors.map(c => Number(c.ratedPowerKW || 0)).filter(Boolean);
  const maxPowerKw = powerValues.length ? Math.max(...powerValues) : 22;

  const operatorName = poi.brands?.[0]?.name || poi.name || "EV Charging Network";
  const stationName = poi.name && poi.name.toLowerCase() !== "electric vehicle station"
    ? poi.name
    : `${operatorName} Hub - ${addr.municipalitySubdivision || addr.municipality || "City Hub"}`;

  const distKm = originCoords
    ? Math.round(calculateDistanceKm(originCoords, { lat, lng }) * 10) / 10
    : (item.dist ? Math.round((item.dist / 1000) * 10) / 10 : 2.5);

  const isSwap = operatorName.toLowerCase().includes("swap") ||
                 operatorName.toLowerCase().includes("sun mobility") ||
                 stationName.toLowerCase().includes("swap");

  return {
    id: `tt_${item.id || Math.random().toString(36).slice(2, 9)}`,
    name: stationName,
    operator: operatorName,
    latitude: lat,
    longitude: lng,
    distance_km: distKm,
    detour_km: Math.round((distKm * 0.15) * 10) / 10,
    address: addr.freeformAddress || `${addr.streetName || ""}, ${addr.municipality || ""}, India`.trim(),
    supported_connectors: isSwap ? ["Battery_Swap", ...connectors] : connectors,
    compatible_vehicle_types: ["e_rickshaw", "e_scooter", "e_cycle", "other"],
    power_kw: maxPowerKw,
    tariff_inr_per_kwh: Math.round((12 + (maxPowerKw > 25 ? 3.5 : 1.5)) * 10) / 10,
    availability_status: "available",
    available_slots: Math.floor(Math.random() * 3) + 2,
    total_slots: Math.floor(Math.random() * 2) + 4,
    source: "TomTom Live EV Network (India)",
    last_verified_at: new Date().toISOString(),
    is_battery_swap: isSwap,
    rating: Math.round((4.2 + (Math.random() * 0.7)) * 10) / 10
  };
}

async function fetchTomTomEVStations({ originCoords, radiusMeters = 35000 }) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey || !originCoords?.lat || !originCoords?.lng) return [];

  try {
    const url = `https://api.tomtom.com/search/2/categorySearch/EV%20Charging%20Station.json?lat=${originCoords.lat}&lon=${originCoords.lng}&radius=${radiusMeters}&limit=30&countrySet=IN&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`TomTom EV Search returned ${response.status}`);
      return [];
    }
    const data = await response.json();
    const results = data.results || [];
    return results
      .filter(item => item.position?.lat && item.position?.lon)
      .map(item => normalizeTomTomStation(item, originCoords));
  } catch (err) {
    console.warn("TomTom EV search error:", err.message);
    return [];
  }
}

// Global cache for dynamically discovered stations across India
const dynamicStationCache = new Map();

async function fetchOpenChargeMapStations({ originCoords, maxResults = 80, distanceKm = 50 }) {
  const apiKey = process.env.OPENCHARGEMAP_API_KEY;

  if (!apiKey || apiKey.includes("paste_your") || !originCoords) {
    return [];
  }

  const params = new URLSearchParams({
    output: "json",
    latitude: String(originCoords.lat),
    longitude: String(originCoords.lng),
    distance: String(distanceKm),
    distanceunit: "KM",
    maxresults: String(maxResults),
    compact: "true",
    verbose: "false",
    countrycode: "IN",
    key: apiKey
  });

  const response = await fetch(`https://api.openchargemap.io/v3/poi/?${params.toString()}`, {
    headers: {
      "User-Agent": "EV-Safety-Copilot-Hackathon/1.0"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Open Charge Map failed with ${response.status}: ${errorText.slice(0, 160)}`);
  }

  const data = await response.json();

  return data
    .filter(item => item.AddressInfo?.Latitude && item.AddressInfo?.Longitude)
    .map(normalizeOpenChargeMapStation);
}

async function fetchOpenChargeMapStationsWithRadiusFallback({ originCoords }) {
  for (const radiusKm of [50, 100, 200]) {
    const stations = await fetchOpenChargeMapStations({
      originCoords,
      distanceKm: radiusKm,
      maxResults: 80
    });

    if (stations.length > 0) {
      return stations;
    }
  }

  return [];
}

export class ChargingService {
  /**
   * Get all charging stations, optionally filtered by proximity or connector
   */
  static getNearbyStations({ connectorType, maxDistanceKm = 15, vehicleType } = {}) {
    let stations = [...db.chargingStations];

    if (connectorType && connectorType !== "all") {
      stations = stations.filter(s => s.supported_connectors.includes(connectorType));
    }

    if (vehicleType && vehicleType !== "all") {
      stations = stations.filter(s => 
        !s.compatible_vehicle_types || 
        s.compatible_vehicle_types.includes(vehicleType) || 
        s.compatible_vehicle_types.includes("other")
      );
    }

    if (maxDistanceKm) {
      stations = stations.filter(s => s.distance_km <= maxDistanceKm);
    }

    return stations.sort((a, b) => a.distance_km - b.distance_km);
  }

  /**
   * Evaluates reachability and ranks candidate charging stations for active vehicle
   */
  static async recommendStations({ vehicle, telemetry, destinationCoords, routeOriginCoords }) {
    const originCoords = routeOriginCoords || telemetry.location || { lat: 28.6139, lng: 77.2090 };
    let liveStations = [];

    // 1. First priority: Live TomTom Pan-India EV search (covers all Indian cities)
    try {
      liveStations = await fetchTomTomEVStations({ originCoords, radiusMeters: 40000 });
      if (liveStations.length === 0) {
        // Retry with larger radius for non-metro areas
        liveStations = await fetchTomTomEVStations({ originCoords, radiusMeters: 80000 });
      }
    } catch (ttErr) {
      console.warn("TomTom EV live search error:", ttErr.message);
    }

    // 2. Second priority: Open Charge Map (if API key configured)
    if (liveStations.length === 0) {
      try {
        liveStations = await fetchOpenChargeMapStationsWithRadiusFallback({ originCoords });
      } catch (error) {
        console.warn("Open Charge Map unavailable:", error.message);
      }
    }

    // 3. Fallback: Proximity-sorted internal Pan-India database
    let stationPool = [];
    if (liveStations.length > 0) {
      stationPool = liveStations;
    } else {
      // Find stations in internal database closest to originCoords
      stationPool = [...db.chargingStations]
        .map(s => {
          const dist = calculateDistanceKm(originCoords, { lat: s.latitude, lng: s.longitude });
          return { ...s, calculatedDist: dist };
        })
        .sort((a, b) => a.calculatedDist - b.calculatedDist)
        .slice(0, 10);
    }

    // Save all retrieved stations into the dynamic cache for instant route lookups
    stationPool.forEach(s => {
      dynamicStationCache.set(s.id, s);
    });

    const usableRangeEstimate = RangeEstimationService.estimateRange({
      batteryCapacityWh: vehicle.battery_capacity_wh,
      socPercent: telemetry.soc_percent,
      nominalEfficiencyWhPerKm: vehicle.nominal_efficiency_wh_per_km,
      loadCategory: telemetry.load_category,
      batteryTemperatureC: telemetry.battery_temperature_c
    });

    const currentUsableRangeKm = usableRangeEstimate.estimated_range_km;

    return stationPool.map(station => {
      const liveDistanceKm = calculateDistanceKm(originCoords, {
        lat: station.latitude,
        lng: station.longitude
      });
      const distanceKm = liveDistanceKm !== null
        ? Math.round(liveDistanceKm * 10) / 10
        : station.distance_km;
      const detourKm = Math.round(Math.max(0.2, distanceKm * 0.18) * 10) / 10;

      // 1. Compatibility check
      const hasDirectConnectorMatch = station.supported_connectors.some(conn =>
        vehicle.supported_connectors.includes(conn)
      );

      // Check vehicle class compatibility
      const vehicleCompatible = !station.compatible_vehicle_types || 
        station.compatible_vehicle_types.includes(vehicle.vehicle_type) ||
        station.compatible_vehicle_types.includes("other");

      const isCompatible = hasDirectConnectorMatch && vehicleCompatible;

      // 2. Reachability check (Is station distance within usable battery range with 15% safety margin?)
      const isReachable = currentUsableRangeKm >= (distanceKm * 1.15);
      const isTightReach = !isReachable && currentUsableRangeKm >= distanceKm;

      // 3. Score calculation for ranking
      // Factors: Reachability (50), Compatibility (30), Availability (15), Rating/Detour (5)
      let score = 0;
      if (isReachable) score += 50;
      else if (isTightReach) score += 20;

      if (isCompatible) score += 30;

      if (station.availability_status === "available") score += 15;
      else if (station.availability_status === "unknown") score += 5;

      // Penalty for larger detours
      score -= Math.min(15, distanceKm * 1.2);
      score -= Math.min(8, detourKm * 2);

      let reachabilityStatus = "reachable";
      if (!isReachable && !isTightReach) reachabilityStatus = "unreachable";
      else if (isTightReach) reachabilityStatus = "tight_margin";

      return {
        ...station,
        distance_km: distanceKm,
        detour_km: detourKm,
        is_compatible: isCompatible,
        compatibility_status: isCompatible ? "compatible" : "incompatible_connector",
        reachability_status: reachabilityStatus,
        is_reachable: isReachable,
        estimated_battery_at_arrival_percent: Math.max(0, Math.round(
          telemetry.soc_percent - ((distanceKm * (vehicle.nominal_efficiency_wh_per_km / vehicle.battery_capacity_wh)) * 100)
        )),
        recommendation_score: score
      };
    }).sort((a, b) => b.recommendation_score - a.recommendation_score);
  }

  /**
   * Calculates the shortest driving navigation route to a target charging station
   */
  static async getRouteToStation({ vehicle, telemetry, originCoords, stationId, stationCoords, stationObject }) {
    const origin = originCoords || telemetry.location || { lat: 28.6139, lng: 77.2090 };
    
    // Multi-tier station resolution:
    // 1. Direct stationObject from client
    // 2. Dynamic cache lookup (for TomTom live stations across India)
    // 3. Mock database lookup
    // 4. Synthesized station at provided stationCoords
    // 5. Geographically nearest station in database to the origin (NEVER default to Delhi if user is in Lucknow!)
    let station = stationObject 
      || (stationId ? dynamicStationCache.get(stationId) : null)
      || db.chargingStations.find(s => s.id === stationId);

    if (!station && stationCoords?.lat && stationCoords?.lng) {
      station = {
        id: stationId || "target_station",
        name: "EV Charging Hub",
        operator: "EV Charging Network",
        latitude: stationCoords.lat,
        longitude: stationCoords.lng,
        distance_km: calculateDistanceKm(origin, stationCoords) || 2.0,
        address: "Charging Station Location",
        supported_connectors: vehicle.supported_connectors || ["15A_3pin", "Type_2"],
        power_kw: 25,
        tariff_inr_per_kwh: 14.0,
        availability_status: "available",
        is_battery_swap: false
      };
    }

    if (!station) {
      // Find the station in db.chargingStations closest to the origin
      const sortedByDistance = [...db.chargingStations]
        .map(s => ({
          ...s,
          dist: calculateDistanceKm(origin, { lat: s.latitude, lng: s.longitude })
        }))
        .sort((a, b) => a.dist - b.dist);
      station = sortedByDistance[0] || db.chargingStations[0];
    }
    const destination = { lat: station.latitude, lng: station.longitude };

    let apiRoute = null;
    try {
      apiRoute = await RouteService.getDrivingRoute({
        origin,
        destination,
        routePreference: "shortest"
      });
    } catch (err) {
      console.warn("Driving route API unavailable for charging station, using fallback:", err.message);
    }

    const distanceKm = apiRoute?.distanceKm || Math.max(0.5, Math.round(calculateDistanceKm(origin, destination) * 1.35 * 10) / 10);
    const durationMins = apiRoute?.durationMins || Math.round((distanceKm / (vehicle.max_speed_kmh || 25)) * 60);

    // Range & Energy feasibility
    const rangeEstimate = RangeEstimationService.estimateRange({
      batteryCapacityWh: vehicle.battery_capacity_wh,
      socPercent: telemetry.soc_percent,
      nominalEfficiencyWhPerKm: vehicle.nominal_efficiency_wh_per_km,
      loadCategory: telemetry.load_category,
      batteryTemperatureC: telemetry.battery_temperature_c
    });

    const energyDemandWh = Math.round(distanceKm * rangeEstimate.adjusted_consumption_wh_per_km);
    const usableWh = rangeEstimate.usable_energy_wh;
    const safetyReserveWh = Math.round(usableWh * 0.15);
    const isReachable = usableWh >= (energyDemandWh + safetyReserveWh);
    const isTightReach = !isReachable && (usableWh >= energyDemandWh);
    const arrivalSoc = Math.max(0, Math.round(((usableWh - energyDemandWh) / vehicle.battery_capacity_wh) * 100));

    // Route coordinates for Leaflet
    let waypoints = apiRoute?.waypoints || [];
    if (!waypoints.length) {
      for (let i = 0; i <= 8; i++) {
        const frac = i / 8;
        waypoints.push([
          origin.lat + (destination.lat - origin.lat) * frac,
          origin.lng + (destination.lng - origin.lng) * frac
        ]);
      }
    }

    return {
      station,
      route_summary: {
        distance_km: distanceKm,
        duration_mins: durationMins,
        traffic_level: apiRoute?.trafficLevel || "moderate",
        delay_mins: apiRoute?.delayMins || 0,
        source: apiRoute?.source || "direct_path"
      },
      feasibility: {
        energy_demand_wh: energyDemandWh,
        usable_battery_wh: usableWh,
        safety_reserve_wh: safetyReserveWh,
        remaining_range_km: rangeEstimate.estimated_range_km,
        arrival_soc_percent: arrivalSoc,
        reachability_status: isReachable ? "reachable" : isTightReach ? "tight_margin" : "unreachable",
        is_reachable: isReachable
      },
      route_waypoints: waypoints
    };
  }
}
