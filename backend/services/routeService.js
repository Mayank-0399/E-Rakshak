const OPEN_ROUTE_SERVICE_URL =
  "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const OPEN_ROUTE_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search";
const OSRM_ROUTING_URL = "https://router.project-osrm.org/route/v1/driving";
const PHOTON_GEOCODE_URL = "https://photon.komoot.io/api/";
const NOMINATIM_GEOCODE_URL = "https://nominatim.openstreetmap.org/search";

// High-accuracy curated database of Delhi-NCR & Indian transit/EV hubs
export const CURATED_LOCATIONS = [
  {
    name: "Connaught Place",
    label: "Connaught Place Inner Circle, Central Delhi, New Delhi",
    category: "Commercial & EV Corridor",
    lat: 28.6310,
    lng: 77.2185,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Karol Bagh Market",
    label: "Karol Bagh Market, Central Delhi, New Delhi",
    category: "Commercial Hub",
    lat: 28.6510,
    lng: 77.1906,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Kashmere Gate ISBT",
    label: "Kashmere Gate Inter-State Bus Terminal, North Delhi",
    category: "Transit Interchange",
    lat: 28.6679,
    lng: 77.2280,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Noida Sector 18",
    label: "Noida Sector 18 Commercial Hub & Atta Market, Noida",
    category: "Commercial & EV Hub",
    lat: 28.5708,
    lng: 77.3260,
    region: "Uttar Pradesh",
    country: "India"
  },
  {
    name: "Noida Electronic City (Sector 62)",
    label: "Noida Electronic City, Sector 62, Noida, Uttar Pradesh",
    category: "Tech & Corporate Park",
    lat: 28.6280,
    lng: 77.3735,
    region: "Uttar Pradesh",
    country: "India"
  },
  {
    name: "Cyber Hub & DLF Cyber City",
    label: "DLF Cyber Hub, Sector 24, Gurugram, Haryana",
    category: "Corporate & EV Hub",
    lat: 28.4986,
    lng: 77.0878,
    region: "Haryana",
    country: "India"
  },
  {
    name: "Dhaula Kuan Junction",
    label: "Dhaula Kuan Flyover & Metro Junction, South West Delhi",
    category: "Transit Corridor",
    lat: 28.5910,
    lng: 77.1610,
    region: "Delhi",
    country: "India"
  },
  {
    name: "JNU Campus",
    label: "Jawaharlal Nehru University South Gate, New Delhi",
    category: "Educational Campus",
    lat: 28.5390,
    lng: 77.1660,
    region: "Delhi",
    country: "India"
  },
  {
    name: "IIT Delhi (Hauz Khas)",
    label: "IIT Delhi Main Gate, Hauz Khas, New Delhi",
    category: "Educational Campus",
    lat: 28.5450,
    lng: 77.1926,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Hauz Khas Village",
    label: "Hauz Khas Village & Deer Park, South Delhi, New Delhi",
    category: "Lifestyle & Culture",
    lat: 28.5535,
    lng: 77.2065,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Saket Select Citywalk",
    label: "Select Citywalk Mall, Saket District Centre, New Delhi",
    category: "Shopping & EV Charger Hub",
    lat: 28.5283,
    lng: 77.2195,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Nehru Place Commercial Center",
    label: "Nehru Place Commercial Complex, South Delhi",
    category: "Tech & Electronics Hub",
    lat: 28.5494,
    lng: 77.2529,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Lajpat Nagar Central Market",
    label: "Lajpat Nagar Central Market, South Delhi, New Delhi",
    category: "Commercial Hub",
    lat: 28.5677,
    lng: 77.2433,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Chandni Chowk",
    label: "Chandni Chowk Heritage Corridor, Old Delhi",
    category: "Heritage & Commercial Hub",
    lat: 28.6506,
    lng: 77.2303,
    region: "Delhi",
    country: "India"
  },
  {
    name: "IGI Airport Terminal 3",
    label: "Indira Gandhi International Airport Terminal 3, New Delhi",
    category: "Airport & Transit Hub",
    lat: 28.5562,
    lng: 77.1000,
    region: "Delhi",
    country: "India"
  },
  {
    name: "IGI Airport Terminal 1",
    label: "Indira Gandhi International Airport Terminal 1, New Delhi",
    category: "Airport & Transit Hub",
    lat: 28.5684,
    lng: 77.1126,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Anand Vihar ISBT",
    label: "Anand Vihar Inter-State Bus Terminal, East Delhi",
    category: "Transit Interchange",
    lat: 28.6469,
    lng: 77.3160,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Rohini Sector 10",
    label: "Rohini Sector 10 District Centre, North West Delhi",
    category: "Residential & Commercial",
    lat: 28.7165,
    lng: 77.1120,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Dwarka Sector 21",
    label: "Dwarka Sector 21 Metro Interchange, South West Delhi",
    category: "Transit Interchange",
    lat: 28.5522,
    lng: 77.0583,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Janakpuri District Centre",
    label: "Janakpuri District Centre, West Delhi, New Delhi",
    category: "Commercial Complex",
    lat: 28.6297,
    lng: 77.0782,
    region: "Delhi",
    country: "India"
  },
  {
    name: "AIIMS New Delhi",
    label: "AIIMS New Delhi, Sri Aurobindo Marg, Ansari Nagar",
    category: "Hospital & Medical Hub",
    lat: 28.5672,
    lng: 77.2100,
    region: "Delhi",
    country: "India"
  },
  {
    name: "India Gate",
    label: "India Gate & Kartavya Path, Central Delhi, New Delhi",
    category: "National Landmark",
    lat: 28.6129,
    lng: 77.2295,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Rajouri Garden Market",
    label: "Rajouri Garden Main Market, West Delhi, New Delhi",
    category: "Commercial Hub",
    lat: 28.6477,
    lng: 77.1215,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Okhla Industrial Area Phase 3",
    label: "Okhla Phase 3 Industrial Area, South Delhi",
    category: "Industrial & EV Testing Hub",
    lat: 28.5355,
    lng: 77.2710,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Pari Chowk Greater Noida",
    label: "Pari Chowk, Greater Noida Express Way, Uttar Pradesh",
    category: "Transit & EV Corridor",
    lat: 28.4646,
    lng: 77.5108,
    region: "Uttar Pradesh",
    country: "India"
  },
  {
    name: "Indirapuram Habitat Centre",
    label: "Indirapuram Habitat Centre, Ghaziabad, Uttar Pradesh",
    category: "Commercial & Residential",
    lat: 28.6405,
    lng: 77.3705,
    region: "Uttar Pradesh",
    country: "India"
  },
  {
    name: "Vaishali Metro Station",
    label: "Vaishali Metro Station, Ghaziabad, Uttar Pradesh",
    category: "Transit Interchange",
    lat: 28.6445,
    lng: 77.3392,
    region: "Uttar Pradesh",
    country: "India"
  },
  {
    name: "Faridabad Sector 15",
    label: "Bata Chowk / Sector 15, Faridabad, Haryana",
    category: "Commercial & Metro Hub",
    lat: 28.3892,
    lng: 77.3130,
    region: "Haryana",
    country: "India"
  },
  {
    name: "Sohna Road IT Corridor",
    label: "Sohna Road Tech Corridor, Sector 48, Gurugram, Haryana",
    category: "Tech Corridor",
    lat: 28.4100,
    lng: 77.0400,
    region: "Haryana",
    country: "India"
  },
  {
    name: "Golf Course Road (DLF Phase 5)",
    label: "Golf Course Road Horizon Centre, Gurugram, Haryana",
    category: "Commercial Hub",
    lat: 28.4600,
    lng: 77.1000,
    region: "Haryana",
    country: "India"
  },
  {
    name: "Netaji Subhash Place (NSP)",
    label: "Netaji Subhash Place (NSP) Pitampura, North West Delhi",
    category: "Commercial Complex",
    lat: 28.6923,
    lng: 77.1517,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Khan Market",
    label: "Khan Market, Central New Delhi",
    category: "Commercial & Retail Hub",
    lat: 28.6004,
    lng: 77.2270,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Akshardham Temple",
    label: "Swaminarayan Akshardham, NH 24, East Delhi",
    category: "Landmark & Corridor",
    lat: 28.6127,
    lng: 77.2773,
    region: "Delhi",
    country: "India"
  },
  {
    name: "New Delhi Railway Station (NDLS)",
    label: "New Delhi Railway Station, Bhavbhuti Marg, Delhi",
    category: "Major Railway Terminal",
    lat: 28.6429,
    lng: 77.2195,
    region: "Delhi",
    country: "India"
  },
  {
    name: "Millennium City Centre",
    label: "Millennium City Centre Metro Station, Sector 29, Gurugram",
    category: "Transit & Commercial Hub",
    lat: 28.4593,
    lng: 77.0725,
    region: "Haryana",
    country: "India"
  }
];

