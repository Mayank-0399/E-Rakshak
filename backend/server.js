import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { db } from "./data/mockDatabase.js";
import { RangeEstimationService } from "./services/rangeEstimationService.js";
import { ChargingService } from "./services/chargingService.js";
import { SafetyRulesService } from "./services/safetyRulesService.js";
import { HazardService } from "./services/hazardService.js";
import { TripService } from "./services/tripService.js";
import { TelemetryService } from "./services/telemetryService.js";
import { EmergencyService } from "./services/emergencyService.js";
import { RouteService } from "./services/routeService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// -----------------------------------------------------------------
// 1. DASHBOARD API
// -----------------------------------------------------------------
app.get("/api/v1/dashboard", (req, res) => {
  try {
    const vehicle = db.vehicles.find(v => v.id === db.currentVehicleId) || db.vehicles[0];
    const telemetry = db.telemetry[vehicle.id] || Object.values(db.telemetry)[0];

    const rangeEstimate = RangeEstimationService.estimateRange({
      batteryCapacityWh: vehicle.battery_capacity_wh,
      socPercent: telemetry.soc_percent,
      nominalEfficiencyWhPerKm: vehicle.nominal_efficiency_wh_per_km,
      loadCategory: telemetry.load_category,
      batteryTemperatureC: telemetry.battery_temperature_c,
      usableFraction: vehicle.manufacturer_limits?.recommended_usable_fraction || 0.90
    });

    const activeAlerts = SafetyRulesService.getActiveAlerts({ vehicle, telemetry });

    // Determine high-level system status: 'OK', 'Caution', 'Action recommended'
    let systemStatus = "OK";
    let systemStatusMessage = "All vehicle systems operating within safe limits.";

    const hasCritical = activeAlerts.some(a => a.severity === "critical" && !a.acknowledged);
    const hasHighOrCaution = activeAlerts.some(a => (a.severity === "high" || a.severity === "caution") && !a.acknowledged);

    if (hasCritical) {
      systemStatus = "Action recommended";
      systemStatusMessage = "Critical condition detected. Immediate safety action required.";
    } else if (hasHighOrCaution || telemetry.soc_percent < 20 || telemetry.battery_temperature_c > 45) {
      systemStatus = "Caution";
      systemStatusMessage = "Operating parameters require monitoring. Reduced reserve buffer.";
    }

    res.json({
      success: true,
      data: {
        system_status: systemStatus,
        status_message: systemStatusMessage,
        last_updated: telemetry.recorded_at,
        data_source: telemetry.source_type, // "live", "manual", "simulated", "bms"
        quality_status: telemetry.quality_status,
        vehicle: {
          id: vehicle.id,
          name: vehicle.name,
          make_model: vehicle.make_model,
          vehicle_type: vehicle.vehicle_type,
          battery_capacity_wh: vehicle.battery_capacity_wh,
          nominal_efficiency_wh_per_km: vehicle.nominal_efficiency_wh_per_km,
          supported_connectors: vehicle.supported_connectors
        },
        telemetry: {
          soc_percent: telemetry.soc_percent,
          battery_temperature_c: telemetry.battery_temperature_c,
          voltage_v: telemetry.voltage_v,
          current_a: telemetry.current_a,
          speed_kmh: telemetry.speed_kmh,
          odometer_km: telemetry.odometer_km,
          load_category: telemetry.load_category,
          location: telemetry.location
        },
        range_prediction: rangeEstimate,
        active_alerts: activeAlerts,
        alerts_count: {
          critical: activeAlerts.filter(a => a.severity === "critical").length,
          caution: activeAlerts.filter(a => a.severity === "caution" || a.severity === "high").length,
          total: activeAlerts.length
        }
      }
    });
  } catch (error) {
    console.error("Error in /api/v1/dashboard:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------
// 2. VEHICLE PROFILE APIS
// -----------------------------------------------------------------
app.get("/api/v1/vehicles", (req, res) => {
  res.json({
    success: true,
    data: {
      active_vehicle_id: db.currentVehicleId,
      vehicles: db.vehicles
    }
  });
});

app.post("/api/v1/vehicles/select", (req, res) => {
  const { vehicle_id } = req.body;
  const found = db.vehicles.find(v => v.id === vehicle_id);
  if (!found) {
    return res.status(404).json({ success: false, error: "Vehicle not found" });
  }
  db.currentVehicleId = vehicle_id;
  res.json({ success: true, message: `Switched active vehicle to ${found.name}`, data: found });
});

app.post("/api/v1/vehicles", (req, res) => {
  const { name, vehicle_type, battery_capacity_wh, nominal_efficiency_wh_per_km, supported_connectors } = req.body;
  const newVeh = {
    id: `veh_custom_${Date.now()}`,
    vehicle_type: vehicle_type || "e_scooter",
    name: name || "Custom EV",
    make_model: "Custom User Vehicle",
    battery_capacity_wh: Number(battery_capacity_wh) || 3000,
    nominal_efficiency_wh_per_km: Number(nominal_efficiency_wh_per_km) || 45,
    supported_connectors: supported_connectors || ["15A_3pin"],
    manufacturer_limits: {
      max_safe_temp_c: 48,
      critical_temp_c: 55,
      min_safe_soc_percent: 10,
      recommended_usable_fraction: 0.90
    },
    created_at: new Date().toISOString()
  };

  db.vehicles.push(newVeh);
  db.currentVehicleId = newVeh.id;
  db.telemetry[newVeh.id] = {
    vehicle_id: newVeh.id,
    recorded_at: new Date().toISOString(),
    source_type: "manual",
    soc_percent: 75,
    battery_temperature_c: 30,
    voltage_v: 48,
    current_a: 10,
    odometer_km: 100,
    speed_kmh: 0,
    load_category: "normal",
    quality_status: "good",
    location: { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi" }
  };

  res.status(201).json({ success: true, data: newVeh });
});

// -----------------------------------------------------------------
// 3. TELEMETRY & SIMULATOR APIS
// -----------------------------------------------------------------
app.post("/api/v1/telemetry", (req, res) => {
  try {
    const { vehicle_id, ...updates } = req.body;
    const vId = vehicle_id || db.currentVehicleId;
    const updated = TelemetryService.updateTelemetry(vId, updates);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/telemetry/simulate", (req, res) => {
  const { scenario, vehicle_id } = req.body; // "low_soc", "overheat", "overloaded", "normal"
  const vId = vehicle_id || db.currentVehicleId;
  const updated = TelemetryService.simulateScenario(vId, scenario);
  res.json({ success: true, scenario, data: updated });
});

// -----------------------------------------------------------------
// 4. RANGE PREDICTION & TRIP ESTIMATION
// -----------------------------------------------------------------
app.get("/api/v1/locations/search", async (req, res) => {
  try {
    const text = String(req.query.text || "");
    const locations = await RouteService.searchLocations(text, 6);
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error("Location search error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/range/predict", (req, res) => {
  try {
    const { vehicle_id, soc_percent, load_category, battery_temperature_c, terrain, traffic_level } = req.body;
    const vehicle = db.vehicles.find(v => v.id === (vehicle_id || db.currentVehicleId)) || db.vehicles[0];
    const telemetry = db.telemetry[vehicle.id];

    const prediction = RangeEstimationService.estimateRange({
      batteryCapacityWh: vehicle.battery_capacity_wh,
      socPercent: soc_percent !== undefined ? soc_percent : telemetry.soc_percent,
      nominalEfficiencyWhPerKm: vehicle.nominal_efficiency_wh_per_km,
      loadCategory: loadCategory || telemetry.load_category,
      batteryTemperatureC: battery_temperature_c !== undefined ? battery_temperature_c : telemetry.battery_temperature_c,
      terrain: terrain || "urban_flat",
      trafficLevel: traffic_level || "moderate",
      usableFraction: vehicle.manufacturer_limits?.recommended_usable_fraction || 0.90
    });

    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/trips/estimate", async (req, res) => {
  try {
    const {
      vehicle_id,
      origin,
      destination,
      origin_name,
      destination_name,
      distance_km,
      loadCategory,
      load_category,
      terrain,
      trafficLevel,
      traffic_level,
      route_preference,
      routePreference
    } = req.body;

    const result = await TripService.planTrip({
      vehicleId: vehicle_id || db.currentVehicleId,
      origin,
      destination,
      originName: origin_name,
      destinationName: destination_name,
      distanceKm: distance_km ? Number(distance_km) : undefined,
      loadCategory: loadCategory || load_category,
      terrain,
      trafficLevel: trafficLevel || traffic_level,
      routePreference: route_preference || routePreference || "shortest"
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Trip estimate error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/trips", (req, res) => {
  try {
    const recorded = TripService.recordTrip(req.body);
    res.status(201).json({ success: true, data: recorded });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.patch("/api/v1/trips/:trip_id", (req, res) => {
  const completed = TripService.completeTrip(req.params.trip_id, req.body);
  if (!completed) {
    return res.status(404).json({ success: false, error: "Trip not found" });
  }
  res.json({ success: true, data: completed });
});

app.get("/api/v1/trips", (req, res) => {
  res.json({ success: true, data: TripService.getTripHistory() });
});

// -----------------------------------------------------------------
// 5. CHARGING STATIONS & RECOMMENDATIONS
// -----------------------------------------------------------------
app.get("/api/v1/charging-stations/nearby", (req, res) => {
  const { connector, max_distance_km, vehicle_type } = req.query;
  const stations = ChargingService.getNearbyStations({
    connectorType: connector,
    maxDistanceKm: max_distance_km ? Number(max_distance_km) : undefined,
    vehicleType: vehicle_type
  });
  res.json({ success: true, data: stations });
});

app.post("/api/v1/charging-stations/recommend", async (req, res) => {
  try {
    const vehicle = db.vehicles.find(v => v.id === (req.body.vehicle_id || db.currentVehicleId)) || db.vehicles[0];
    const telemetry = db.telemetry[vehicle.id];
    const recommendations = await ChargingService.recommendStations({
      vehicle,
      telemetry,
      destinationCoords: req.body.destination_coords,
      routeOriginCoords: req.body.route_origin_coords
    });
    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/charging-stations/route-to-charger", async (req, res) => {
  try {
    const vehicle = db.vehicles.find(v => v.id === (req.body.vehicle_id || req.body.vehicleId || db.currentVehicleId)) || db.vehicles[0];
    const telemetry = db.telemetry[vehicle.id] || Object.values(db.telemetry)[0];
    const routeData = await ChargingService.getRouteToStation({
      vehicle,
      telemetry,
      originCoords: req.body.origin_coords || req.body.originCoords,
      stationId: req.body.station_id || req.body.stationId,
      stationCoords: req.body.station_coords || req.body.stationCoords,
      stationObject: req.body.station || req.body.stationObject
    });
    res.json({ success: true, data: routeData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------
// 6. ROAD HAZARD APIS
// -----------------------------------------------------------------
app.get("/api/v1/hazards/nearby", async (req, res) => {
  const { lat, lng, radius_km, category } = req.query;
  const vehicle = db.vehicles.find(v => v.id === db.currentVehicleId) || db.vehicles[0];
  const telemetry = db.telemetry[vehicle.id] || Object.values(db.telemetry)[0];
  const queryLat = lat ? Number(lat) : telemetry.location?.lat;
  const queryLng = lng ? Number(lng) : telemetry.location?.lng;
  const hazards = await HazardService.getLiveNearbyHazards({
    lat: queryLat,
    lng: queryLng,
    radiusKm: radius_km ? Number(radius_km) : 15,
    category
  });
  res.json({ success: true, data: hazards });
});

app.post("/api/v1/hazards", (req, res) => {
  try {
    const newHazard = HazardService.createHazardReport(req.body);
    res.status(201).json({ success: true, data: newHazard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/hazards/:id/upvote", (req, res) => {
  const updated = HazardService.upvoteHazard(req.params.id);
  if (!updated) {
    return res.status(404).json({ success: false, error: "Hazard not found" });
  }
  res.json({ success: true, data: updated });
});

// -----------------------------------------------------------------
// 7. SAFETY ALERTS & FEEDBACK APIS
// -----------------------------------------------------------------
app.get("/api/v1/alerts", async (req, res) => {
  const vehicle = db.vehicles.find(v => v.id === db.currentVehicleId) || db.vehicles[0];
  const telemetry = db.telemetry[vehicle.id];
  const { lat, lng, location_name } = req.query;
  const activeAlerts = SafetyRulesService.getActiveAlerts({ vehicle, telemetry });
  const queryLat = lat ? Number(lat) : telemetry.location?.lat;
  const queryLng = lng ? Number(lng) : telemetry.location?.lng;
  let locationAlerts = [];

  if (queryLat !== undefined && queryLng !== undefined) {
    const hazards = await HazardService.getLiveNearbyHazards({
      lat: queryLat,
      lng: queryLng,
      radiusKm: 25,
      category: "all"
    });

    locationAlerts = hazards.slice(0, 5).map(hazard => ({
      id: `location_${hazard.id}`,
      user_id: "user_default",
      vehicle_id: vehicle.id,
      alert_type: `location_${hazard.category}_${hazard.id}`,
      severity: hazard.severity === "high" ? "high" : hazard.severity === "medium" ? "caution" : "info",
      title: `Location Risk: ${hazard.title}`,
      message: `${hazard.description} Evaluated near ${location_name || telemetry.location?.address || "selected location"}.`,
      why_it_matters: "Road, traffic, and weather conditions can affect EV range, braking distance, water-ingress risk, and route safety.",
      recommended_action: hazard.category === "waterlogging"
        ? "Avoid flooded underpasses and deep puddles. Reroute before entering standing water."
        : "Review the map and choose a safer route or slower driving profile before proceeding.",
      trigger_source: hazard.source || hazard.verification_status || "Live location risk source",
      confidence: hazard.confidence >= 0.85 ? "high" : "moderate",
      requires_acknowledgement: false,
      acknowledged: false,
      created_at: hazard.reported_at || new Date().toISOString(),
      expires_at: hazard.expires_at || new Date(Date.now() + 60 * 60000).toISOString()
    }));
  }

  res.json({ success: true, data: [...locationAlerts, ...activeAlerts] });
});

app.patch("/api/v1/alerts/:alert_id/ack", (req, res) => {
  const acked = SafetyRulesService.acknowledgeAlert(req.params.alert_id);
  if (!acked) {
    return res.status(404).json({ success: false, error: "Alert not found" });
  }
  res.json({ success: true, data: acked });
});

app.post("/api/v1/alerts/:alert_id/feedback", (req, res) => {
  const feedback = SafetyRulesService.submitFeedback(req.params.alert_id, req.body);
  if (!feedback) {
    return res.status(404).json({ success: false, error: "Alert not found" });
  }
  res.json({ success: true, data: feedback });
});

// -----------------------------------------------------------------
// 8. EMERGENCY ASSISTANCE & LOCATION SHARING
// -----------------------------------------------------------------
app.get("/api/v1/emergency", (req, res) => {
  const overview = EmergencyService.getEmergencyOverview(db.currentVehicleId);
  res.json({ success: true, data: overview });
});

app.post("/api/v1/emergency/location-share", (req, res) => {
  try {
    const result = EmergencyService.triggerLocationShare(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/emergency/zero-battery-sos", (req, res) => {
  try {
    const { vehicle_id, note } = req.body;
    const result = EmergencyService.triggerZeroBatterySos({
      vehicleId: vehicle_id || db.currentVehicleId,
      note
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/emergency/contacts", (req, res) => {
  try {
    const contact = EmergencyService.addEmergencyContact(req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.delete("/api/v1/emergency/contacts/:id", (req, res) => {
  try {
    const deleted = EmergencyService.removeEmergencyContact(req.params.id);
    res.json({ success: deleted });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/v1/emergency/dismiss-sos", (req, res) => {
  try {
    const dismissed = EmergencyService.dismissActiveSos();
    res.json({ success: true, data: dismissed });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------
// 9. SETTINGS & PRIVACY CONTROLS
// -----------------------------------------------------------------
app.get("/api/v1/settings", (req, res) => {
  res.json({ success: true, data: db.userSettings });
});

app.patch("/api/v1/settings", (req, res) => {
  db.userSettings = { ...db.userSettings, ...req.body };
  res.json({ success: true, data: db.userSettings });
});

app.delete("/api/v1/account/data", (req, res) => {
  // Clear trips and reset settings
  db.trips = [];
  db.userSettings.privacy.last_cleaned_at = new Date().toISOString();
  res.json({
    success: true,
    message: "Personal location history and recorded trips have been wiped per privacy policy."
  });
});

const distPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(distPath));

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", service: "E-Rakshak Backend", timestamp: new Date().toISOString() });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`⚡ E-Rakshak Backend listening on port ${PORT}`);
});
