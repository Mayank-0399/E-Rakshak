import React, { useState } from 'react';
import { 
  BatteryCharging, 
  Gauge, 
  Thermometer, 
  AlertTriangle, 
  Navigation, 
  Flame, 
  Weight, 
  SlidersHorizontal,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  HelpCircle,
  Calculator,
  X,
  Info,
  Zap
} from 'lucide-react';
import { simulateScenario, updateTelemetry } from '../api';

export default function Dashboard({ 
  dashboardData, 
  onRefresh, 
  onNavigate 
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [showRangeFormulaModal, setShowRangeFormulaModal] = useState(false);

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-black dark:border-offwhite border-t-transparent"></div>
      </div>
    );
  }

  const {
    vehicle,
    telemetry,
    range_prediction,
    active_alerts = [],
    system_status,
    status_message,
    data_source,
    last_updated
  } = dashboardData;

  const soc = telemetry?.soc_percent ?? 50;
  const temp = telemetry?.battery_temperature_c ?? 30;
  const estimatedRange = range_prediction?.estimated_range_km ?? 0;
  const rangeLower = range_prediction?.range_interval_km?.lower ?? (estimatedRange * 0.85);
  const rangeUpper = range_prediction?.range_interval_km?.upper ?? (estimatedRange * 1.15);
  const usableWh = range_prediction?.usable_energy_wh ?? 0;

  // Thermal state classifier
  const getTempStatus = (t) => {
    if (t >= 55) return { color: 'text-rose-500 border-rose-500/40 bg-rose-500/10', label: 'Critical Overheat' };
    if (t >= 45) return { color: 'text-amber-600 dark:text-amber-300 border-amber-500/40 bg-amber-500/10', label: 'Elevated Temp' };
    return { color: 'text-zinc-800 dark:text-zinc-200 border-black/10 dark:border-white/20 bg-zinc-100 dark:bg-zinc-900', label: 'Optimal Window' };
  };

  const tempStatus = getTempStatus(temp);

  // Trigger quick simulation scenarios
  const handleQuickSimulate = async (scenario) => {
    try {
      setIsSimulating(true);
      await simulateScenario(scenario);
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCustomSliderChange = async (field, value) => {
    try {
      await updateTelemetry({ [field]: value });
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* 0% Battery Emergency Alert Banner */}
      {soc <= 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-black border-2 border-rose-500 rounded-2xl p-5 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-lg">
              🆘
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Battery at 0% • Auto-SOS Dispatched to Friends &amp; Family
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Vehicle is stranded. Verified GPS coordinates and emergency dispatch links have been activated.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('emergency')}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider shrink-0 transition shadow-lg"
          >
            View Family SOS Hub →
          </button>
        </div>
      )}

      {/* Top Banner: Black & Off-White Gradient Cockpit Header */}
      <div className="relative rounded-2xl bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black p-6 border border-black/10 dark:border-white/15 shadow-xl dark:shadow-2xl overflow-hidden transition-colors">
        {/* Subtle geometric angle background accent */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-black/[0.02] dark:from-white/[0.03] to-transparent pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-extrabold">Active Architecture</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black dark:bg-offwhite text-offwhite dark:text-black uppercase tracking-wider">
                {vehicle?.vehicle_type?.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-3xl font-black text-black dark:text-offwhite tracking-tight uppercase">{vehicle?.name}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">{status_message}</p>
          </div>

          {/* Quick Simulation scenario bar: Sleek Stark Monochrome Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold hidden sm:inline">Telemetry Sandbox:</span>
            
            <button
              disabled={isSimulating}
              onClick={() => handleQuickSimulate('normal')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/10 transition shadow-sm"
              title="Reset to healthy normal telemetry"
            >
              Normal (68%)
            </button>
            <button
              disabled={isSimulating}
              onClick={() => handleQuickSimulate('low_soc')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 transition flex items-center gap-1.5"
              title="Simulate low battery state"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low SoC (8%)
            </button>
            <button
              disabled={isSimulating}
              onClick={() => handleQuickSimulate('overheat')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 transition flex items-center gap-1.5"
              title="Simulate thermal overheat"
            >
              <Flame className="w-3.5 h-3.5" />
              Overheat (56.5°C)
            </button>
            <button
              disabled={isSimulating}
              onClick={() => handleQuickSimulate('overloaded')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 transition flex items-center gap-1.5"
              title="Simulate overloaded vehicle weight"
            >
              <Weight className="w-3.5 h-3.5" />
              Overload
            </button>
            <button
              onClick={() => setShowSimPanel(!showSimPanel)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-black text-offwhite dark:bg-offwhite dark:text-black hover:opacity-90 transition shadow-sm"
              title="Toggle Custom Telemetry Sliders"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Custom Telemetry Sliders */}
        {showSimPanel && (
          <div className="mt-6 pt-5 border-t border-black/10 dark:border-white/10 grid grid-cols-1 md:grid-cols-3 gap-5 bg-zinc-100 dark:bg-black/60 p-5 rounded-xl border border-black/5 dark:border-white/5">
            <div>
              <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300 mb-1.5 font-bold">
                <span className="uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400">Battery SoC Target:</span>
                <span className="font-mono text-black dark:text-offwhite text-sm">{soc}%</span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="100" 
                value={soc}
                onChange={(e) => handleCustomSliderChange('soc_percent', Number(e.target.value))}
                className="w-full accent-black dark:accent-offwhite cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300 mb-1.5 font-bold">
                <span className="uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400">Pack Temperature:</span>
                <span className={`font-mono text-sm ${temp >= 55 ? 'text-rose-500' : temp >= 45 ? 'text-amber-600 dark:text-amber-300' : 'text-black dark:text-offwhite'}`}>
                  {temp}°C
                </span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="65" 
                value={temp}
                onChange={(e) => handleCustomSliderChange('battery_temperature_c', Number(e.target.value))}
                className="w-full accent-black dark:accent-offwhite cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300 mb-1.5 font-bold">
                <span className="uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400">Payload Envelope:</span>
                <span className="font-mono text-black dark:text-offwhite capitalize text-sm">{telemetry?.load_category}</span>
              </div>
              <select 
                value={telemetry?.load_category || 'normal'}
                onChange={(e) => handleCustomSliderChange('load_category', e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-black/10 dark:border-zinc-700 text-black dark:text-offwhite text-xs font-semibold rounded-lg p-2 focus:outline-none uppercase tracking-wider"
              >
                <option value="empty">Empty / Single Rider (0.88x)</option>
                <option value="normal">Standard Passenger Load (1.0x)</option>
                <option value="heavy">Heavy Cargo Load (1.25x)</option>
                <option value="overloaded">Overloaded &gt;450kg (1.55x)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Metric Cards Grid - High Contrast Monochrome Aesthetic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Estimated Usable Range */}
        <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-black dark:text-offwhite" />
                Usable Range
              </span>
              <button
                type="button"
                onClick={() => setShowRangeFormulaModal(true)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 transition cursor-pointer"
                title="View how usable range is calculated"
              >
                <HelpCircle className="w-3 h-3 text-sky-500" />
                <span>Formula</span>
              </button>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-black/10 dark:border-zinc-700">
              {range_prediction?.confidence || 'High'} Confidence
            </span>
          </div>

          <div className="my-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-black text-black dark:text-offwhite tracking-tighter">{estimatedRange}</span>
              <span className="text-zinc-400 font-bold text-xl uppercase">km</span>
            </div>
            
            <div className="mt-3 text-xs bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-xl border border-black/5 dark:border-white/10 flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Uncertainty Band:</span>
              <span className="font-mono font-bold text-black dark:text-offwhite tracking-tight">{rangeLower} — {rangeUpper} km</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 border-t border-black/10 dark:border-zinc-800/80 pt-4">
            <div className="flex justify-between">
              <span>Usable Energy:</span>
              <span className="font-mono font-bold text-black dark:text-offwhite">{usableWh} Wh</span>
            </div>
            <div className="flex justify-between">
              <span>Efficiency Baseline:</span>
              <span className="font-mono font-bold text-black dark:text-offwhite">{range_prediction?.adjusted_consumption_wh_per_km || vehicle?.nominal_efficiency_wh_per_km} Wh/km</span>
            </div>
            <div className="flex justify-between">
              <span>Model Version:</span>
              <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{range_prediction?.model_version || 'Deterministic-v1'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Battery State of Charge (SoC) */}
        <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-black dark:text-offwhite" />
              State of Charge
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {data_source}
            </span>
          </div>

          <div className="my-6">
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl sm:text-6xl font-black tracking-tighter ${
                soc <= 10 ? 'text-rose-500 animate-pulse' : soc <= 20 ? 'text-amber-500 dark:text-amber-300' : 'text-black dark:text-offwhite'
              }`}>
                {soc}%
              </span>
              <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider">Remaining</span>
            </div>

            {/* Stark High-Contrast Progress Bar */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-950 h-3 rounded-full mt-3 overflow-hidden border border-black/10 dark:border-white/15 p-0.5">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  soc <= 10 ? 'bg-rose-500' : soc <= 20 ? 'bg-amber-400' : 'bg-black dark:bg-offwhite'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, soc))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-black/10 dark:border-zinc-800/80 pt-4">
            <div className="bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">Pack Voltage</span>
              <span className="font-mono font-bold text-black dark:text-offwhite text-sm">{telemetry?.voltage_v || vehicle?.nominal_voltage_v} V</span>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">Current Draw</span>
              <span className="font-mono font-bold text-black dark:text-offwhite text-sm">{telemetry?.current_a || 0} A</span>
            </div>
          </div>
        </div>

        {/* Card 3: Thermal & Safety Diagnostics */}
        <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-black dark:text-offwhite" />
              Thermal Matrix
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${tempStatus.color}`}>
              {tempStatus.label}
            </span>
          </div>

          <div className="my-6">
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl sm:text-6xl font-black tracking-tighter ${
                temp >= 55 ? 'text-rose-500' : temp >= 45 ? 'text-amber-500 dark:text-amber-300' : 'text-black dark:text-offwhite'
              }`}>
                {temp}°
              </span>
              <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider">Celsius</span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              {temp >= 55 
                ? 'Thermal limit exceeded! High risk of battery cell degradation.' 
                : temp >= 45 
                ? 'Approaching thermal limit. Avoid steep grades & fast DC charging.' 
                : 'Operating in certified thermal envelope (20°C–42°C).'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-black/10 dark:border-zinc-800/80 pt-4">
            <div className="bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">Odometer</span>
              <span className="font-mono font-bold text-black dark:text-offwhite text-sm">{telemetry?.odometer_km || 0} km</span>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">Payload State</span>
              <span className="font-mono font-bold text-black dark:text-offwhite text-sm capitalize">{telemetry?.load_category}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Quick Action Navigation Grid: High Contrast Sportswear Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <button
          onClick={() => onNavigate('plan-trip')}
          className="group relative bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:to-black hover:bg-zinc-50 dark:hover:from-zinc-800 dark:hover:to-zinc-900 p-5 rounded-2xl border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/30 transition-all text-left shadow-lg dark:shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-offwhite text-offwhite dark:text-black flex items-center justify-center font-bold shadow-md">
              <Navigation className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-black dark:group-hover:text-offwhite transition-colors" />
          </div>
          <span className="text-sm font-black text-black dark:text-offwhite block uppercase tracking-wide">Plan Trip</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">Energy feasibility analysis &amp; routing</span>
        </button>

        <button
          onClick={() => onNavigate('plan-trip')}
          className="group relative bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black hover:bg-zinc-50 dark:hover:from-zinc-800 dark:hover:to-zinc-900 p-5 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/60 transition-all text-left shadow-lg dark:shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-500 group-hover:text-black dark:group-hover:text-offwhite transition-colors" />
          </div>
          <span className="text-sm font-black text-black dark:text-offwhite block uppercase tracking-wide">Route via Charger</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">Plan shortest path with EV stopover</span>
        </button>

        <button
          onClick={() => onNavigate('history')}
          className="group relative bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:to-black hover:bg-zinc-50 dark:hover:from-zinc-800 dark:hover:to-zinc-900 p-5 rounded-2xl border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/30 transition-all text-left shadow-lg dark:shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-offwhite text-offwhite dark:text-black flex items-center justify-center font-bold shadow-md">
              <Clock className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-black dark:group-hover:text-offwhite transition-colors" />
          </div>
          <span className="text-sm font-black text-black dark:text-offwhite block uppercase tracking-wide">Trip History</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">Evaluated journeys &amp; consumption logs</span>
        </button>

        <button
          onClick={() => onNavigate('emergency')}
          className="group relative bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:to-black hover:bg-zinc-50 dark:hover:from-zinc-800 dark:hover:to-zinc-900 p-5 rounded-2xl border border-rose-500/30 hover:border-rose-500/60 transition-all text-left shadow-lg dark:shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-lg shadow-rose-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-rose-500 group-hover:text-black dark:group-hover:text-offwhite transition-colors" />
          </div>
          <span className="text-sm font-black text-rose-600 dark:text-rose-200 block uppercase tracking-wide">Emergency SOS</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">Instant WhatsApp / SMS dispatch</span>
        </button>

      </div>

      {/* Usable Range Formula & Physics Breakdown Modal */}
      {showRangeFormulaModal && (
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
                    How Usable Range Is Calculated
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Deterministic Glass-Box Energy Model (v1.0) with live telematics
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRangeFormulaModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs">
              
              {/* Core Master Formula Box */}
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60">
                <span className="block text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 mb-1">
                  Core Range Equation:
                </span>
                <div className="text-sm sm:text-base font-mono font-bold text-sky-950 dark:text-sky-100">
                  Usable Range (km) = Usable Energy (Wh) ÷ Adjusted Consumption (Wh/km)
                </div>
                <div className="mt-2 text-[11px] text-sky-800 dark:text-sky-300/90 font-mono">
                  = {usableWh} Wh ÷ {range_prediction?.adjusted_consumption_wh_per_km || vehicle?.nominal_efficiency_wh_per_km || 58} Wh/km = <span className="font-bold underline">{estimatedRange} km</span>
                </div>
              </div>

              {/* Step 1: Usable Energy */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-black dark:text-offwhite uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">1</span>
                    Usable Battery Energy (Wh)
                  </span>
                  <span className="font-mono font-bold text-black dark:text-offwhite text-sm">{usableWh} Wh</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
                  Calculated from gross installed capacity, instantaneous State-of-Charge (SoC), and the manufacturer safety reserve fraction.
                </p>
                
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-black/5 dark:border-white/5 font-mono text-[11px] space-y-1 text-zinc-700 dark:text-zinc-300">
                  <div>Formula: <strong className="text-black dark:text-white">Pack Capacity (Wh) × (SoC % ÷ 100) × Usable Fraction</strong></div>
                  <div className="text-zinc-500 dark:text-zinc-400">
                    = {vehicle?.battery_capacity_wh || 7370} Wh × ({soc}% ÷ 100) × 0.90
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    = {usableWh} Wh available
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                  * Note: 10% BMS buffer is withheld by the battery management system to prevent deep-discharge cell degradation.
                </div>
              </div>

              {/* Step 2: Dynamic Multipliers */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-black dark:text-offwhite uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">2</span>
                    Adjusted Consumption Rate (Wh/km)
                  </span>
                  <span className="font-mono font-bold text-black dark:text-offwhite text-sm">
                    {range_prediction?.adjusted_consumption_wh_per_km || vehicle?.nominal_efficiency_wh_per_km || 58} Wh/km
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
                  Begins with the vehicle nominal lab rating and adjusts dynamically for live operating stress:
                </p>

                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-black/5 dark:border-white/5 font-mono text-[11px] space-y-2">
                  <div className="text-black dark:text-white font-bold">
                    Base Rating: {vehicle?.nominal_efficiency_wh_per_km || 58} Wh/km
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Load Multiplier</span>
                      <span className="font-bold text-black dark:text-white">
                        {range_prediction?.factors?.load_multiplier || 1.0}× ({telemetry?.load_category || 'normal'})
                      </span>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Thermal Multiplier</span>
                      <span className="font-bold text-black dark:text-white">
                        {range_prediction?.factors?.temp_multiplier || 1.0}× ({temp}°C)
                      </span>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Terrain Multiplier</span>
                      <span className="font-bold text-black dark:text-white">
                        {range_prediction?.factors?.terrain_multiplier || 1.0}× (urban flat)
                      </span>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Traffic Multiplier</span>
                      <span className="font-bold text-black dark:text-white">
                        {range_prediction?.factors?.traffic_multiplier || 1.0}×
                      </span>
                    </div>
                  </div>
                  <div className="pt-1 text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
                    Effective Rate = {vehicle?.nominal_efficiency_wh_per_km || 58} × {range_prediction?.factors?.load_multiplier || 1.0} × {range_prediction?.factors?.temp_multiplier || 1.0} × {range_prediction?.factors?.terrain_multiplier || 1.0} × {range_prediction?.factors?.traffic_multiplier || 1.0} = <strong className="text-black dark:text-white">{range_prediction?.adjusted_consumption_wh_per_km || vehicle?.nominal_efficiency_wh_per_km || 58} Wh/km</strong>
                  </div>
                </div>
              </div>

              {/* Step 3: Uncertainty Interval */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-black dark:text-offwhite uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">3</span>
                    Uncertainty Band (±15%)
                  </span>
                  <span className="font-mono font-bold text-black dark:text-offwhite text-sm">
                    {rangeLower} — {rangeUpper} km
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed">
                  Real-world variance accounts for throttle aggressiveness, headwinds, and regenerative braking recovery:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                    <span className="text-[9px] uppercase text-zinc-400 block font-sans font-bold">Conservative (-15%)</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{rangeLower} km</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-sky-300 dark:border-sky-700">
                    <span className="text-[9px] uppercase text-sky-600 dark:text-sky-400 block font-sans font-bold">Nominal (P50)</span>
                    <span className="text-sm font-bold text-black dark:text-white">{estimatedRange} km</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                    <span className="text-[9px] uppercase text-zinc-400 block font-sans font-bold">Favorable (+15%)</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{rangeUpper} km</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-black/10 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRangeFormulaModal(false)}
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
