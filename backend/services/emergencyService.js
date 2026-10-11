// Emergency Assistance & Location Sharing Service
// Implements SOS broadcast payload, nearby recovery points, and verified battery guidance

import { db } from "../data/mockDatabase.js";

export class EmergencyService {
  /**
   * Generates emergency assistance package
   */
  static getEmergencyOverview(vehicleId) {
    const vId = vehicleId || db.currentVehicleId;
    const vehicle = db.vehicles.find(v => v.id === vId) || db.vehicles[0];
    const telemetry = db.telemetry[vId] || Object.values(db.telemetry)[0];
    const userSettings = db.userSettings;

    // Nearby assistance providers (mechanics, EV repair, battery assistance)
    const nearbyAssistance = [
      {
        id: "ast_1",
        name: "Connaught EV Quick Fix & Puncture Repair",
        type: "roadside_repair",
        phone: "+91 98991 22334",
        distance_km: 0.9,
        address: "Middle Circle near Regal Cinema, CP",
        services: ["15A Emergency Plug", "Tyre Inflation", "48V Fuse Replacement"]
      },
      {
        id: "ast_2",
        name: "Sun Mobility Swap Hub (Emergency Battery)",
        type: "battery_swap",
        phone: "+91 1800 200 4455",
        distance_km: 3.2,
        address: "Ajmeri Gate Terminal",
        services: ["Quick Battery Swap", "Diagnostics"]
      },
      {
        id: "ast_3",
        name: "Delhi EV Helpline & Flatbed Towing",
        type: "towing",
        phone: "1073 / +91 11 2345 6789",
        distance_km: 4.5,
        address: "Central Delhi Operations Base",
        services: ["24/7 EV Flatbed Towing", "Traffic Assistance"]
      }
    ];

    // Verified safety protocols based on vehicle & manufacturer limits
    const manufacturerProtocols = [
      {
        issue: "Battery Overheating / White Smoke / Hissing",
        steps: [
          "1. Immediately turn off ignition and dismount to a safe distance (minimum 10 meters).",
          "2. Do NOT use water on active electrical fire; use Class D or ABC Dry Powder if trained.",
          "3. Call Emergency Services (112) and alert nearby pedestrians."
        ]
      },
      {
        issue: "Deep Discharge / Vehicle Stalled in Traffic",
        steps: [
          "1. Turn on hazard flashers and push vehicle safely to the road shoulder.",
          "2. Turn off key ignition to preserve 12V auxiliary system.",
          "3. Connect to a standard 15A wall outlet or request a tow to nearest charging station."
        ]
      },
      {
        issue: "Waterlogged Road Crossing",
        steps: [
          "1. If standing water exceeds hub level (> 200mm), DO NOT attempt crossing.",
          "2. If submerged and stalled, switch off master MCB isolator switch under seat before pushing out."
        ]
      }
    ];

    return {
      current_location: telemetry.location || { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi" },
      vehicle_summary: {
        id: vehicle.id,
        name: vehicle.name,
        soc_percent: telemetry.soc_percent,
        temp_c: telemetry.battery_temperature_c
      },
      trusted_contact: userSettings.emergency_contact,
      friends_and_family: userSettings.emergency_contacts || [],
      auto_sos_on_zero_battery: userSettings.auto_sos_on_zero_battery !== false,
      active_sos_alert: db.active_sos_alert || null,
      sos_history: db.sos_history || [],
      nearby_assistance: nearbyAssistance,
      manufacturer_protocols: manufacturerProtocols
    };
  }

  /**
   * Generates location sharing dispatch text / link for trusted contact
   */
  static triggerLocationShare({ recipientPhone, messageNote }) {
    const telemetry = db.telemetry[db.currentVehicleId];
    const vehicle = db.vehicles.find(v => v.id === db.currentVehicleId);
    const loc = telemetry.location || { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi" };

    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    const message = `🚨 [E-Rakshak SOS Alert]\n` +
      `I am requesting assistance with my ${vehicle?.name || "EV"}.\n` +
      `Battery SoC: ${telemetry.soc_percent}%, Temp: ${telemetry.battery_temperature_c}°C.\n` +
      `Current Location: ${loc.address || ""}\n` +
      `Map Coordinates: ${mapsUrl}\n` +
      `${messageNote ? `Note: "${messageNote}"\n` : ""}` +
      `Sent via E-Rakshak app.`;

    const encodedMessage = encodeURIComponent(message);
    const targetPhone = recipientPhone || db.userSettings.emergency_contact?.phone || "";
    const cleanPhone = targetPhone.replace(/[^0-9]/g, "");

    const whatsappShareUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    const smsShareUrl = `sms:${cleanPhone}?body=${encodedMessage}`;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      location: loc,
      dispatched_to: targetPhone,
      message_text: message,
      links: {
        whatsapp: whatsappShareUrl,
        sms: smsShareUrl,
        maps: mapsUrl
      }
    };
  }

  /**
   * Automatically triggered when battery reaches 0% (Deep Discharge Stalled)
   * Dispatches emergency alerts to all Friends & Family contacts
   */
  static triggerZeroBatterySos({ vehicleId, note = "" }) {
    const vId = vehicleId || db.currentVehicleId;
    const vehicle = db.vehicles.find(v => v.id === vId) || db.vehicles[0];
    const telemetry = db.telemetry[vId] || Object.values(db.telemetry)[0];
    const userSettings = db.userSettings;
    const loc = telemetry.location || { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi" };

    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    const contacts = (userSettings.emergency_contacts || []).filter(c => c.notify_on_zero_battery !== false);

    const messageText = `🚨 [CRITICAL EV SOS: BATTERY EXHAUSTED TO 0%]\n\n` +
      `Driver: ${userSettings.display_name} (${userSettings.phone_number})\n` +
      `Vehicle: ${vehicle.name} (Reg/ID: ${vehicle.id})\n` +
      `Status: IMMOBILIZED / STRANDED ON ROAD (0% Battery Depleted)\n` +
      `Battery Voltage: ${telemetry.voltage_v || 41.2}V • Temp: ${telemetry.battery_temperature_c}°C\n` +
      `Live Location: ${loc.address || "Live GPS Location"}\n` +
      `Map Coordinates: ${mapsUrl}\n` +
      `${note ? `Note: "${note}"\n` : ""}\n` +
      `⚠️ ACTION NEEDED: Vehicle cannot be driven. Please arrange roadside battery swap or emergency tow to driver's location immediately.`;

    const encoded = encodeURIComponent(messageText);

    const recipientDispatches = contacts.map(contact => {
      const cleanPhone = (contact.phone || "").replace(/[^0-9]/g, "");
      return {
        contact_id: contact.id,
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone,
        status: "dispatched",
        whatsapp_url: `https://wa.me/${cleanPhone}?text=${encoded}`,
        sms_url: `sms:${cleanPhone}?body=${encoded}`,
        call_url: `tel:${cleanPhone}`
      };
    });

    const sosAlert = {
      id: `sos_${Date.now()}`,
      alert_type: "zero_battery_exhaustion",
      severity: "critical",
      title: "Battery Reached 0% — Vehicle Stalled",
      timestamp: new Date().toISOString(),
      location: loc,
      telemetry_snapshot: {
        soc_percent: 0,
        voltage_v: telemetry.voltage_v || 41.2,
        battery_temperature_c: telemetry.battery_temperature_c,
        speed_kmh: 0
      },
      message_text: messageText,
      maps_url: mapsUrl,
      recipients: recipientDispatches,
      status: "active"
    };

    db.active_sos_alert = sosAlert;
    db.sos_history.unshift(sosAlert);
    if (db.sos_history.length > 20) db.sos_history.pop();

    console.log(`🚨 [AUTO-SOS] Dispatched 0% Battery Exhaustion SOS Signal to ${contacts.length} Friends & Family contacts!`);
    return sosAlert;
  }

  /**
   * Add a new friend/family emergency contact
   */
  static addEmergencyContact({ name, relationship, phone, notify_on_zero_battery = true }) {
    if (!name || !phone) throw new Error("Name and phone number are required");
    const newContact = {
      id: `ec_${Date.now()}`,
      name: name.trim(),
      relationship: relationship ? relationship.trim() : "Family / Friend",
      phone: phone.trim(),
      notify_on_zero_battery: Boolean(notify_on_zero_battery)
    };
    if (!db.userSettings.emergency_contacts) {
      db.userSettings.emergency_contacts = [];
    }
    db.userSettings.emergency_contacts.push(newContact);
    return newContact;
  }

  /**
   * Remove an emergency contact
   */
  static removeEmergencyContact(contactId) {
    if (!db.userSettings.emergency_contacts) return false;
    db.userSettings.emergency_contacts = db.userSettings.emergency_contacts.filter(c => c.id !== contactId);
    return true;
  }

  /**
   * Dismiss/resolve current active SOS
   */
  static dismissActiveSos() {
    if (db.active_sos_alert) {
      db.active_sos_alert.status = "resolved";
      db.active_sos_alert.resolved_at = new Date().toISOString();
      const resolved = db.active_sos_alert;
      db.active_sos_alert = null;
      return resolved;
    }
    return null;
  }
}

