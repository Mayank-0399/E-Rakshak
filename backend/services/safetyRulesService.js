// Deterministic Safety Rules Engine
// Implements explicit rules separate from LLM/speculative output as required by architecture.md Section 11

import { db } from "../data/mockDatabase.js";

export class SafetyRulesService {
  /**
   * Evaluates current vehicle state and telemetry against deterministic rules
   */
  static evaluateRules({ vehicle, telemetry }) {
    const alerts = [];
    const now = new Date();

    if (!vehicle || !telemetry) return alerts;

    // Rule 1: Battery Critical SoC
    if (telemetry.soc_percent !== null && telemetry.soc_percent !== undefined) {
      if (telemetry.soc_percent <= 10) {
        alerts.push({
          id: `rule_soc_crit_${Date.now()}`,
          user_id: "user_default",
          vehicle_id: vehicle.id,
          alert_type: "critical_low_battery",
          severity: "critical",
          title: "Critical Low Battery: Impending Cut-off",
          message: `Battery level is at ${telemetry.soc_percent}%. Immediate risk of BMS low-voltage shutoff and stranding.`,
          why_it_matters: "Deep discharge below 10% causes irreversible cell degradation and sudden power loss in traffic.",
          recommended_action: "Pull over safely or immediately head to the nearest verified 15A charging point or swap station.",
          trigger_source: "BMS / Telemetry Sensor (Deterministic Rule)",
          confidence: "verified",
          requires_acknowledgement: true,
          acknowledged: false,
          created_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 60 * 60000).toISOString()
        });
      } else if (telemetry.soc_percent <= 20) {
        alerts.push({
          id: `rule_soc_caution_${Date.now()}`,
          user_id: "user_default",
          vehicle_id: vehicle.id,
          alert_type: "low_battery_caution",
          severity: "caution",
          title: "Low Battery Reserve",
          message: `Battery level is at ${telemetry.soc_percent}%. Usable range buffer is limited.`,
          why_it_matters: "High acceleration or uphill grades will drain remaining energy faster than expected.",
          recommended_action: "Avoid heavy load, switch to Eco throttle, and locate a charging station.",
          trigger_source: "Telemetry SoC Monitor",
          confidence: "verified",
          requires_acknowledgement: false,
          acknowledged: false,
          created_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 90 * 60000).toISOString()
        });
      }
    }

    // Rule 2: Thermal Management & Overheating
    const maxSafeTemp = vehicle.manufacturer_limits?.max_safe_temp_c || 48;
    const critTemp = vehicle.manufacturer_limits?.critical_temp_c || 55;

    if (telemetry.battery_temperature_c !== null && telemetry.battery_temperature_c !== undefined) {
      if (telemetry.battery_temperature_c >= critTemp) {
        alerts.push({
          id: `rule_temp_crit_${Date.now()}`,
          user_id: "user_default",
          vehicle_id: vehicle.id,
          alert_type: "battery_thermal_critical",
          severity: "critical",
          title: "Critical Battery Overheat: Thermal Runaway Risk",
          message: `Pack temperature reached ${telemetry.battery_temperature_c}°C (exceeds critical threshold of ${critTemp}°C).`,
          why_it_matters: "Extreme cell temperatures can cause separator degradation, short circuits, or thermal runaway.",
          recommended_action: "Park in shaded area immediately, turn off vehicle master isolator switch, and allow pack to cool for at least 30 minutes. Do not plug in charging cable.",
          trigger_source: "Verified Temperature Sensor",
          confidence: "verified",
          requires_acknowledgement: true,
          acknowledged: false,
          created_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 120 * 60000).toISOString()
        });
      } else if (telemetry.battery_temperature_c >= maxSafeTemp) {
        alerts.push({
          id: `rule_temp_caution_${Date.now()}`,
          user_id: "user_default",
          vehicle_id: vehicle.id,
          alert_type: "battery_thermal_caution",
          severity: "caution",
          title: "Elevated Battery Pack Temperature",
          message: `Pack temperature is ${telemetry.battery_temperature_c}°C (normal operating range is 20°C - ${maxSafeTemp}°C).`,
          why_it_matters: "Sustained high temperatures reduce efficiency and degrade overall cycle life.",
          recommended_action: "Reduce cruising speed, avoid full-throttle acceleration, and avoid fast charging immediately after heavy drive.",
          trigger_source: "Verified Temperature Sensor",
          confidence: "verified",
          requires_acknowledgement: false,
          acknowledged: false,
          created_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 60 * 60000).toISOString()
        });
      }
    }

    // Rule 3: Vehicle Load & Payload Limits
    if (telemetry.load_category === "overloaded") {
      alerts.push({
        id: `rule_load_over_${Date.now()}`,
        user_id: "user_default",
        vehicle_id: vehicle.id,
        alert_type: "payload_overload",
        severity: "caution",
        title: "Payload Exceeds Recommended Limit",
        message: `Current load category is marked 'Overloaded' (recommended vehicle payload: ${vehicle.max_payload_kg} kg).`,
        why_it_matters: "Excessive weight increases motor current draw by ~55%, increases braking distance, and causes tire overheating.",
        recommended_action: "Reduce cargo or passenger count to preserve brake safety and prevent motor thermal tripping.",
        trigger_source: "Driver Entry / Load Inference",
        confidence: "moderate",
        requires_acknowledgement: false,
        acknowledged: false,
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 180 * 60000).toISOString()
      });
    }

    // Rule 4: Stale Data Warning
    if (telemetry.recorded_at) {
      const recordedTime = new Date(telemetry.recorded_at).getTime();
      const ageMinutes = (now.getTime() - recordedTime) / 60000;
      if (ageMinutes > 30) {
        alerts.push({
          id: `rule_stale_data_${Date.now()}`,
          user_id: "user_default",
          vehicle_id: vehicle.id,
          alert_type: "stale_telemetry",
          severity: "info",
          title: "Stale Telemetry Data",
          message: `Last telemetry update was received ${Math.round(ageMinutes)} minutes ago.`,
          why_it_matters: "Predictions and range calculations may not reflect true battery state.",
          recommended_action: "Ensure phone Bluetooth/GPS connection is active or refresh manual battery input.",
          trigger_source: "Data Provenance Guard",
          confidence: "high",
          requires_acknowledgement: false,
          acknowledged: false,
          created_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 60 * 60000).toISOString()
        });
      }
    }

    return alerts;
  }

  /**
   * Combines database active alerts with newly evaluated rules (deduplicating by type)
   */
  static getActiveAlerts({ vehicle, telemetry }) {
    const dynamicallyEvaluated = this.evaluateRules({ vehicle, telemetry });
    
    // Existing persistent alerts from DB that haven't expired
    const activeDbAlerts = db.alerts.filter(a => {
      const notExpired = !a.expires_at || new Date(a.expires_at) > new Date();
      return notExpired;
    });

    const alertMap = new Map();
    // Add DB alerts first
    activeDbAlerts.forEach(a => alertMap.set(a.alert_type, a));
    // Dynamic alerts take precedence if active
    dynamicallyEvaluated.forEach(a => alertMap.set(a.alert_type, a));

    return Array.from(alertMap.values()).sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, caution: 2, info: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });
  }

  static acknowledgeAlert(alertId) {
    const alert = db.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledged_at = new Date().toISOString();
      return alert;
    }
    return null;
  }

  static submitFeedback(alertId, { rating, feedbackText }) {
    const alert = db.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.feedback = {
        rating,
        feedback_text: feedbackText,
        submitted_at: new Date().toISOString()
      };
      return alert;
    }
    return null;
  }
}

