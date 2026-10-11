import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Play, 
  Layers,
  Search,
  X,
  Loader2,
  ArrowUpDown,
  LocateFixed,
  Sparkles,
  Check,
  HelpCircle,
  Calculator,
  Info,
  Zap
} from 'lucide-react';
import MapView from './MapView';
import { 
  estimateTrip, 
  recordTrip, 
  completeTrip, 
  searchLocations, 
  POPULAR_LOCATIONS 
} from '../api';

function computeApproxDistanceKm(p1, p2) {
  if (!p1 || !p2 || typeof p1.lat !== 'number' || typeof p2.lat !== 'number') return null;
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  return Math.max(1.0, Math.round(straightKm * 1.32 * 10) / 10);
}

function getLocationIcon(item) {
  const cat = (item.category || item.label || '').toLowerCase();
  if (cat.includes('ev') || cat.includes('charger') || cat.includes('charging')) return '⚡';
  if (cat.includes('metro') || cat.includes('transit') || cat.includes('bus') || cat.includes('isbt') || cat.includes('station') || cat.includes('railway')) return '🚇';
  if (cat.includes('airport') || cat.includes('terminal')) return '✈️';
  if (cat.includes('tech') || cat.includes('park') || cat.includes('corporate') || cat.includes('mall') || cat.includes('market') || cat.includes('commercial')) return '🏢';
  if (cat.includes('hospital') || cat.includes('medical') || cat.includes('aiims')) return '🏥';
  if (cat.includes('university') || cat.includes('campus') || cat.includes('iit') || cat.includes('college')) return '🎓';
  return '📍';
}

