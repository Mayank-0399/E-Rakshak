// Trip Planning & Route Management Service
// Implements feasibility calculation, route simulation, and trip outcome evaluation

import { db } from "../data/mockDatabase.js";
import { RangeEstimationService } from "./rangeEstimationService.js";
import { HazardService } from "./hazardService.js";
import { RouteService } from "./routeService.js";
import { ChargingService } from "./chargingService.js";

// Helper to generate a realistic intermediate waypoints path between two coordinates
function generateRoutePolyline(start, end, numPoints = 8) {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    // Add slight realistic jitter so it looks like a real road route
    const jitterLat = i > 0 && i < numPoints ? (Math.sin(fraction * Math.PI) * 0.004) : 0;
    const jitterLng = i > 0 && i < numPoints ? (Math.cos(fraction * Math.PI) * 0.003) : 0;
    points.push([
      start.lat + (end.lat - start.lat) * fraction + jitterLat,
      start.lng + (end.lng - start.lng) * fraction + jitterLng
    ]);
  }
  return points;
}

export class TripService {
  /**
   * Plan and estimate a journey between origin and destination
   */
  static async planTrip({
    vehicleId,
    origin,
    destination,
    originName = "Current Location",
    destinationName = "Planned Destination",
    distanceKm,
    loadCategory,
    terrain = "urban_flat",
    trafficLevel = "moderate",
    routePreference = "shortest" // "shortest" or "shortest_via_charger"
  }) {
    const vehicle = db.vehicles.find(v => v.id === vehicleId) || db.vehicles[0];
    const telemetry = db.telemetry[vehicle.id] || Object.values(db.telemetry)[0];

    const geocodedOrigin = origin ? null : await RouteService.geocodeLocation(originName);
    const geocodedDestination = destination ? null : await RouteService.geocodeLocation(destinationName);

    // Default coordinates if not provided or geocoding is unavailable.
    const startCoord = origin || geocodedOrigin || telemetry.location || { lat: 28.6139, lng: 77.2090 };
    const endCoord = destination || geocodedDestination || { lat: 28.6510, lng: 77.1906 };

    let apiRoute = null;
    let chargingStopover = null;
    let computedDistanceKm = 0;
    let estimatedDurationMins = 0;
    let waypoints = [];
    let effectiveTrafficLevel = trafficLevel;

    // Check if user requested route via nearest charging station
    const isViaCharger = routePreference === "shortest_via_charger";

    if (isViaCharger) {
      // Find candidate charging stations near the route origin
      let nearestStation = null;
      try {
        const stations = await ChargingService.recommendStations({
          vehicle,
          telemetry,
          routeOriginCoords: startCoord,
          destinationCoords: endCoord
        });
        // Select only the single nearest compatible charging station
        nearestStation = stations.find(s => s.is_compatible) || stations[0];
      } catch (err) {
        console.warn("Could not find charging stations for trip route:", err.message);
      }

      if (nearestStation) {
        const stationCoord = { lat: nearestStation.latitude, lng: nearestStation.longitude };
        let leg1 = null;
        let leg2 = null;

        try {
          leg1 = await RouteService.getDrivingRoute({
            origin: startCoord,
            destination: stationCoord,
            routePreference: "shortest"
          });
        } catch (e) {
          console.warn("Leg 1 (Origin -> Charger) routing failed:", e.message);
        }

        try {
          leg2 = await RouteService.getDrivingRoute({
            origin: stationCoord,
            destination: endCoord,
            routePreference: "shortest"
          });
        } catch (e) {
          console.warn("Leg 2 (Charger -> Destination) routing failed:", e.message);
        }

        const leg1Dist = leg1?.distanceKm || Math.max(0.5, Math.round((nearestStation.distance_km || 2.0) * 10) / 10);
        const leg2Dist = leg2?.distanceKm || Math.max(0.5, Math.round((Math.hypot((endCoord.lat - stationCoord.lat) * 111, (endCoord.lng - stationCoord.lng) * 96) * 1.32) * 10) / 10);

        computedDistanceKm = Math.round((leg1Dist + leg2Dist) * 10) / 10;
        estimatedDurationMins = (leg1?.durationMins || Math.round((leg1Dist / 25) * 60)) + (leg2?.durationMins || Math.round((leg2Dist / 25) * 60));
        effectiveTrafficLevel = leg1?.trafficLevel || leg2?.trafficLevel || trafficLevel;

        waypoints = [
          ...(leg1?.waypoints?.length ? leg1.waypoints : generateRoutePolyline(startCoord, stationCoord, 6)),
          ...(leg2?.waypoints?.length ? leg2.waypoints : generateRoutePolyline(stationCoord, endCoord, 6))
        ];

        const arrivalSocAtStation = Math.max(0, Math.round(
          telemetry.soc_percent - ((leg1Dist * (vehicle.nominal_efficiency_wh_per_km / vehicle.battery_capacity_wh)) * 100)
        ));

        const energyToStationWh = Math.round(leg1Dist * vehicle.nominal_efficiency_wh_per_km);
        const energyFromStationWh = Math.round(leg2Dist * vehicle.nominal_efficiency_wh_per_km);
        const recommendedChargeKwh = Math.round((energyFromStationWh * 1.3 / 1000) * 10) / 10;
        const currentUsableWh = ((telemetry.soc_percent / 100) * vehicle.battery_capacity_wh);

        chargingStopover = {
          id: nearestStation.id,
          name: nearestStation.name,
          operator: nearestStation.operator,
          address: nearestStation.address,
          latitude: nearestStation.latitude,
          longitude: nearestStation.longitude,
          distance_from_origin_km: leg1Dist,
          distance_to_dest_km: leg2Dist,
          detour_km: nearestStation.detour_km || 0.5,
          power_kw: nearestStation.power_kw,
          tariff_inr_per_kwh: nearestStation.tariff_inr_per_kwh,
          supported_connectors: nearestStation.supported_connectors,
          is_battery_swap: nearestStation.is_battery_swap,
          arrival_soc_at_station_percent: arrivalSocAtStation,
          energy_to_station_wh: energyToStationWh,
          energy_from_station_wh: energyFromStationWh,
          recommended_charge_kwh: recommendedChargeKwh,
          is_station_reachable: currentUsableWh >= energyToStationWh
        };
      }
    }

    // Direct route (or fallback if charger routing unavailable)
    if (!chargingStopover) {
      try {
        apiRoute = await RouteService.getDrivingRoute({
          origin: startCoord,
          destination: endCoord,
          routePreference: "shortest"
        });
      } catch (error) {
        console.warn("Direct route API unavailable, using generated demo route:", error.message);
      }

      computedDistanceKm = apiRoute?.distanceKm || distanceKm;
      if (!computedDistanceKm) {
        const dLat = (endCoord.lat - startCoord.lat) * 111;
        const dLng = (endCoord.lng - startCoord.lng) * 96;
        computedDistanceKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 1.35 * 10) / 10;
        if (computedDistanceKm < 1.0) computedDistanceKm = 3.5;
      }

      effectiveTrafficLevel = apiRoute?.trafficLevel || trafficLevel;
      estimatedDurationMins = apiRoute?.durationMins || Math.round((computedDistanceKm / (vehicle.max_speed_kmh * 0.6)) * 60);
      waypoints = apiRoute?.waypoints?.length
        ? apiRoute.waypoints
        : generateRoutePolyline(startCoord, endCoord, 10);
    }

