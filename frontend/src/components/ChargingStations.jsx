import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  MapPin, 
  CheckCircle2, 
  Filter, 
  Star, 
  RefreshCw,
  Navigation,
  BatteryCharging,
  Gauge,
  Compass,
  Search,
  X,
  Loader2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import MapView from './MapView';
import { 
  fetchChargingRecommendations, 
  fetchRouteToStation,
  searchLocations,
  POPULAR_LOCATIONS 
} from '../api';

export default function ChargingStations({ dashboardData, onRefresh, onNavigate }) {
  const [stations, setStations] = useState([]);
  const [selectedConnector, setSelectedConnector] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Origin location state
  const defaultOrigin = dashboardData?.telemetry?.location || { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi" };
  const [originLocation, setOriginLocation] = useState(defaultOrigin);
  const [originQuery, setOriginQuery] = useState(defaultOrigin.address || '');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const originContainerRef = useRef(null);

  // Active shortest route state
  const [selectedStation, setSelectedStation] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState('');

  const vehicle = dashboardData?.vehicle;
  const telemetry = dashboardData?.telemetry;
  const rangePrediction = dashboardData?.range_prediction;
  const currentSoc = telemetry?.soc_percent ?? 50;
  const usableRangeKm = rangePrediction?.estimated_range_km ?? 45;
  const usableWh = rangePrediction?.usable_energy_wh ?? 3500;

  // Search autocomplete handler
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (originQuery.trim().length >= 2) {
        setIsSearchingOrigin(true);
        try {
          const res = await searchLocations(originQuery.trim());
          if (res.success) {
            setOriginSuggestions(res.data);
            setShowOriginDropdown(true);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearchingOrigin(false);
        }
      } else {
        setOriginSuggestions([]);
        setShowOriginDropdown(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [originQuery]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (originContainerRef.current && !originContainerRef.current.contains(event.target)) {
        setShowOriginDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch stations for the current origin
  const loadStations = async (originCoords = originLocation) => {
    try {
      setIsLoading(true);
      const res = await fetchChargingRecommendations({
        vehicle_id: vehicle?.id,
        route_origin_coords: originCoords ? { lat: originCoords.lat, lng: originCoords.lng } : undefined
      });
      if (res.success && Array.isArray(res.data)) {
        setStations(res.data);

        // Auto-select the top reachable compatible station (Shortest path)
        const bestReachable = res.data.find(s => s.is_compatible && s.is_reachable) || res.data[0];
        if (bestReachable) {
          setSelectedStation(bestReachable);
          loadRouteToStation(originCoords, bestReachable.id, bestReachable);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load shortest driving route to a specific station
  const loadRouteToStation = async (originCoords, stationId, targetStation = null) => {
    if (!stationId && !targetStation) return;
    const stn = targetStation || stations.find(s => s.id === stationId) || selectedStation;
    try {
      setIsLoadingRoute(true);
      setRouteError('');
      const res = await fetchRouteToStation({
        vehicle_id: vehicle?.id,
        origin_coords: originCoords ? { lat: originCoords.lat, lng: originCoords.lng } : undefined,
        station_id: stationId,
        station_coords: stn ? { lat: stn.latitude, lng: stn.longitude } : undefined,
        station: stn
      });
      if (res.success && res.data) {
        setActiveRoute(res.data);
      }
    } catch (err) {
      console.error('Failed to load route to station:', err);
      setRouteError('Could not calculate real-time driving path. Showing direct line.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  useEffect(() => {
    loadStations(originLocation);
  }, [vehicle?.id, telemetry?.soc_percent, originLocation?.lat, originLocation?.lng]);

  const handleSelectStation = (station) => {
    setSelectedStation(station);
    loadRouteToStation(originLocation, station.id, station);
  };

  const handleSelectOrigin = (loc) => {
    setOriginLocation({
      lat: loc.lat,
      lng: loc.lng,
      address: loc.label || loc.name
    });
    setOriginQuery(loc.name || loc.label);
    setShowOriginDropdown(false);
  };

  const handleResetToCurrentLocation = () => {
    const loc = dashboardData?.telemetry?.location || { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi" };
    setOriginLocation(loc);
    setOriginQuery(loc.address || 'Connaught Place, New Delhi');
    setShowOriginDropdown(false);
  };

  // Filter stations
  const filteredStations = stations.filter(station => {
    if (selectedConnector !== 'all') {
      if (!station.supported_connectors?.includes(selectedConnector)) return false;
    }
    if (filterAvailability === 'available' && station.availability_status !== 'available') {
      return false;
    }
    if (onlyReachable && !station.is_reachable) {
      return false;
    }
    return true;
  });

  // Shortest path station recommendation (closest compatible reachable charger)
  const shortestReachableStation = stations.find(s => s.is_compatible && s.is_reachable) || stations[0];

  // Map markers
  const mapMarkers = filteredStations.map(station => {
    const isSelected = selectedStation?.id === station.id;
    return {
      lat: station.latitude,
      lng: station.longitude,
      iconType: station.is_battery_swap ? 'station' : 'station',
      onClick: () => handleSelectStation(station),
      popupContent: `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="font-size: 13px;">${station.name}</strong><br/>
          <span style="color: #64748b;">${station.operator} • ${station.power_kw} kW</span><br/>
          <span>Distance: <strong>${station.distance_km} km</strong></span><br/>
          <span>Arrival SoC: <strong style="color: #10b981;">~${station.estimated_battery_at_arrival_percent}%</strong></span><br/>
          <span style="font-size: 11px; color: ${station.is_reachable ? '#10b981' : '#ef4444'}; font-weight: bold;">
            ${station.reachability_status.toUpperCase()}
          </span>
        </div>
      `
    };
  });

  // Add origin marker
  if (originLocation) {
    mapMarkers.push({
      lat: originLocation.lat,
      lng: originLocation.lng,
      iconType: 'vehicle',
      popupContent: `<strong>Start Location / Vehicle</strong><br/>${originLocation.address || 'Current Position'}`
    });
  }

  // Calculate center of map
  const mapCenter = selectedStation
    ? [(originLocation.lat + selectedStation.latitude) / 2, (originLocation.lng + selectedStation.longitude) / 2]
    : [originLocation.lat, originLocation.lng];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-emerald-500 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Shortest Path Charging Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-black text-black dark:text-offwhite uppercase tracking-tight">
              Nearest Charging &amp; Swap Stations
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Finds the shortest driving path to verified chargers tailored to your current battery capacity and connector standard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadStations(originLocation)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/10 transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Network
            </button>
          </div>
        </div>

        {/* Live Battery Context Banner */}
        <div className="mt-5 p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Active Vehicle</span>
            <span className="font-bold text-black dark:text-offwhite truncate block">
              {vehicle?.name || 'Mahindra Treo'}
            </span>
          </div>

          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Battery SoC</span>
            <div className="flex items-center gap-1.5 font-bold font-mono">
              <span className={`w-2 h-2 rounded-full ${currentSoc <= 20 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span className={currentSoc <= 20 ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-offwhite'}>
                {currentSoc}% Remaining
              </span>
            </div>
          </div>

          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Usable Range</span>
            <span className="font-bold font-mono text-black dark:text-offwhite">
              {usableRangeKm} km ({usableWh} Wh)
            </span>
          </div>

          <div>
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Compatible Plugs</span>
            <span className="font-bold text-black dark:text-offwhite truncate block">
              {vehicle?.supported_connectors?.join(', ') || '15A 3-pin, Type 2'}
            </span>
          </div>
        </div>

        {/* Start Location Input & Search */}
        <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 relative" ref={originContainerRef}>
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
              Start / Origin Location:
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                value={originQuery}
                onChange={(e) => {
                  setOriginQuery(e.target.value);
                  setShowOriginDropdown(true);
                }}
                onFocus={() => setShowOriginDropdown(true)}
                placeholder="Search start location (e.g. Connaught Place, IIT BHU Lanka)..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 text-black dark:text-offwhite focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              {originQuery && (
                <button
                  type="button"
                  onClick={() => setOriginQuery('')}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-black dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showOriginDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-black/15 dark:border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={handleResetToCurrentLocation}
                  className="w-full p-2.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 border-b border-black/5 dark:border-white/5 font-bold text-sky-600 dark:text-sky-400"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Use Vehicle Current GPS Position
                </button>
                {isSearchingOrigin && (
                  <div className="p-3 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching locations...
                  </div>
                )}
                {originSuggestions.map((loc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOrigin(loc)}
                    className="w-full p-2.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between border-b border-black/5 dark:border-white/5"
                  >
                    <div>
                      <strong className="block text-black dark:text-white">{loc.name}</strong>
                      <span className="text-[10px] text-zinc-500 block truncate">{loc.label}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">{loc.region || 'India'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleResetToCurrentLocation}
              className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-black/10 dark:border-white/10 transition cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-sky-500" />
              Reset to Vehicle GPS
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Shortest Route Map (Left) & Stations List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Map with Shortest Path Polyline */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-xl dark:shadow-2xl transition-colors">
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-500 fill-current" />
                <h2 className="text-xs font-black text-black dark:text-offwhite uppercase tracking-widest">
                  Shortest Driving Route to Charger
                </h2>
              </div>
              {isLoadingRoute && (
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" /> Routing...
                </span>
              )}
            </div>

            {/* Map Container */}
            <MapView
              center={mapCenter}
              zoom={13}
              markers={mapMarkers}
              routeWaypoints={activeRoute?.route_waypoints || []}
              className="h-[460px] w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10"
            />

            {/* Active Selected Route Telemetry Banner */}
            {selectedStation && (
              <div className="mt-4 p-4 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                        Selected Charger
                      </span>
                      {selectedStation.id === shortestReachableStation?.id && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Shortest Path
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight mt-1">
                      {selectedStation.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {selectedStation.operator} • {selectedStation.address}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-black dark:text-offwhite">
                      {activeRoute?.route_summary?.distance_km ?? selectedStation.distance_km} km
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-mono">
                      ~{activeRoute?.route_summary?.duration_mins ?? Math.round(selectedStation.distance_km * 3)} mins drive
                    </span>
                  </div>
                </div>

                {/* Energy & Arrival Battery Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-white dark:bg-zinc-900 p-3 rounded-lg border border-black/5 dark:border-white/5 font-mono">
                  <div>
                    <span className="text-zinc-400 text-[9px] uppercase font-sans font-bold block">Energy Demand</span>
                    <span className="font-bold text-black dark:text-white">
                      {activeRoute?.feasibility?.energy_demand_wh ?? Math.round(selectedStation.distance_km * 58)} Wh
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 text-[9px] uppercase font-sans font-bold block">Arrival SoC</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {activeRoute?.feasibility?.arrival_soc_percent ?? selectedStation.estimated_battery_at_arrival_percent}% SoC
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 text-[9px] uppercase font-sans font-bold block">Reachability</span>
                    <span className={`font-bold uppercase text-[10px] ${
                      (activeRoute?.feasibility?.reachability_status ?? selectedStation.reachability_status) === 'reachable'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-500'
                    }`}>
                      {activeRoute?.feasibility?.reachability_status ?? selectedStation.reachability_status}
                    </span>
                  </div>
                </div>

                {/* Navigation Button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-zinc-500">
                    Power: <strong>{selectedStation.power_kw} kW</strong> • Plugs: <strong>{selectedStation.supported_connectors?.join(', ')}</strong>
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${originLocation.lat},${originLocation.lng}&destination=${selectedStation.latitude},${selectedStation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition shadow-md cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Turn-by-Turn GPS
                  </a>
                </div>
              </div>
            )}

            {/* Map Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-black/10 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                <span>Start / Vehicle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Charging Station</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-emerald-500 inline-block"></span>
                <span>Shortest Driving Path</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Station Recommendations Ranked by Shortest Path */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-lg text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-black dark:text-white" />
                Filter Connectors
              </span>
              <span className="text-[10px] text-zinc-400">
                {filteredStations.length} hubs found
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All Plugs' },
                { id: '15A_3pin', label: '15A 3-Pin' },
                { id: 'Battery_Swap', label: 'Battery Swap' },
                { id: 'Type_2', label: 'Type 2' },
                { id: 'CCS2', label: 'CCS2 Fast' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedConnector(f.id)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider transition cursor-pointer ${
                    selectedConnector === f.id
                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-black/10 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyReachable}
                  onChange={(e) => setOnlyReachable(e.target.checked)}
                  className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Only Reachable with Battery</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterAvailability === 'available'}
                  onChange={(e) => setFilterAvailability(e.target.checked ? 'available' : 'all')}
                  className="accent-black dark:accent-white w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span className="text-zinc-600 dark:text-zinc-400">Available Slots</span>
              </label>
            </div>
          </div>

          {/* Station Cards List */}
          <div className="space-y-3">
            {filteredStations.map(station => {
              const isSelected = selectedStation?.id === station.id;
              const isShortestPath = station.id === shortestReachableStation?.id;

              return (
                <div
                  key={station.id}
                  onClick={() => handleSelectStation(station)}
                  className={`bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black rounded-2xl p-4 shadow-md transition-all cursor-pointer relative border ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10'
                      : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25'
                  }`}
                >
                  {/* Recommended Badge */}
                  {isShortestPath && (
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                        <Sparkles className="w-2.5 h-2.5" />
                        Recommended: Shortest Reachable Path
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-black dark:text-offwhite uppercase tracking-tight">
                          {station.name}
                        </h4>
                        {station.is_battery_swap && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-black dark:bg-white text-white dark:text-black uppercase tracking-widest">
                            SWAP
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {station.operator} • {station.address}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black font-mono text-black dark:text-offwhite block">
                        {station.distance_km} km
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono block">
                        +{station.detour_km} km detour
                      </span>
                    </div>
                  </div>

                  {/* Badges & Connectors */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className={`px-2 py-0.5 rounded font-black uppercase ${
                      station.reachability_status === 'reachable'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : station.reachability_status === 'tight_margin'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}>
                      {station.reachability_status === 'reachable' ? 'Reachable' : station.reachability_status.replace('_', ' ')}
                    </span>

                    <span className="px-2 py-0.5 rounded font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      Arrival: ~{station.estimated_battery_at_arrival_percent}% SoC
                    </span>

                    <span className="px-2 py-0.5 rounded font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {station.power_kw} kW
                    </span>
                  </div>

                  {/* Connectors info */}
                  <div className="mt-2 text-[10px] text-zinc-500 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2">
                    <span className="truncate">
                      Plugs: <strong className="text-black dark:text-white">{station.supported_connectors?.join(', ')}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStation(station);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
                      }`}
                    >
                      {isSelected ? '✓ Path On Map' : 'Route Here'}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredStations.length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl text-xs text-zinc-400">
                No charging stations matched your filter criteria. Try selecting "All Plugs" or unchecking "Only Reachable".
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
