/**
 * Trip planner battery estimation helpers.
 *
 * Usage:
 * 1. Get your route from your map/route API.
 * 2. Pass the route coordinates into getElevationProfile().
 * 3. Pass distance, elevation gain, load, and battery values into estimateTripBattery().
 *
 * Route coordinates may be either:
 * - [[lng, lat], [lng, lat]]
 * - [{ lat, lng }, { lat, lng }]
 */

const DEFAULT_ELEVATION_DATASET = "srtm90m";
const OPEN_TOPO_DATA_BASE_URL = "https://api.opentopodata.org/v1";

function normalizeCoordinate(point) {
  if (Array.isArray(point)) {
    return {
      lng: Number(point[0]),
      lat: Number(point[1])
    };
  }

  return {
    lat: Number(point.lat ?? point.latitude),
    lng: Number(point.lng ?? point.lon ?? point.longitude)
  };
}

function sampleCoordinates(coordinates, maxPoints = 90) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  if (coordinates.length <= maxPoints) {
    return coordinates.map(normalizeCoordinate);
  }

  const step = Math.ceil(coordinates.length / maxPoints);
  const sampled = coordinates.filter((_, index) => index % step === 0);
  const last = coordinates[coordinates.length - 1];

  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled.map(normalizeCoordinate);
}

export async function getElevationProfile(routeCoordinates, options = {}) {
  const dataset = options.dataset || DEFAULT_ELEVATION_DATASET;
  const maxPoints = options.maxPoints || 90;
  const sampledCoordinates = sampleCoordinates(routeCoordinates, maxPoints);

  if (sampledCoordinates.length === 0) {
    throw new Error("No route coordinates were provided for elevation lookup.");
  }

  const locations = sampledCoordinates
    .map(({ lat, lng }) => `${lat},${lng}`)
    .join("|");

  const url = `${OPEN_TOPO_DATA_BASE_URL}/${dataset}?locations=${encodeURIComponent(locations)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Elevation lookup failed with status ${response.status}.`);
  }

  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(data.error || "Elevation lookup failed.");
  }

  const points = data.results.map((result, index) => ({
    lat: sampledCoordinates[index].lat,
    lng: sampledCoordinates[index].lng,
    elevationM: Number(result.elevation || 0)
  }));

  return {
    points,
    totalElevationGainM: calculateElevationGain(points),
    totalElevationLossM: calculateElevationLoss(points)
  };
}

export function calculateElevationGain(points) {
  return points.reduce((gain, point, index) => {
    if (index === 0) return gain;

    const previousElevation = points[index - 1].elevationM;
    const difference = point.elevationM - previousElevation;

    return difference > 0 ? gain + difference : gain;
  }, 0);
}

export function calculateElevationLoss(points) {
  return points.reduce((loss, point, index) => {
    if (index === 0) return loss;

    const previousElevation = points[index - 1].elevationM;
    const difference = previousElevation - point.elevationM;

    return difference > 0 ? loss + difference : loss;
  }, 0);
}

export function estimateTripBattery({
  distanceKm,
  elevationGainM,
  vehicleWeightKg,
  loadKg,
  batteryCapacityKWh,
  currentBatteryPercent,
  baseConsumptionKWhPerKm,
  drivetrainEfficiency = 0.82,
  reservePercent = 15
}) {
  const totalMassKg = Number(vehicleWeightKg) + Number(loadKg || 0);
  const availableEnergyKWh =
    Number(batteryCapacityKWh) * (Number(currentBatteryPercent) / 100);

  const baseEnergyKWh = Number(distanceKm) * Number(baseConsumptionKWhPerKm);
  const climbingEnergyKWh =
    (totalMassKg * 9.81 * Number(elevationGainM || 0)) /
    3600000 /
    Number(drivetrainEfficiency);

  const totalEnergyNeededKWh = baseEnergyKWh + climbingEnergyKWh;
  const reserveEnergyKWh = Number(batteryCapacityKWh) * (Number(reservePercent) / 100);
  const projectedRemainingKWh = availableEnergyKWh - totalEnergyNeededKWh;
  const projectedRemainingPercent =
    (projectedRemainingKWh / Number(batteryCapacityKWh)) * 100;

  let rating = "Not Possible";

  if (projectedRemainingKWh >= reserveEnergyKWh) {
    rating = "Safe";
  } else if (projectedRemainingKWh >= 0) {
    rating = "Risky";
  }

  return {
    rating,
    availableEnergyKWh: round(availableEnergyKWh),
    baseEnergyKWh: round(baseEnergyKWh),
    climbingEnergyKWh: round(climbingEnergyKWh),
    totalEnergyNeededKWh: round(totalEnergyNeededKWh),
    projectedRemainingKWh: round(projectedRemainingKWh),
    projectedRemainingPercent: round(projectedRemainingPercent),
    reserveEnergyKWh: round(reserveEnergyKWh)
  };
}

export async function estimateRouteFeasibility({
  routeCoordinates,
  distanceKm,
  vehicleWeightKg,
  loadKg,
  batteryCapacityKWh,
  currentBatteryPercent,
  baseConsumptionKWhPerKm,
  drivetrainEfficiency,
  reservePercent
}) {
  const elevationProfile = await getElevationProfile(routeCoordinates);
  const battery = estimateTripBattery({
    distanceKm,
    elevationGainM: elevationProfile.totalElevationGainM,
    vehicleWeightKg,
    loadKg,
    batteryCapacityKWh,
    currentBatteryPercent,
    baseConsumptionKWhPerKm,
    drivetrainEfficiency,
    reservePercent
  });

  return {
    elevationProfile,
    battery
  };
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
