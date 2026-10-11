// API Service Client for EV Safety Copilot

const API_BASE = '/api/v1';

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard data');
  return res.json();
}

export async function fetchVehicles() {
  const res = await fetch(`${API_BASE}/vehicles`);
  if (!res.ok) throw new Error('Failed to fetch vehicles');
  return res.json();
}

export async function selectVehicle(vehicleId) {
  const res = await fetch(`${API_BASE}/vehicles/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicle_id: vehicleId })
  });
  if (!res.ok) throw new Error('Failed to select vehicle');
  return res.json();
}

export async function createVehicle(vehicleData) {
  const res = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicleData)
  });
  if (!res.ok) throw new Error('Failed to create vehicle');
  return res.json();
}

export async function updateTelemetry(telemetryData) {
  const res = await fetch(`${API_BASE}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(telemetryData)
  });
  if (!res.ok) throw new Error('Failed to update telemetry');
  return res.json();
}

export async function simulateScenario(scenario) {
  const res = await fetch(`${API_BASE}/telemetry/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario })
  });
  if (!res.ok) throw new Error('Failed to simulate scenario');
  return res.json();
}

export async function estimateTrip(tripParams) {
  const res = await fetch(`${API_BASE}/trips/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripParams)
  });
  if (!res.ok) throw new Error('Failed to estimate trip');
  return res.json();
}

// Curated popular EV corridors & landmarks for instant client suggestions
export const POPULAR_LOCATIONS = [
  {
    name: "Connaught Place",
    label: "Connaught Place Inner Circle, Central Delhi, New Delhi",
    category: "Commercial & EV Corridor",
    lat: 28.6310,
    lng: 77.2185,
    region: "Delhi"
  },
  {
    name: "Karol Bagh Market",
    label: "Karol Bagh Market, Central Delhi, New Delhi",
    category: "Commercial Hub",
    lat: 28.6510,
    lng: 77.1906,
    region: "Delhi"
  },
  {
    name: "Kashmere Gate ISBT",
    label: "Kashmere Gate Inter-State Bus Terminal, North Delhi",
    category: "Transit Interchange",
    lat: 28.6679,
    lng: 77.2280,
    region: "Delhi"
  },
  {
    name: "Noida Sector 18",
    label: "Noida Sector 18 Commercial Hub & Atta Market, Noida",
    category: "Commercial & EV Hub",
    lat: 28.5708,
    lng: 77.3260,
    region: "Uttar Pradesh"
  },
  {
    name: "Cyber Hub & DLF Cyber City",
    label: "DLF Cyber Hub, Sector 24, Gurugram, Haryana",
    category: "Corporate & EV Hub",
    lat: 28.4986,
    lng: 77.0878,
    region: "Haryana"
  },
  {
    name: "Dhaula Kuan Junction",
    label: "Dhaula Kuan Flyover & Metro Junction, South West Delhi",
    category: "Transit Corridor",
    lat: 28.5910,
    lng: 77.1610,
    region: "Delhi"
  },
  {
    name: "Saket Select Citywalk",
    label: "Select Citywalk Mall, Saket District Centre, New Delhi",
    category: "Shopping & EV Hub",
    lat: 28.5283,
    lng: 77.2195,
    region: "Delhi"
  },
  {
    name: "IGI Airport Terminal 3",
    label: "Indira Gandhi International Airport Terminal 3, New Delhi",
    category: "Airport & Transit Hub",
    lat: 28.5562,
    lng: 77.1000,
    region: "Delhi"
  },
  {
    name: "AIIMS New Delhi",
    label: "AIIMS New Delhi, Sri Aurobindo Marg, Ansari Nagar",
    category: "Hospital & Medical Hub",
    lat: 28.5672,
    lng: 77.2100,
    region: "Delhi"
  },
  {
    name: "India Gate",
    label: "India Gate & Kartavya Path, Central Delhi, New Delhi",
    category: "National Landmark",
    lat: 28.6129,
    lng: 77.2295,
    region: "Delhi"
  },
  {
    name: "Dwarka Sector 21",
    label: "Dwarka Sector 21 Metro Interchange, South West Delhi",
    category: "Transit Interchange",
    lat: 28.5522,
    lng: 77.0583,
    region: "Delhi"
  },
  {
    name: "Nehru Place Commercial Center",
    label: "Nehru Place Commercial Complex, South Delhi",
    category: "Tech & Electronics Hub",
    lat: 28.5494,
    lng: 77.2529,
    region: "Delhi"
  }
];