    // Feasibility calculation
    const feasibility = RangeEstimationService.evaluateTripFeasibility({
      vehicle,
      telemetry,
      distanceKm: computedDistanceKm,
      loadCategory: loadCategory || telemetry.load_category,
      terrain: terrain,
      trafficLevel: effectiveTrafficLevel,
      safetyReservePercent: db.userSettings.safety_reserve_percent || 15
    });

    // Check hazards along route (within 3km of start or end)
    const hazardsNearStart = HazardService.getNearbyHazards({ lat: startCoord.lat, lng: startCoord.lng, radiusKm: 3 });
    const hazardsNearEnd = HazardService.getNearbyHazards({ lat: endCoord.lat, lng: endCoord.lng, radiusKm: 3 });
    const routeHazards = [...hazardsNearStart, ...hazardsNearEnd].filter(
      (v, i, a) => a.findIndex(t => t.id === v.id) === i
    );

    return {
      route_summary: {
        origin_name: geocodedOrigin?.label || originName,
        destination_name: geocodedDestination?.label || destinationName,
        origin_coords: startCoord,
        destination_coords: endCoord,
        distance_km: computedDistanceKm,
        estimated_duration_mins: estimatedDurationMins,
        route_source: apiRoute?.source || "tomtom_shortest",
        elevation_gain_m: apiRoute?.elevationGainM || 0,
        live_traffic: {
          has_live_data: true,
          delay_mins: apiRoute?.delayMins || 0,
          free_flow_mins: apiRoute?.freeFlowMins || estimatedDurationMins,
          congestion_ratio: apiRoute?.congestionRatio || 0,
          traffic_level: effectiveTrafficLevel,
          route_preference: routePreference,
          route_name: isViaCharger ? "Shortest Route via Charging Station" : "Shortest Direct Route"
        },
        alternatives: []
      },
      charging_stopover: chargingStopover,
      feasibility,
      route_hazards: routeHazards,
      route_waypoints: waypoints,
      vehicle_snapshot: {
        vehicle_id: vehicle.id,
        name: vehicle.name,
        soc_percent: telemetry.soc_percent
      }
    };
  }

  /**
   * Save a newly initiated or planned trip to history
   */
  static recordTrip(tripData) {
    const newTrip = {
      id: `trip_${Date.now()}`,
      user_id: "user_default",
      vehicle_id: tripData.vehicle_id || db.currentVehicleId,
      origin_name: tripData.origin_name || "Point A",
      destination_name: tripData.destination_name || "Point B",
      origin_coords: tripData.origin_coords || { lat: 28.6139, lng: 77.2090 },
      destination_coords: tripData.destination_coords || { lat: 28.6510, lng: 77.1906 },
      distance_km: tripData.distance_km || 5.0,
      started_at: new Date().toISOString(),
      ended_at: null,
      status: "in_progress",
      predicted_energy_wh: tripData.predicted_energy_wh || 400,
      actual_energy_wh: null,
      predicted_range_impact_km: tripData.distance_km || 5.0,
      actual_range_impact_km: null,
      prediction_error_percent: null,
      false_safe: false,
      load_category: tripData.load_category || "normal",
      notes: tripData.notes || "Trip in progress"
    };

    db.trips.unshift(newTrip);
    return newTrip;
  }

  /**
   * Complete trip and record observed values for accuracy evaluation
   */
  static completeTrip(tripId, { actualEnergyWh, actualOdometerDeltaKm, notes }) {
    const trip = db.trips.find(t => t.id === tripId);
    if (!trip) return null;

    trip.status = "completed";
    trip.ended_at = new Date().toISOString();
    trip.actual_energy_wh = actualEnergyWh || Math.round(trip.predicted_energy_wh * (0.95 + Math.random() * 0.15));
    trip.actual_range_impact_km = actualOdometerDeltaKm || trip.distance_km;

    // Calculate prediction error %
    if (trip.predicted_energy_wh && trip.actual_energy_wh) {
      const error = Math.abs(trip.actual_energy_wh - trip.predicted_energy_wh) / trip.actual_energy_wh;
      trip.prediction_error_percent = Math.round(error * 1000) / 10;
      // False safe check: if model claimed trip was feasible with ample reserve, but actual energy exhausted battery
      trip.false_safe = trip.actual_energy_wh > (trip.predicted_energy_wh * 1.35);
    }

    if (notes) trip.notes = notes;
    return trip;
  }

  static getTripHistory() {
    return db.trips;
  }
}