export default function PlanTrip({ dashboardData, onRefresh, onNavigate }) {
  const [originName, setOriginName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [loadCategory, setLoadCategory] = useState('normal');
  const [terrain, setTerrain] = useState('urban_flat');
  const [trafficLevel, setTrafficLevel] = useState('moderate');
  
  const [tripResult, setTripResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tripError, setTripError] = useState('');
  const [routePreference, setRoutePreference] = useState('shortest');
  const [showDemandFormulaModal, setShowDemandFormulaModal] = useState(false);
  
  // Search & Suggestions State
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [activeOriginIndex, setActiveOriginIndex] = useState(-1);
  const [activeDestinationIndex, setActiveDestinationIndex] = useState(-1);

  const originContainerRef = useRef(null);
  const destinationContainerRef = useRef(null);

  const [simulationState, setSimulationState] = useState({
    active: false,
    progress: 0,
    currentTripId: null,
    message: ''
  });

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (originContainerRef.current && !originContainerRef.current.contains(event.target)) {
        setShowOriginDropdown(false);
      }
      if (destinationContainerRef.current && !destinationContainerRef.current.contains(event.target)) {
        setShowDestinationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomOriginChange = (value) => {
    setOriginName(value);
    setSelectedOrigin(null);
    setShowOriginDropdown(true);
    setActiveOriginIndex(-1);
  };

  const handleCustomDestinationChange = (value) => {
    setDestinationName(value);
    setSelectedDestination(null);
    setShowDestinationDropdown(true);
    setActiveDestinationIndex(-1);
  };

  const handleClearOrigin = () => {
    setOriginName('');
    setSelectedOrigin(null);
    setOriginSuggestions([]);
    setShowOriginDropdown(false);
  };

  const handleClearDestination = () => {
    setDestinationName('');
    setSelectedDestination(null);
    setDestinationSuggestions([]);
    setShowDestinationDropdown(false);
  };

  const handleSwapLocations = () => {
    const tempName = originName;
    const tempCoords = selectedOrigin;
    setOriginName(destinationName);
    setSelectedOrigin(selectedDestination);
    setDestinationName(tempName);
    setSelectedDestination(tempCoords);
    setShowOriginDropdown(false);
    setShowDestinationDropdown(false);
  };

  const handleUseCurrentVehicleLocation = () => {
    const vehicleLoc = dashboardData?.telemetry?.location || { lat: 28.6139, lng: 77.2090 };
    setOriginName("Current EV Telemetry Location");
    setSelectedOrigin(vehicleLoc);
    setShowOriginDropdown(false);
    if (selectedDestination) {
      const approx = computeApproxDistanceKm(vehicleLoc, selectedDestination);
      if (approx) setDistanceKm(approx);
    }
  };

  const handleSelectOriginSuggestion = (location) => {
    const label = location.name || location.label;
    setOriginName(label);
    const coords = { lat: Number(location.lat), lng: Number(location.lng) };
    setSelectedOrigin(coords);
    setShowOriginDropdown(false);
    setOriginSuggestions([]);

    if (selectedDestination) {
      const approxDist = computeApproxDistanceKm(coords, selectedDestination);
      if (approxDist) {
        setDistanceKm(approxDist);
      }
    }
  };

  const handleSelectDestinationSuggestion = (location) => {
    const label = location.name || location.label;
    setDestinationName(label);
    const coords = { lat: Number(location.lat), lng: Number(location.lng) };
    setSelectedDestination(coords);
    setShowDestinationDropdown(false);
    setDestinationSuggestions([]);

    if (selectedOrigin) {
      const approxDist = computeApproxDistanceKm(selectedOrigin, coords);
      if (approxDist) {
        setDistanceKm(approxDist);
      }
    }
  };

  // Keyboard navigation for Origin
  const handleOriginKeyDown = (e) => {
    if (!showOriginDropdown || originSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveOriginIndex(prev => (prev + 1) % originSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveOriginIndex(prev => (prev <= 0 ? originSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      if (activeOriginIndex >= 0 && activeOriginIndex < originSuggestions.length) {
        e.preventDefault();
        handleSelectOriginSuggestion(originSuggestions[activeOriginIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowOriginDropdown(false);
    }
  };

  // Keyboard navigation for Destination
  const handleDestinationKeyDown = (e) => {
    if (!showDestinationDropdown || destinationSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveDestinationIndex(prev => (prev + 1) % destinationSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveDestinationIndex(prev => (prev <= 0 ? destinationSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      if (activeDestinationIndex >= 0 && activeDestinationIndex < destinationSuggestions.length) {
        e.preventDefault();
        handleSelectDestinationSuggestion(destinationSuggestions[activeDestinationIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDestinationDropdown(false);
    }
  };

  const handleCalculateFeasibility = async (overrideRoutePref) => {
    if (!originName?.trim() || !destinationName?.trim()) {
      setTripError('Please specify both origin and destination to plan a route.');
      return;
    }

    try {
      setIsLoading(true);
      setTripError('');
      const res = await estimateTrip({
        vehicle_id: dashboardData?.vehicle?.id,
        origin: selectedOrigin,
        destination: selectedDestination,
        origin_name: originName.trim(),
        destination_name: destinationName.trim(),
        distance_km: distanceKm ? Number(distanceKm) : undefined,
        loadCategory,
        terrain,
        trafficLevel,
        routePreference: overrideRoutePref || routePreference
      });

      if (res.success) {
        setTripResult(res.data);
      }
    } catch (err) {
      console.error(err);
      setTripError(err.message || 'Failed to estimate this trip. Check the locations and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (originName && destinationName && tripResult) {
      handleCalculateFeasibility();
    }
  }, [loadCategory, terrain, trafficLevel, routePreference]);

  // Origin suggestion fetcher with debounce
  useEffect(() => {
    if (selectedOrigin) {
      return;
    }

    const trimmed = originName.trim();
    if (trimmed.length === 0) {
      setOriginSuggestions(POPULAR_LOCATIONS.slice(0, 5));
      setIsSearchingOrigin(false);
      return;
    }

    setIsSearchingOrigin(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await searchLocations(trimmed);
        setOriginSuggestions(res.success && Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Origin search error:', err);
        setOriginSuggestions([]);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [originName, selectedOrigin]);

  // Destination suggestion fetcher with debounce
  useEffect(() => {
    if (selectedDestination) {
      return;
    }

    const trimmed = destinationName.trim();
    if (trimmed.length === 0) {
      setDestinationSuggestions(POPULAR_LOCATIONS.slice(0, 5));
      setIsSearchingDestination(false);
      return;
    }

    setIsSearchingDestination(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await searchLocations(trimmed);
        setDestinationSuggestions(res.success && Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Destination search error:', err);
        setDestinationSuggestions([]);
      } finally {
        setIsSearchingDestination(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [destinationName, selectedDestination]);

  // Simulate Drive Playback
  const handleStartDriveSimulation = async () => {
    if (!tripResult) return;

    try {
      const recorded = await recordTrip({
        vehicle_id: dashboardData?.vehicle?.id,
        origin_name: originName,
        destination_name: destinationName,
        origin_coords: tripResult.route_summary.origin_coords,
        destination_coords: tripResult.route_summary.destination_coords,
        distance_km: Number(distanceKm),
        predicted_energy_wh: tripResult.feasibility.estimated_energy_required_wh,
        load_category: loadCategory
      });

      const tripId = recorded.data.id;
      setSimulationState({
        active: true,
        progress: 15,
        currentTripId: tripId,
        message: 'Vehicle departed origin. Logging real-time battery drain...'
      });

      setTimeout(() => {
        setSimulationState(prev => ({ ...prev, progress: 55, message: 'Mid-journey navigation. Validating reserve margins...' }));
      }, 1500);

      setTimeout(() => {
        setSimulationState(prev => ({ ...prev, progress: 90, message: 'Approaching destination checkpoint...' }));
      }, 3000);

      setTimeout(async () => {
        await completeTrip(tripId, {
          actualEnergyWh: Math.round(tripResult.feasibility.estimated_energy_required_wh * (0.98 + Math.random() * 0.08)),
          notes: 'Journey completed successfully via E-Rakshak simulation'
        });

        setSimulationState({
          active: false,
          progress: 100,
          currentTripId: null,
          message: 'Journey completed! Results logged to Trips & Evaluation History.'
        });

        if (onRefresh) onRefresh();
      }, 4500);

    } catch (err) {
      console.error(err);
      setSimulationState({ active: false, progress: 0, currentTripId: null, message: 'Error during simulation' });
    }
  };

  const mapMarkers = [];
  if (tripResult?.route_summary) {
    mapMarkers.push({
      lat: tripResult.route_summary.origin_coords.lat,
      lng: tripResult.route_summary.origin_coords.lng,
      iconType: 'origin',
      popupContent: `<strong>Origin:</strong> ${tripResult.route_summary.origin_name}`
    });
    mapMarkers.push({
      lat: tripResult.route_summary.destination_coords.lat,
      lng: tripResult.route_summary.destination_coords.lng,
      iconType: 'destination',
      popupContent: `<strong>Destination:</strong> ${tripResult.route_summary.destination_name}`
    });
  }

  // If trip is routed via charging station, display ONLY this nearest station stopover
  if (tripResult?.charging_stopover) {
    const cs = tripResult.charging_stopover;
    mapMarkers.push({
      lat: cs.latitude,
      lng: cs.longitude,
      iconType: 'station',
      popupContent: `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="color: #10b981; font-size: 13px;">⚡ Nearest Charging Hub</strong><br/>
          <strong>${cs.name}</strong><br/>
          <span style="color: #64748b;">${cs.operator} • ${cs.power_kw} kW</span><br/>
          <span>From Start: <strong>${cs.distance_from_origin_km} km</strong></span><br/>
          <span>Remaining: <strong>${cs.distance_to_dest_km} km</strong></span><br/>
          <span>Arrival Battery: <strong style="color: #10b981;">~${cs.arrival_soc_at_station_percent}% SoC</strong></span>
        </div>
      `
    });
  }

  if (tripResult?.route_hazards) {
    tripResult.route_hazards.forEach(h => {
      mapMarkers.push({
        lat: h.latitude,
        lng: h.longitude,
        iconType: 'hazard',
        popupContent: `<strong>⚠️ Hazard:</strong> ${h.title}<br/><span style="font-size: 11px;">${h.description}</span>`
      });
    });
  }

  const feasibility = tripResult?.feasibility;

  const getFeasibilityBadge = (status) => {
    switch (status) {
      case 'likely_feasible':
        return (
          <div className="flex items-center gap-2 bg-black text-offwhite dark:bg-offwhite dark:text-black px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg">
            <CheckCircle className="w-4 h-4 text-current" />
            <span>Likely Feasible</span>
          </div>
        );
      case 'uncertain':
        return (
          <div className="flex items-center gap-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Uncertain / Tight</span>
          </div>
        );
      case 'not_recommended':
      default:
        return (
          <div className="flex items-center gap-2 bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider">
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Not Recommended</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-4 h-4 text-black dark:text-offwhite" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Route Feasibility Architecture
              </span>
            </div>
            <h1 className="text-2xl font-black text-black dark:text-offwhite uppercase tracking-tight">Trip Planning &amp; Reachability</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Deterministic route energy analysis with uncertainty intervals and safety reserves.
            </p>
          </div>

          {/* Action: Clear Route button when inputs are populated */}
          {(originName || destinationName || tripResult) && (
            <button
              type="button"
              onClick={() => {
                setOriginName('');
                setDestinationName('');
                setDistanceKm('');
                setSelectedOrigin(null);
                setSelectedDestination(null);
                setTripResult(null);
                setTripError('');
                setOriginSuggestions([]);
                setDestinationSuggestions([]);
                setShowOriginDropdown(false);
                setShowDestinationDropdown(false);
              }}
              className="self-start sm:self-center text-xs px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-offwhite hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold uppercase tracking-wider transition"
            >
              Clear Route
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Parameters & Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Route Inputs & Feasibility Card */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Route Config Form */}
          <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
            <h2 className="text-xs font-black text-black dark:text-offwhite uppercase tracking-widest">Route Parameters</h2>
            
            <div className="space-y-3.5 text-xs">
              {/* Origin Search Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5">
                    <span>Origin / Pickup Location</span>
                    {selectedOrigin && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <Check className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentVehicleLocation}
                    className="text-[10px] font-bold text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 transition"
                    title="Use live vehicle location from telemetry"
                  >
                    <LocateFixed className="w-3 h-3 text-sky-500" />
                    <span>My EV GPS</span>
                  </button>
                </div>

                <div ref={originContainerRef} className="relative">
                  <MapPin className="w-4 h-4 text-sky-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={originName}
                    placeholder="Search origin (e.g. Connaught Place, Karol Bagh)"
                    onFocus={() => {
                      setShowOriginDropdown(true);
                      if (originSuggestions.length === 0) {
                        setOriginSuggestions(POPULAR_LOCATIONS.slice(0, 5));
                      }
                    }}
                    onChange={(e) => handleCustomOriginChange(e.target.value)}
                    onKeyDown={handleOriginKeyDown}
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg pl-9 pr-14 py-2 text-black dark:text-offwhite font-medium focus:outline-none focus:border-black dark:focus:border-white transition text-xs"
                  />

                  {/* Actions right of input */}
                  <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
                    {isSearchingOrigin && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                    )}
                    {originName && (
                      <button
                        type="button"
                        onClick={handleClearOrigin}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded transition"
                        title="Clear origin"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Origin Suggestions Dropdown */}
                  {showOriginDropdown && (
                    <div className="absolute left-0 right-0 z-[1000] mt-1 max-h-72 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-2xl divide-y divide-black/5 dark:divide-white/5">
                      {isSearchingOrigin && (
                        <div className="p-3 text-center text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-black dark:text-white" />
                          <span>Searching locations...</span>
                        </div>
                      )}

                      {!isSearchingOrigin && originSuggestions.length === 0 && originName.trim().length > 0 && (
                        <div className="p-3.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
                          <p className="font-semibold text-black dark:text-white mb-0.5">No direct matches found</p>
                          <p className="text-[10px]">Try entering a metro station, landmark, or area name.</p>
                        </div>
                      )}

                      {originSuggestions.map((location, idx) => (
                        <button
                          key={`${location.lat}-${location.lng}-${location.label}-${idx}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectOriginSuggestion(location);
                          }}
                          className={`w-full px-3.5 py-2.5 text-left transition flex items-start gap-2.5 ${
                            activeOriginIndex === idx
                              ? 'bg-zinc-100 dark:bg-zinc-800'
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/80'
                          }`}
                        >
                          <span className="text-sm mt-0.5 select-none">{getLocationIcon(location)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-black dark:text-offwhite truncate">
                                {location.name}
                              </span>
                              {location.category && (
                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                                  {location.category}
                                </span>
                              )}
                            </div>
                            <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {location.label}
                            </span>
                          </div>
                        </button>
                      ))}

                      {/* Quick Popular Suggestions chips */}
                      {originName.trim().length === 0 && (
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/50">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 px-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Quick EV Hubs</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {POPULAR_LOCATIONS.slice(0, 4).map((pop) => (
                              <button
                                key={pop.name}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectOriginSuggestion(pop);
                                }}
                                className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                              >
                                {pop.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Swap Origin & Destination Button */}
              <div className="flex items-center justify-between py-0.5">
                <div className="h-px bg-black/10 dark:bg-white/10 flex-1"></div>
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  title="Swap Origin and Destination"
                  className="mx-3 px-2.5 py-1 rounded-full border border-black/10 dark:border-white/10 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Swap</span>
                </button>
                <div className="h-px bg-black/10 dark:bg-white/10 flex-1"></div>
              </div>

              {/* Destination Search Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5">
                    <span>Destination Location</span>
                    {selectedDestination && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <Check className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                  </label>
                </div>

                <div ref={destinationContainerRef} className="relative">
                  <MapPin className="w-4 h-4 text-amber-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={destinationName}
                    placeholder="Search destination (e.g. Noida Sector 18, Cyber Hub)"
                    onFocus={() => {
                      setShowDestinationDropdown(true);
                      if (destinationSuggestions.length === 0) {
                        setDestinationSuggestions(POPULAR_LOCATIONS.slice(0, 5));
                      }
                    }}
                    onChange={(e) => handleCustomDestinationChange(e.target.value)}
                    onKeyDown={handleDestinationKeyDown}
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg pl-9 pr-14 py-2 text-black dark:text-offwhite font-medium focus:outline-none focus:border-black dark:focus:border-white transition text-xs"
                  />

                  {/* Actions right of input */}
                  <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
                    {isSearchingDestination && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                    )}
                    {destinationName && (
                      <button
                        type="button"
                        onClick={handleClearDestination}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded transition"
                        title="Clear destination"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Destination Suggestions Dropdown */}
                  {showDestinationDropdown && (
                    <div className="absolute left-0 right-0 z-[1000] mt-1 max-h-72 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-2xl divide-y divide-black/5 dark:divide-white/5">
                      {isSearchingDestination && (
                        <div className="p-3 text-center text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-black dark:text-white" />
                          <span>Searching locations...</span>
                        </div>
                      )}

                      {!isSearchingDestination && destinationSuggestions.length === 0 && destinationName.trim().length > 0 && (
                        <div className="p-3.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
                          <p className="font-semibold text-black dark:text-white mb-0.5">No direct matches found</p>
                          <p className="text-[10px]">Try entering a metro station, landmark, or area name.</p>
                        </div>
                      )}

                      {destinationSuggestions.map((location, idx) => (
                        <button
                          key={`${location.lat}-${location.lng}-${location.label}-${idx}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectDestinationSuggestion(location);
                          }}
                          className={`w-full px-3.5 py-2.5 text-left transition flex items-start gap-2.5 ${
                            activeDestinationIndex === idx
                              ? 'bg-zinc-100 dark:bg-zinc-800'
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/80'
                          }`}
                        >
                          <span className="text-sm mt-0.5 select-none">{getLocationIcon(location)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-black dark:text-offwhite truncate">
                                {location.name}
                              </span>
                              {location.category && (
                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                                  {location.category}
                                </span>
                              )}
                            </div>
                            <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {location.label}
                            </span>
                          </div>
                        </button>
                      ))}

                      {/* Quick Popular Suggestions chips */}
                      {destinationName.trim().length === 0 && (
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/50">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 px-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Quick EV Hubs</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {POPULAR_LOCATIONS.slice(0, 4).map((pop) => (
                              <button
                                key={pop.name}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectDestinationSuggestion(pop);
                                }}
                                className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                              >
                                {pop.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Distance (km)</label>
                    {selectedOrigin && selectedDestination && distanceKm && (
                      <span className="text-[9px] text-zinc-400 font-medium">Auto-calculated</span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    placeholder="Auto"
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-black dark:text-offwhite font-mono font-bold focus:outline-none focus:border-black dark:focus:border-white transition"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Payload Profile</label>
                  <select
                    value={loadCategory}
                    onChange={(e) => setLoadCategory(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-2 text-black dark:text-offwhite font-bold uppercase tracking-wider text-[11px] focus:outline-none"
                  >
                    <option value="empty">Empty (0.88x)</option>
                    <option value="normal">Standard (1.0x)</option>
                    <option value="heavy">Heavy (1.25x)</option>
                    <option value="overloaded">Overload (1.55x)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Traffic Congestion</label>
                  <select
                    value={trafficLevel}
                    onChange={(e) => setTrafficLevel(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-2 text-black dark:text-offwhite font-bold uppercase tracking-wider text-[11px] focus:outline-none"
                  >
                    <option value="light">Light Flow</option>
                    <option value="moderate">Moderate Urban</option>
                    <option value="heavy_congestion">Heavy Congestion</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-500 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Terrain Profile</label>
                  <select
                    value={terrain}
                    onChange={(e) => setTerrain(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-2 text-black dark:text-offwhite font-bold uppercase tracking-wider text-[11px] focus:outline-none"
                  >
                    <option value="urban_flat">Flat Urban</option>
                    <option value="hilly">Flyover / Hilly</option>
                    <option value="rough_roads">Potholed Surface</option>
                  </select>
                </div>
              </div>

              {/* Route Optimization Profile */}
              <div>
                <label className="text-zinc-500 dark:text-zinc-400 block mb-1.5 uppercase tracking-wider text-[10px] font-bold flex items-center justify-between">
                  <span>Routing Strategy</span>
                  {tripResult?.route_summary?.live_traffic?.has_live_data ? (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> TomTom Real-Time
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-400 font-mono">Dynamic AI Flow</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRoutePreference('shortest');
                      if (originName && destinationName) handleCalculateFeasibility('shortest');
                    }}
                    className={`px-3 py-2.5 rounded-xl border text-center transition cursor-pointer ${
                      routePreference === 'shortest'
                        ? 'bg-black text-offwhite dark:bg-offwhite dark:text-black border-transparent font-black shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-black/10 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-tight flex items-center justify-center gap-1.5">
                      <span>📏</span> Shortest Route
                    </div>
                    <div className="text-[8px] opacity-70 mt-0.5">Min Direct Distance</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoutePreference('shortest_via_charger');
                      if (originName && destinationName) handleCalculateFeasibility('shortest_via_charger');
                    }}
                    className={`px-3 py-2.5 rounded-xl border text-center transition cursor-pointer ${
                      routePreference === 'shortest_via_charger'
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black border-transparent font-black shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-black/10 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-tight flex items-center justify-center gap-1.5">
                      <span>⚡</span> Via Charging Station
                    </div>
                    <div className="text-[8px] opacity-70 mt-0.5">Auto-Pops Nearest Charger</div>
                  </button>
                </div>
              </div>

              <button
                disabled={isLoading || !originName.trim() || !destinationName.trim()}
                onClick={() => handleCalculateFeasibility()}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                  isLoading || !originName.trim() || !destinationName.trim()
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-black text-offwhite dark:bg-offwhite dark:text-black hover:opacity-90 shadow-lg'
                }`}
              >
                <Navigation className="w-4 h-4" />
                {isLoading ? 'Optimizing Route...' : 'Plan This Route'}
              </button>

              {tripError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {tripError}
                </div>
              )}
            </div>
          </div>

          {/* Nearest Charging Station Stopover (Only pops up when routed via charger) */}
          {tripResult?.charging_stopover && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-3 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 block">
                      Nearest Charging Stopover
                    </span>
                    <h3 className="text-sm font-black text-black dark:text-offwhite uppercase tracking-tight">
                      {tripResult.charging_stopover.name}
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {tripResult.charging_stopover.is_battery_swap ? 'Battery Swap' : `${tripResult.charging_stopover.power_kw} kW Fast`}
                </span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {tripResult.charging_stopover.operator} • {tripResult.charging_stopover.address}
              </p>

              <div className="grid grid-cols-3 gap-2 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-emerald-500/20 text-xs font-mono">
                <div>
                  <span className="text-[9px] font-sans font-bold text-zinc-400 uppercase block">Distance from Origin</span>
                  <span className="font-bold text-black dark:text-white">
                    {tripResult.charging_stopover.distance_from_origin_km} km
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-sans font-bold text-zinc-400 uppercase block">Arrival Battery</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ~{tripResult.charging_stopover.arrival_soc_at_station_percent}% SoC
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-sans font-bold text-zinc-400 uppercase block">Remaining to Dest</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    {tripResult.charging_stopover.distance_to_dest_km} km
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Plugs: <strong className="text-black dark:text-white">{tripResult.charging_stopover.supported_connectors?.join(', ')}</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Station Reachable
                </span>
              </div>
            </div>
          )}

          {/* Feasibility Verdict Card */}
          {feasibility && (
            <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Verdict</span>
                {getFeasibilityBadge(feasibility.status)}
              </div>

              {/* Actionable Advice Box */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 text-xs leading-relaxed">
                <strong className="block mb-1 font-black uppercase text-[10px] tracking-wider text-black dark:text-offwhite">Recommended Strategy:</strong>
                <span className="text-zinc-700 dark:text-zinc-300">{feasibility.recommended_action}</span>
              </div>

              {/* Energy Calculation Breakdown */}
              <div className="space-y-2 text-xs border-t border-black/10 dark:border-zinc-800 pt-3">
                <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                  <span>Available Battery Energy:</span>
                  <span className="font-mono font-bold text-black dark:text-offwhite">{feasibility.usable_energy_wh} Wh</span>
                </div>
                <div className="flex justify-between text-zinc-700 dark:text-zinc-300 items-center">
                  <div className="flex items-center gap-1.5">
                    <span>Estimated Demand:</span>
                    <button
                      type="button"
                      onClick={() => setShowDemandFormulaModal(true)}
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-1.5 py-0.5 rounded border border-sky-300 dark:border-sky-800 transition uppercase cursor-pointer"
                      title="View how Estimated Demand is calculated"
                    >
                      <HelpCircle className="w-2.5 h-2.5 text-sky-500" />
                      <span>Formula</span>
                    </button>
                  </div>
                  <span className="font-mono font-bold text-black dark:text-offwhite">{feasibility.estimated_energy_required_wh} Wh</span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Safety Reserve (15%):</span>
                  <span className="font-mono">{feasibility.safety_reserve_wh} Wh</span>
                </div>
                <div className="flex justify-between text-zinc-800 dark:text-zinc-300 border-t border-black/10 dark:border-zinc-800/80 pt-2 font-bold">
                  <span>Arrival Battery State:</span>
                  <span className="font-mono text-black dark:text-offwhite text-sm">
                    {feasibility.remaining_soc_after_trip}% SoC
                  </span>
                </div>
              </div>

              {/* Simulation Run Button */}
              <div className="pt-2">
                <button
                  disabled={simulationState.active}
                  onClick={handleStartDriveSimulation}
                  className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xl ${
                    simulationState.active
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-black text-offwhite dark:bg-offwhite dark:text-black hover:opacity-90 shadow-black/10 dark:shadow-white/10'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {simulationState.active ? 'Driving Simulation in Progress...' : 'Simulate Drive & Audit Outcome'}
                </button>

                {simulationState.message && (
                  <div className="mt-3 bg-zinc-100 dark:bg-zinc-950 p-3 rounded-xl border border-black/10 dark:border-white/10 text-xs">
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400 mb-1.5 font-bold">
                      <span className="text-[11px] text-zinc-800 dark:text-zinc-200">{simulationState.message}</span>
                      <span className="font-mono text-black dark:text-offwhite">{simulationState.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-black dark:bg-offwhite h-full transition-all duration-300" 
                        style={{ width: `${simulationState.progress}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Right Column: Route Map & Hazard Overlay */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-xl dark:shadow-2xl transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-black dark:text-offwhite" />
                <h2 className="text-xs font-black text-black dark:text-offwhite uppercase tracking-widest">Route Matrix &amp; Hazards</h2>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-bold">
                {tripResult
                  ? `${tripResult?.route_summary?.distance_km || distanceKm} km • ~${tripResult?.route_summary?.estimated_duration_mins || 20} mins`
                  : (distanceKm ? `${distanceKm} km` : 'Awaiting Route Plan')}
              </span>
            </div>

            {/* Map Container */}
            <MapView
              center={selectedOrigin ? [selectedOrigin.lat, selectedOrigin.lng] : (dashboardData?.telemetry?.location ? [dashboardData.telemetry.location.lat, dashboardData.telemetry.location.lng] : [28.6139, 77.2090])}
              zoom={12}
              routeWaypoints={tripResult?.route_waypoints || []}
              markers={mapMarkers}
              className="h-[460px] w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10"
            />

            {/* Map Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-black/10 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-offwhite inline-block"></span>
                <span>Origin (A)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 inline-block"></span>
                <span>Destination (B)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>Road Hazard</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-black dark:bg-offwhite inline-block"></span>
                <span>Calculated Route</span>
              </div>
              {tripResult?.charging_stopover && (
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>Charging Stopover (⚡)</span>
                </div>
              )}
            </div>

            {/* Live Traffic Breakdown Telemetry */}
            {tripResult?.route_summary?.live_traffic && (
              <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${tripResult.route_summary.live_traffic.delay_mins > 8 ? 'bg-rose-500' : (tripResult.route_summary.live_traffic.delay_mins > 2 ? 'bg-amber-500' : 'bg-emerald-500')} ${tripResult.route_summary.live_traffic.has_live_data ? 'animate-pulse' : ''}`}></span>
                  <span className="font-bold text-black dark:text-offwhite">
                    {tripResult.route_summary.live_traffic.has_live_data ? 'TomTom Real-Time Traffic Engine' : 'Traffic Congestion Analysis (Free OSRM)'}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                  <span>Free-flow: <strong className="text-black dark:text-white">{tripResult.route_summary.live_traffic.free_flow_mins}m</strong></span>
                  <span>Delay: <strong className={tripResult.route_summary.live_traffic.delay_mins > 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 dark:text-emerald-400"}>+{tripResult.route_summary.live_traffic.delay_mins}m</strong></span>
                  <span className="uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[9px] text-black dark:text-white">
                    {tripResult.route_summary.live_traffic.traffic_level.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* Candidate Corridors Evaluated Comparison */}
            {tripResult?.route_summary?.alternatives && tripResult.route_summary.alternatives.length > 1 && (
              <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <span>Candidate Corridors Evaluated ({tripResult.route_summary.alternatives.length})</span>
                  <span className="text-black dark:text-white">Active: {routePreference.replace('_', ' ')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tripResult.route_summary.alternatives.map((alt, aIdx) => {
                    const isSelected = tripResult.route_summary.distance_km === alt.distanceKm && 
                                       tripResult.route_summary.estimated_duration_mins === alt.durationMins;
                    return (
                      <div
                        key={alt.id || aIdx}
                        className={`p-2.5 rounded-lg border text-xs transition ${
                          isSelected
                            ? 'bg-black text-offwhite dark:bg-offwhite dark:text-black border-transparent shadow'
                            : 'bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="truncate">{alt.name || `Corridor ${aIdx + 1}`}</span>
                          {isSelected && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-white font-black shrink-0">Selected</span>}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span>{alt.distanceKm} km</span>
                          <span>~{alt.durationMins} mins</span>
                        </div>
                        {alt.delayMins > 0 ? (
                          <div className="text-[10px] text-amber-500 mt-1 font-bold">
                            ⚠️ +{alt.delayMins}m congestion
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-500 mt-1 font-bold">
                            ✓ Minimum Traffic
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Route Hazards Warning if any */}
            {tripResult?.route_hazards && tripResult.route_hazards.length > 0 && (
              <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-black text-black dark:text-offwhite uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Road Hazards Along Planned Corridor ({tripResult.route_hazards.length})</span>
                </div>
                <div className="space-y-2 mt-2">
                  {tripResult.route_hazards.map(h => (
                    <div key={h.id} className="text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-black p-2.5 rounded-lg border border-black/5 dark:border-white/5 flex justify-between items-center">
                      <span>⚠️ {h.title}</span>
                      <span className="text-[9px] text-zinc-600 dark:text-zinc-400 uppercase font-black px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-black/10 dark:border-zinc-800">{h.severity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Estimated Demand Formula & Feasibility Breakdown Modal */}
      {showDemandFormulaModal && feasibility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-zinc-900 border border-black/15 dark:border-white/15 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-black/10 dark:border-zinc-800 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight">
                    Estimated Demand Calculation
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Physics-based corridor energy forecast ({tripResult?.route_summary?.distance_km || feasibility?.estimated_distance_km || distanceKm} km)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemandFormulaModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs">

              {/* Core Equation Banner */}
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60">
                <span className="block text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 mb-1">
                  Demand Equation:
                </span>
                <div className="text-sm sm:text-base font-mono font-bold text-sky-950 dark:text-sky-100">
                  Estimated Demand (Wh) = Route Distance (km) × Adjusted Consumption (Wh/km)
                </div>
                <div className="mt-2 text-[11px] text-sky-800 dark:text-sky-300/90 font-mono">
                  = {tripResult?.route_summary?.distance_km || feasibility?.estimated_distance_km || distanceKm} km × {feasibility?.factors?.adjusted_consumption_wh_per_km || 58} Wh/km = <span className="font-bold underline">{feasibility.estimated_energy_required_wh} Wh</span>
                </div>
              </div>

              {/* Step 1: Corridor Consumption Breakdown */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-black dark:text-offwhite uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">1</span>
                    Corridor Consumption Rate (Wh/km)
                  </span>
                  <span className="font-mono font-bold text-black dark:text-offwhite text-sm">
                    {feasibility?.factors?.adjusted_consumption_wh_per_km || 58} Wh/km
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
                  Tailored to the vehicle baseline efficiency plus live corridor stress factors:
                </p>

                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-black/5 dark:border-white/5 font-mono text-[11px] space-y-2">
                  <div className="text-black dark:text-white font-bold">
                    Vehicle Lab Baseline: {feasibility?.factors?.nominal_efficiency_wh_per_km || dashboardData?.vehicle?.nominal_efficiency_wh_per_km || 58} Wh/km
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Payload Stress</span>
                      <span className="font-bold text-black dark:text-white">
                        {feasibility?.factors?.load_multiplier || 1.0}× ({loadCategory})
                      </span>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Thermal Stress</span>
                      <span className="font-bold text-black dark:text-white">
                        {feasibility?.factors?.temp_multiplier || 1.0}× ({dashboardData?.telemetry?.battery_temperature_c || 30}°C)
                      </span>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Road Gradient</span>
                      <span className="font-bold text-black dark:text-white">
                        {feasibility?.factors?.terrain_multiplier || 1.0}× ({terrain.replace('_', ' ')})
                      </span>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Traffic Congestion</span>
                      <span className="font-bold text-black dark:text-white">
                        {feasibility?.factors?.traffic_multiplier || 1.0}× ({tripResult?.route_summary?.live_traffic?.traffic_level?.replace('_', ' ') || trafficLevel})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Safety Reserve */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-black dark:text-offwhite uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">2</span>
                    Safety Reserve Buffer (15%)
                  </span>
                  <span className="font-mono font-bold text-black dark:text-offwhite text-sm">
                    {feasibility.safety_reserve_wh} Wh
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed">
                  Formula: <code className="font-bold text-black dark:text-white">Usable Battery Energy ({feasibility.usable_energy_wh} Wh) × 15%</code>
                </p>
                <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Safeguards against unmapped traffic jams, detour deviations, headlights/auxiliary drain, and prevents vehicle stalling before finding a charger.
                </div>
              </div>

              {/* Step 3: Feasibility & Arrival SoC */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-black dark:text-offwhite uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">3</span>
                    Journey Total Footprint &amp; Arrival SoC
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {feasibility.remaining_soc_after_trip}% Arrival SoC
                  </span>
                </div>

                <div className="space-y-2 font-mono text-[11px] bg-white dark:bg-zinc-900 p-3 rounded-lg border border-black/5 dark:border-white/5">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Trip Demand:</span>
                    <span className="font-bold text-black dark:text-white">{feasibility.estimated_energy_required_wh} Wh</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Safety Buffer:</span>
                    <span>+{feasibility.safety_reserve_wh} Wh</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-1 font-bold text-black dark:text-white">
                    <span>Total Required:</span>
                    <span>{feasibility.estimated_energy_required_wh + feasibility.safety_reserve_wh} Wh</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Usable Pack Energy:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{feasibility.usable_energy_wh} Wh</span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-zinc-600 dark:text-zinc-400">
                  Remaining Battery at Destination: <strong>{feasibility.remaining_soc_after_trip}% SoC</strong>
                  <span className="ml-1 text-[10px] text-zinc-400">
                    ({Math.max(0, feasibility.usable_energy_wh - feasibility.estimated_energy_required_wh)} Wh reserve)
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-black/10 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDemandFormulaModal(false)}
                className="px-5 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
