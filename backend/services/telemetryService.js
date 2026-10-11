// Telemetry Adapter & Simulation Service
// Implements telemetry ingestion, bounds validation, and live demo simulation

import { db } from "../data/mockDatabase.js";
import { EmergencyService } from "./emergencyService.js";

export class TelemetryService {
  static getTelemetry(vehicleId) {
    const vId = vehicleId || db.currentVehicleId;
    return db.telemetry[vId] || null;
  }

  /**
   * Ingest a telemetry sample (from sensor, BMS, manual input or simulation slider)
   */
  static updateTelemetry(vehicleId, updates) {
    const vId = vehicleId || db.currentVehicleId;
    const current = db.telemetry[vId] || {
      vehicle_id: vId,
      source_type: "manual",
      soc_percent: 50,
      battery_temperature_c: 30,
      voltage_v: 48,
      current_a: 10,
      odometer_km: 1000,
      speed_kmh: 0,
      load_category: "normal",
      quality_status: "good",
      recorded_at: new Date().toISOString()
    };

    // Sanitize and validate bounds
    const updated = {
      ...current,
      recorded_at: new Date().toISOString(),
      source_type: updates.source_type || current.source_type || "manual"
    };

    if (updates.soc_percent !== undefined) {
      updated.soc_percent = Math.max(0, Math.min(100, Number(updates.soc_percent)));
    }
    if (updates.battery_temperature_c !== undefined) {
      updated.battery_temperature_c = Math.max(-20, Math.min(95, Number(updates.battery_temperature_c)));
    }
    if (updates.voltage_v !== undefined) {
      updated.voltage_v = Math.max(0, Number(updates.voltage_v));
    }
    if (updates.current_a !== undefined) {
      updated.current_a = Number(updates.current_a);
    }
    if (updates.speed_kmh !== undefined) {
      updated.speed_kmh = Math.max(0, Number(updates.speed_kmh));
    }
    if (updates.load_category !== undefined) {
      updated.load_category = updates.load_category;
    }
    if (updates.quality_status !== undefined) {
      updated.quality_status = updates.quality_status;
    }
    if (updates.location !== undefined) {
      updated.location = { ...current.location, ...updates.location };
    }

    // Auto-trigger Emergency SOS when battery reaches 0% (Deep discharge cut-off)
    if (updated.soc_percent <= 0 && current.soc_percent > 0 && db.userSettings.auto_sos_on_zero_battery !== false) {
      const sosAlert = EmergencyService.triggerZeroBatterySos({
        vehicleId: vId,
        note: "Automated trigger: Battery reached 0% deep discharge cut-off"
      });
      updated.active_emergency_sos = sosAlert;
    }

    db.telemetry[vId] = updated;
    return updated;
  }

  /**
   * Reset or simulate a specific test scenario (e.g. Overheat, Low SoC, Overload, Zero Battery)
   */
  static simulateScenario(vehicleId, scenario) {
    const vId = vehicleId || db.currentVehicleId;
    switch (scenario) {
      case "zero_battery":
        return this.updateTelemetry(vId, {
          soc_percent: 0,
          voltage_v: 41.2,
          current_a: 0,
          speed_kmh: 0,
          battery_temperature_c: 32,
          quality_status: "battery_depleted",
          source_type: "simulated"
        });
      case "low_soc":
        return this.updateTelemetry(vId, {
          soc_percent: 8,
          battery_temperature_c: 33,
          source_type: "simulated"
        });
      case "overheat":
        return this.updateTelemetry(vId, {
          battery_temperature_c: 56.5,
          source_type: "simulated"
        });
      case "overloaded":
        return this.updateTelemetry(vId, {
          load_category: "overloaded",
          source_type: "simulated"
        });
      case "normal":
      default:
        return this.updateTelemetry(vId, {
          soc_percent: 68,
          battery_temperature_c: 34,
          load_category: "normal",
          source_type: "simulated"
        });
    }
  }
}

