import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Trash2, 
  PlusCircle, 
  ShieldCheck, 
  Battery, 
  Sun, 
  Moon
} from 'lucide-react';
import { 
  fetchSettings, 
  updateSettings, 
  clearAccountData, 
  createVehicle 
} from '../api';

export default function Settings({ dashboardData, onRefresh, theme, onToggleTheme }) {
  const [settings, setSettings] = useState(null);
  const [showAddVehModal, setShowAddVehModal] = useState(false);
  const [wipeStatus, setWipeStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const [newVehName, setNewVehName] = useState('');
  const [newVehType, setNewVehType] = useState('e_scooter');
  const [newCapacity, setNewCapacity] = useState(3000);
  const [newEfficiency, setNewEfficiency] = useState(42);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchSettings();
        if (res.success) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settings);
      setSaveStatus('Preferences saved successfully.');
      setTimeout(() => setSaveStatus(''), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleWipeData = async () => {
    if (window.confirm('Delete all stored trip history and location records per privacy policy?')) {
      try {
        await clearAccountData();
        setWipeStatus('Personal trip history and location trails cleared.');
        setTimeout(() => setWipeStatus(''), 4000);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      await createVehicle({
        name: newVehName,
        vehicle_type: newVehType,
        battery_capacity_wh: Number(newCapacity),
        nominal_efficiency_wh_per_km: Number(newEfficiency)
      });
      setShowAddVehModal(false);
      setNewVehName('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (!settings) {
    return <div className="text-center py-12 text-zinc-500 font-mono text-xs">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-black dark:text-offwhite" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            System Preferences &amp; Vehicle Setup
          </span>
        </div>
        <h1 className="text-2xl font-black text-black dark:text-offwhite uppercase tracking-tight">Vehicle Profiles &amp; Calibration</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Configure model parameters, safety reserve thresholds, and privacy controls.
        </p>
      </div>

      {/* Safety Reserve & Vehicle Baseline */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-6 transition-colors">
        <h2 className="text-sm font-black text-black dark:text-offwhite uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-black dark:text-offwhite" />
          Safety Reserves &amp; Decision Envelopes
        </h2>

        <div className="space-y-5">
          {/* Theme Mode Toggle Row */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-black rounded-xl border border-black/10 dark:border-white/10">
            <div>
              <span className="text-xs font-bold text-black dark:text-offwhite uppercase tracking-wider block">Visual Theme Interface</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Switch between high-contrast dark carbon gradient and soft off-white
              </span>
            </div>
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-black text-offwhite dark:bg-offwhite dark:text-black hover:opacity-90 transition shadow-sm"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300 mb-2 font-bold">
              <span className="uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400">Safety Energy Reserve Buffer:</span>
              <span className="font-mono text-black dark:text-offwhite text-sm">{settings.safety_reserve_percent}%</span>
            </div>
            <input 
              type="range"
              min="10"
              max="30"
              value={settings.safety_reserve_percent || 15}
              onChange={(e) => setSettings({ ...settings, safety_reserve_percent: Number(e.target.value) })}
              className="w-full accent-black dark:accent-offwhite cursor-pointer"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Minimum battery percentage set aside as reserve before a destination is classified as 'Likely Feasible'.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-black rounded-xl border border-black/10 dark:border-white/10">
            <div>
              <span className="text-xs font-bold text-black dark:text-offwhite uppercase tracking-wider block">Sound &amp; Voice Safety Prompts</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Audible tone when crossing into high-risk battery thresholds</span>
            </div>
            <input 
              type="checkbox"
              checked={settings.sound_alerts_enabled}
              onChange={(e) => setSettings({ ...settings, sound_alerts_enabled: e.target.checked })}
              className="accent-black dark:accent-offwhite w-4 h-4 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">Rider Language</label>
              <select
                value={settings.preferred_language || 'en'}
                onChange={(e) => setSettings({ ...settings, preferred_language: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs text-black dark:text-offwhite font-bold uppercase tracking-wider focus:outline-none"
              >
                <option value="en">English (Default)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">Emergency Recipient Contact</label>
              <input
                type="text"
                value={settings.emergency_contact?.phone || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  emergency_contact: { ...settings.emergency_contact, phone: e.target.value }
                })}
                placeholder="+91 98111 22334"
                className="w-full bg-zinc-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs text-black dark:text-offwhite font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveStatus && <span className="text-xs text-black dark:text-offwhite font-bold">{saveStatus}</span>}
            <button
              onClick={handleSaveSettings}
              className="ml-auto px-6 py-2.5 rounded-xl bg-black text-offwhite dark:bg-offwhite dark:text-black font-black uppercase tracking-wider text-xs shadow-lg transition hover:opacity-90"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>

      {/* Register Custom Vehicle */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-black dark:text-offwhite uppercase tracking-widest flex items-center gap-2">
            <Battery className="w-4 h-4 text-black dark:text-offwhite" />
            Vehicle Fleet Register
          </h2>
          <button
            onClick={() => setShowAddVehModal(!showAddVehModal)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-black dark:text-white text-xs font-bold uppercase tracking-wider border border-black/10 dark:border-white/10 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Register EV
          </button>
        </div>

        {showAddVehModal && (
          <form onSubmit={handleCreateVehicle} className="p-4 bg-zinc-50 dark:bg-black rounded-xl border border-black/10 dark:border-white/10 space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Vehicle Name / Make</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kinetic Safar E-Rickshaw"
                  value={newVehName}
                  onChange={(e) => setNewVehName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white"
                />
              </div>
              <div>
                <label className="text-zinc-500 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Vehicle Class</label>
                <select
                  value={newVehType}
                  onChange={(e) => setNewVehType(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-bold uppercase tracking-wider"
                >
                  <option value="e_rickshaw">E-Rickshaw</option>
                  <option value="e_scooter">E-Scooter</option>
                  <option value="e_cycle">E-Cycle</option>
                  <option value="other">Other Light EV</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Battery Capacity (Wh)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 7000"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="text-zinc-500 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Nominal Efficiency (Wh / km)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 75"
                  value={newEfficiency}
                  onChange={(e) => setNewEfficiency(Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddVehModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-black text-offwhite dark:bg-offwhite dark:text-black font-black uppercase tracking-wider hover:opacity-90"
              >
                Save Vehicle
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Privacy by Design & Data Controls (Section 13) */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-3 transition-colors">
        <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-zinc-400" />
          Privacy Architecture: Data Minimization
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
          In compliance with architecture privacy rules, precise GPS traces are never permanently held without consent. You can purge all trip logs and cached routes at any time.
        </p>

        <div className="pt-2 flex items-center justify-between">
          {wipeStatus && <span className="text-xs text-black dark:text-white font-bold">{wipeStatus}</span>}
          <button
            onClick={handleWipeData}
            className="ml-auto px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-black/10 dark:border-white/15 text-xs font-bold uppercase tracking-wider transition flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Wipe Stored History &amp; Location
          </button>
        </div>
      </div>

    </div>
  );
}