export async function searchLocations(text) {
  const query = String(text || '').trim();
  if (!query) {
    return { success: true, data: POPULAR_LOCATIONS.slice(0, 6) };
  }

  // 1. Try backend endpoint
  try {
    const params = new URLSearchParams({ text: query }).toString();
    const res = await fetch(`${API_BASE}/locations/search?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend location search unavailable, using client fallback:', err.message);
  }

  // 2. Client-side local curated match
  const qLower = query.toLowerCase();
  const localMatches = POPULAR_LOCATIONS.filter(l => 
    l.name.toLowerCase().includes(qLower) || 
    l.label.toLowerCase().includes(qLower) ||
    (l.category && l.category.toLowerCase().includes(qLower))
  );

  // 3. Client-side Photon OSM Autocomplete
  try {
    const photonParams = new URLSearchParams({
      q: query,
      limit: '6',
      lat: '28.6139',
      lon: '77.2090'
    });
    const photonRes = await fetch(`https://photon.komoot.io/api/?${photonParams.toString()}`);
    if (photonRes.ok) {
      const photonData = await photonRes.json();
      const osmResults = (photonData.features || [])
        .filter(f => f?.geometry?.coordinates)
        .map(f => {
          const [lng, lat] = f.geometry.coordinates;
          const p = f.properties || {};
          const subtitleParts = [p.street, p.city || p.county, p.state, p.country].filter(Boolean);
          return {
            lat: Number(lat),
            lng: Number(lng),
            name: p.name || query,
            label: [p.name, ...subtitleParts].filter(Boolean).join(', ') || query,
            region: p.state || p.city,
            country: p.country,
            category: p.type || p.osm_value || 'Location'
          };
        });

      // Combine local matches + OSM results deduplicated
      const combined = [...localMatches];
      const seen = new Set(localMatches.map(m => `${Number(m.lat).toFixed(3)},${Number(m.lng).toFixed(3)}`));
      osmResults.forEach(r => {
        const key = `${Number(r.lat).toFixed(3)},${Number(r.lng).toFixed(3)}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(r);
        }
      });

      if (combined.length > 0) {
        return { success: true, data: combined.slice(0, 6) };
      }
    }
  } catch (photonErr) {
    console.warn('Photon client fallback failed:', photonErr.message);
  }

  return { success: true, data: localMatches.slice(0, 6) };
}

export async function recordTrip(tripData) {
  const res = await fetch(`${API_BASE}/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripData)
  });
  if (!res.ok) throw new Error('Failed to record trip');
  return res.json();
}

export async function completeTrip(tripId, completionData) {
  const res = await fetch(`${API_BASE}/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(completionData)
  });
  if (!res.ok) throw new Error('Failed to complete trip');
  return res.json();
}

export async function fetchTrips() {
  const res = await fetch(`${API_BASE}/trips`);
  if (!res.ok) throw new Error('Failed to fetch trips');
  return res.json();
}

export async function fetchChargingStations(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/charging-stations/nearby?${query}`);
  if (!res.ok) throw new Error('Failed to fetch charging stations');
  return res.json();
}

export async function fetchChargingRecommendations(payload = {}) {
  const res = await fetch(`${API_BASE}/charging-stations/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to fetch charging recommendations');
  return res.json();
}

export async function fetchRouteToStation(payload = {}) {
  const res = await fetch(`${API_BASE}/charging-stations/route-to-charger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to fetch route to charging station');
  return res.json();
}

export async function fetchHazards(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/hazards/nearby?${query}`);
  if (!res.ok) throw new Error('Failed to fetch hazards');
  return res.json();
}

export async function reportHazard(hazardData) {
  const res = await fetch(`${API_BASE}/hazards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hazardData)
  });
  if (!res.ok) throw new Error('Failed to report hazard');
  return res.json();
}

export async function upvoteHazard(hazardId) {
  const res = await fetch(`${API_BASE}/hazards/${hazardId}/upvote`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to upvote hazard');
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function acknowledgeAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/ack`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

export async function submitAlertFeedback(alertId, feedbackData) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedbackData)
  });
  if (!res.ok) throw new Error('Failed to submit feedback');
  return res.json();
}

export async function fetchEmergency() {
  const res = await fetch(`${API_BASE}/emergency`);
  if (!res.ok) throw new Error('Failed to fetch emergency overview');
  return res.json();
}

export async function shareEmergencyLocation(payload = {}) {
  const res = await fetch(`${API_BASE}/emergency/location-share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to share emergency location');
  return res.json();
}

export async function triggerZeroBatterySos(payload = {}) {
  const res = await fetch(`${API_BASE}/emergency/zero-battery-sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to trigger zero-battery SOS');
  return res.json();
}

export async function addEmergencyContact(contact) {
  const res = await fetch(`${API_BASE}/emergency/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  if (!res.ok) throw new Error('Failed to add emergency contact');
  return res.json();
}

export async function removeEmergencyContact(contactId) {
  const res = await fetch(`${API_BASE}/emergency/contacts/${contactId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to remove emergency contact');
  return res.json();
}

export async function dismissSosAlert() {
  const res = await fetch(`${API_BASE}/emergency/dismiss-sos`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to dismiss SOS');
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function clearAccountData() {
  const res = await fetch(`${API_BASE}/account/data`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to clear data');
  return res.json();
}