function toLngLat(coord) {
  return [Number(coord.lng), Number(coord.lat)];
}

function toLatLngWaypoint(coord) {
  return [Number(coord[1]), Number(coord[0])];
}

function calculateElevationGain(coordinates) {
  return coordinates.reduce((gain, coord, index) => {
    if (index === 0 || coord.length < 3 || coordinates[index - 1].length < 3) {
      return gain;
    }

    const difference = Number(coord[2]) - Number(coordinates[index - 1][2]);
    return difference > 0 ? gain + difference : gain;
  }, 0);
}

const TOMTOM_ROUTING_URL = "https://api.tomtom.com/routing/1/calculateRoute";

function normalizeQuery(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export class RouteService {
  static hasTomTomApiKey() {
    const key = process.env.TOMTOM_API_KEY;
    return Boolean(key && key !== "YOUR_TOMTOM_KEY_HERE" && key.trim().length > 5);
  }

  static hasRouteApiKey() {
    return Boolean(process.env.ROUTE_API_KEY || process.env.OPENROUTESERVICE_API_KEY);
  }

  static getCuratedLocations(query = "", limit = 6) {
    const q = normalizeQuery(query);
    if (!q) {
      return CURATED_LOCATIONS.slice(0, limit);
    }

    const tokens = q.split(" ").filter(Boolean);
    const matches = CURATED_LOCATIONS.filter(loc => {
      const target = normalizeQuery(`${loc.name} ${loc.label} ${loc.category} ${loc.region}`);
      return tokens.every(token => target.includes(token));
    });

    return matches.slice(0, limit);
  }

  static async getDrivingRoute({ origin, destination, routePreference = "least_traffic" }) {
    const tomtomKey = process.env.TOMTOM_API_KEY;

    // 1. Try TomTom with Real-Time Traffic & Alternative Routing
    if (tomtomKey && tomtomKey !== "YOUR_TOMTOM_KEY_HERE" && tomtomKey.trim().length > 5) {
      try {
        const routeTypeParam = routePreference === "shortest" ? "shortest" : "fastest";
        const tomtomUrl = `${TOMTOM_ROUTING_URL}/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json?key=${encodeURIComponent(tomtomKey.trim())}&traffic=true&maxAlternatives=2&computeTravelTimeFor=all&routeType=${routeTypeParam}`;
        const ttRes = await fetch(tomtomUrl);
        if (ttRes.ok) {
          const ttData = await ttRes.json();
          if (Array.isArray(ttData.routes) && ttData.routes.length > 0) {
            const candidateRoutes = ttData.routes.map((r, idx) => {
              const summary = r.summary || {};
              const points = (r.legs?.[0]?.points || []).map(p => ({
                lat: p.latitude,
                lng: p.longitude
              }));
              const freeFlowSec = summary.noTrafficTravelTimeInSeconds || summary.travelTimeInSeconds || 0;
              const liveSec = summary.travelTimeInSeconds || freeFlowSec;
              const delaySec = summary.trafficDelayInSeconds || Math.max(0, liveSec - freeFlowSec);
              const delayMins = Math.round(delaySec / 60);
              const durationMins = Math.round(liveSec / 60);
              const freeFlowMins = Math.round(freeFlowSec / 60);
              const distanceKm = Math.round((summary.lengthInMeters / 1000) * 10) / 10;
              const congestionRatio = freeFlowSec > 0 ? (delaySec / freeFlowSec) : 0;

              let trafficLevel = "light";
              if (congestionRatio >= 0.35 || delayMins >= 10) trafficLevel = "heavy_congestion";
              else if (congestionRatio >= 0.12 || delayMins >= 3) trafficLevel = "moderate";

              return {
                id: `tt_${idx}`,
                index: idx,
                name: idx === 0 ? "Primary Corridor" : `Alternative Corridor ${idx}`,
                distanceKm,
                durationMins,
                freeFlowMins,
                delayMins,
                congestionRatio: Math.round(congestionRatio * 100) / 100,
                trafficLevel,
                waypoints: points,
                elevationGainM: 0,
                source: "tomtom_traffic"
              };
            });

            // Rank according to routePreference:
            // "least_traffic": minimum delay in minutes, then minimum total duration
            // "shortest": minimum distance
            // "fastest": minimum duration
            let sorted = [...candidateRoutes];
            if (routePreference === "least_traffic") {
              sorted.sort((a, b) => (a.delayMins - b.delayMins) || (a.durationMins - b.durationMins));
            } else if (routePreference === "shortest") {
              sorted.sort((a, b) => a.distanceKm - b.distanceKm);
            } else {
              sorted.sort((a, b) => a.durationMins - b.durationMins);
            }

            const chosen = sorted[0];
            console.log(`[TomTom Routing] Evaluated ${candidateRoutes.length} paths. Mode: ${routePreference}. Chosen: ${chosen.distanceKm} km, ${chosen.durationMins}m, Delay: +${chosen.delayMins}m`);
            return {
              ...chosen,
              alternatives: candidateRoutes
            };
          }
        } else {
          const errText = await ttRes.text().catch(() => "");
          console.warn(`TomTom routing returned HTTP ${ttRes.status}:`, errText.slice(0, 150));
        }
      } catch (ttErr) {
        console.warn("TomTom routing error, falling back to OSRM/ORS:", ttErr.message);
      }
    } else {
      console.log("[RouteService] No valid TOMTOM_API_KEY detected in backend/.env, falling back to OSRM/ORS.");
    }

    // 2. Try OpenRouteService if API key is provided
    const apiKey = process.env.ROUTE_API_KEY || process.env.OPENROUTESERVICE_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(OPEN_ROUTE_SERVICE_URL, {
          method: "POST",
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            coordinates: [toLngLat(origin), toLngLat(destination)],
            elevation: true,
            instructions: false
          })
        });

        if (response.ok) {
          const data = await response.json();
          const feature = data.features?.[0];
          if (feature) {
            const coordinates = feature.geometry?.coordinates || [];
            const summary = feature.properties?.summary || {};
            return {
              distanceKm: summary.distance ? Math.round((summary.distance / 1000) * 10) / 10 : null,
              durationMins: summary.duration ? Math.round(summary.duration / 60) : null,
              delayMins: 0,
              waypoints: coordinates.map(toLatLngWaypoint),
              elevationGainM: Math.round(calculateElevationGain(coordinates)),
              source: "openrouteservice"
            };
          }
        }
      } catch (err) {
        console.warn("OpenRouteService failed, falling back to OSRM:", err.message);
      }
    }

    // 3. Free Open Source Routing Machine (OSRM) Fallback with multi-route support
    try {
      const osrmUrl = `${OSRM_ROUTING_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true`;
      const osrmRes = await fetch(osrmUrl);
      if (osrmRes.ok) {
        const osrmData = await osrmRes.json();
        const routes = osrmData.routes || [];
        if (routes.length > 0) {
          const candidateRoutes = routes.map((route, idx) => {
            const coordinates = route.geometry?.coordinates || [];
            const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
            const durationMins = Math.round(route.duration / 60);
            return {
              id: `osrm_${idx}`,
              index: idx,
              name: idx === 0 ? "Standard Route" : `Alternative Route ${idx}`,
              distanceKm,
              durationMins,
              freeFlowMins: durationMins,
              delayMins: 0,
              congestionRatio: 0,
              trafficLevel: "moderate",
              waypoints: coordinates.map(toLatLngWaypoint),
              elevationGainM: 0,
              source: "osrm"
            };
          });

          let sorted = [...candidateRoutes];
          if (routePreference === "shortest") {
            sorted.sort((a, b) => a.distanceKm - b.distanceKm);
          } else {
            sorted.sort((a, b) => a.durationMins - b.durationMins);
          }

          const chosen = sorted[0];
          return {
            ...chosen,
            alternatives: candidateRoutes
          };
        }
      }
    } catch (osrmErr) {
      console.warn("OSRM routing unavailable:", osrmErr.message);
    }

    return null;
  }

  static async geocodeLocation(text) {
    const matches = await this.searchLocations(text, 1);
    return matches[0] || null;
  }

  static async searchLocations(text, size = 6) {
    const query = String(text || "").trim();
    if (!query) {
      return CURATED_LOCATIONS.slice(0, size);
    }

    const results = [];
    const seenCoordinates = new Set();

    const addResult = (item) => {
      if (!item || !item.lat || !item.lng) return;
      const coordKey = `${Number(item.lat).toFixed(3)},${Number(item.lng).toFixed(3)}`;
      if (seenCoordinates.has(coordKey)) return;
      seenCoordinates.add(coordKey);
      results.push(item);
    };

    // 1. Curated local database matches (instant & exact)
    const localMatches = this.getCuratedLocations(query, size);
    localMatches.forEach(addResult);

    if (results.length >= size) {
      return results.slice(0, size);
    }

    // 2. OpenRouteService if API key is provided
    const apiKey = process.env.ROUTE_API_KEY || process.env.OPENROUTESERVICE_API_KEY;
    if (apiKey) {
      try {
        const params = new URLSearchParams({
          api_key: apiKey,
          text: query,
          size: String(size)
        });
        const response = await fetch(`${OPEN_ROUTE_GEOCODE_URL}?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          (data.features || [])
            .filter(f => f?.geometry?.coordinates)
            .forEach(f => {
              const [lng, lat] = f.geometry.coordinates;
              addResult({
                lat: Number(lat),
                lng: Number(lng),
                name: f.properties?.name || f.properties?.label || query,
                label: f.properties?.label || query,
                region: f.properties?.region,
                country: f.properties?.country,
                category: f.properties?.layer || "Location"
              });
            });
        }
      } catch (orsErr) {
        console.warn("ORS geocoding error:", orsErr.message);
      }
    }

    if (results.length >= size) {
      return results.slice(0, size);
    }

    // 3. Free Photon OpenStreetMap Autocomplete Geocoding (No API key needed!)
    try {
      const photonParams = new URLSearchParams({
        q: query,
        limit: String(size),
        lat: "28.6139",
        lon: "77.2090"
      });
      const photonRes = await fetch(`${PHOTON_GEOCODE_URL}?${photonParams.toString()}`);
      if (photonRes.ok) {
        const photonData = await photonRes.json();
        (photonData.features || [])
          .filter(f => f?.geometry?.coordinates)
          .forEach(f => {
            const [lng, lat] = f.geometry.coordinates;
            const p = f.properties || {};
            const subtitleParts = [p.street, p.city || p.county, p.state, p.country].filter(Boolean);
            const label = [p.name, ...subtitleParts].filter(Boolean).join(", ");
            addResult({
              lat: Number(lat),
              lng: Number(lng),
              name: p.name || query,
              label: label || query,
              region: p.state || p.city,
              country: p.country,
              category: p.type || p.osm_value || "Landmark"
            });
          });
      }
    } catch (photonErr) {
      console.warn("Photon autocomplete geocoding error:", photonErr.message);
    }

    if (results.length >= size) {
      return results.slice(0, size);
    }

    // 4. Free OpenStreetMap Nominatim Fallback
    try {
      const nomParams = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: String(size)
      });
      const nomRes = await fetch(`${NOMINATIM_GEOCODE_URL}?${nomParams.toString()}`, {
        headers: { "User-Agent": "ERakshak-TripPlanner/1.0" }
      });
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData)) {
          nomData.forEach(item => {
            const lat = Number(item.lat);
            const lng = Number(item.lon);
            const name = item.name || item.display_name?.split(",")?.[0] || query;
            addResult({
              lat,
              lng,
              name,
              label: item.display_name || query,
              region: item.address?.state || item.address?.city,
              country: item.address?.country,
              category: item.type || "Place"
            });
          });
        }
      }
    } catch (nomErr) {
      console.warn("Nominatim search error:", nomErr.message);
    }

    return results.slice(0, size);
  }
}

