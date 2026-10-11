import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  MapPin, 
  Share2, 
  PhoneCall, 
  AlertOctagon, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  MessageSquare,
  Users,
  UserPlus,
  Trash2,
  BellRing,
  Sparkles,
  X,
  BatteryWarning,
  RotateCcw,
  Check
} from 'lucide-react';
import { 
  fetchEmergency, 
  shareEmergencyLocation, 
  triggerZeroBatterySos,
  addEmergencyContact,
  removeEmergencyContact,
  dismissSosAlert,
  simulateScenario
} from '../api';

export default function EmergencyHelp({ dashboardData, onRefresh }) {
  const [emergencyData, setEmergencyData] = useState(null);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [shareResult, setShareResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Friends & Family Network State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relationship: 'Family', phone: '' });
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isSimulatingZero, setIsSimulatingZero] = useState(false);

  const loadEmergency = async () => {
    try {
      const res = await fetchEmergency();
      if (res.success) {
        setEmergencyData(res.data);
        if (res.data.trusted_contact?.phone) {
          setRecipientPhone(res.data.trusted_contact.phone);
        }
      }
    } catch (err) {
      console.error('Failed to load emergency details:', err);
    }
  };

  useEffect(() => {
    loadEmergency();
  }, [dashboardData]);

  const handleShareSOS = async () => {
    try {
      setIsDispatching(true);
      const res = await shareEmergencyLocation({
        recipientPhone,
        messageNote: customNote
      });
      if (res.success) {
        setShareResult(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleTriggerManualZeroBatterySos = async () => {
    try {
      setIsDispatching(true);
      const res = await triggerZeroBatterySos({
        note: customNote || "Manual emergency SOS signal to friends and family"
      });
      if (res.success) {
        await loadEmergency();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to trigger zero-battery SOS:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSimulateZeroBattery = async () => {
    try {
      setIsSimulatingZero(true);
      await simulateScenario('zero_battery');
      await loadEmergency();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulatingZero(false);
    }
  };

  const handleRestoreBattery = async () => {
    try {
      await simulateScenario('normal');
      await dismissSosAlert();
      await loadEmergency();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissSos = async () => {
    try {
      await dismissSosAlert();
      await loadEmergency();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    try {
      setIsAddingContact(true);
      await addEmergencyContact(newContact);
      setNewContact({ name: '', relationship: 'Family', phone: '' });
      setShowAddModal(false);
      await loadEmergency();
    } catch (err) {
      console.error('Failed to add contact:', err);
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await removeEmergencyContact(contactId);
      await loadEmergency();
    } catch (err) {
      console.error('Failed to remove contact:', err);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentSoc = dashboardData?.telemetry?.soc_percent ?? 64;
  const isBatteryZero = currentSoc <= 0;
  const activeAlert = emergencyData?.active_sos_alert;
  const loc = emergencyData?.current_location || { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi" };
  const familyContacts = emergencyData?.friends_and_family || [];

  return (
    <div className="space-y-6 pb-16">

      {/* CRITICAL ZERO BATTERY AUTO-SOS ALERT BANNER */}
      {(isBatteryZero || activeAlert) && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-black border-2 border-rose-500 rounded-2xl p-6 shadow-2xl text-white relative overflow-hidden animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white shadow-lg">
                <BatteryWarning className="w-4 h-4 animate-bounce" />
                <span>BATTERY REACHED 0% • STRANDED ON ROAD</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                Automated SOS Signal Dispatched to Friends &amp; Family
              </h2>
              <p className="text-xs text-rose-200 max-w-2xl leading-relaxed">
                Vehicle is immobilized. Real-time GPS location ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}) and battery cutoff telematics have been packaged for your trusted emergency circle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleDismissSos}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold uppercase tracking-wider transition"
              >
                Dismiss Alert
              </button>
              <button
                onClick={handleRestoreBattery}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Battery to 68%
              </button>
            </div>
          </div>

          {/* Direct Family Recipient Broadcast Cards */}
          {activeAlert?.recipients && activeAlert.recipients.length > 0 && (
            <div className="mt-5 pt-4 border-t border-rose-500/40">
              <div className="text-[10px] uppercase font-black tracking-widest text-rose-300 mb-2">
                Dispatched Contacts ({activeAlert.recipients.length}):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {activeAlert.recipients.map((rec) => (
                  <div key={rec.contact_id} className="bg-black/60 border border-rose-500/30 p-3 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate">{rec.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{rec.phone} • {rec.relationship}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={rec.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                        title="Open WhatsApp SOS"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={rec.call_url}
                        className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition"
                        title="Direct Call"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main SOS Card */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white shadow-lg shadow-rose-500/30">
              <AlertOctagon className="w-3.5 h-3.5" />
              EMERGENCY ASSISTANCE DISPATCH
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-black dark:text-offwhite tracking-tight uppercase">One-Tap Safety SOS</h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 max-w-xl font-medium leading-relaxed">
              Instantly share verified GPS coordinates, current battery telemetry, and vehicle model with your friends, family, or road recovery team.
            </p>
          </div>

          <div className="bg-zinc-100 dark:bg-black p-4 rounded-xl border border-black/10 dark:border-white/10 shrink-0 text-xs space-y-1.5">
            <div className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Current Coordinates:</div>
            <div className="font-mono font-bold text-black dark:text-offwhite text-sm">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</div>
            <div className="text-zinc-600 dark:text-zinc-400 font-medium">{loc.address}</div>
            <div className="text-black dark:text-offwhite font-mono font-bold pt-1 border-t border-black/10 dark:border-zinc-800 flex items-center justify-between">
              <span>SoC: <strong className={currentSoc <= 10 ? 'text-rose-500' : 'text-emerald-500'}>{currentSoc}%</strong></span>
              <span>Temp: {dashboardData?.telemetry?.battery_temperature_c || 34}°C</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Zero-Battery Test Simulation */}
        <div className="mt-6 pt-6 border-t border-black/10 dark:border-zinc-800/80 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">Specific Recipient Contact:</label>
            <input
              type="text"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="+91 98111 22334"
              className="w-full bg-zinc-100 dark:bg-black border border-black/10 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-black dark:text-offwhite text-xs font-mono font-bold focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">Incident Note:</label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Battery depleted, stalled on highway shoulder..."
              className="w-full bg-zinc-100 dark:bg-black border border-black/10 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-black dark:text-offwhite text-xs font-medium focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>

          <div className="md:col-span-4 flex items-end gap-2">
            <button
              onClick={handleShareSOS}
              disabled={isDispatching}
              className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Dispatch SOS
            </button>
            <button
              onClick={handleTriggerManualZeroBatterySos}
              disabled={isDispatching}
              className="py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider bg-black text-offwhite dark:bg-offwhite dark:text-black hover:opacity-90 transition flex items-center gap-1.5 shadow"
              title="Alert all Friends & Family immediately"
            >
              <BellRing className="w-3.5 h-3.5" />
              Alert Family
            </button>
          </div>
        </div>

        {/* Quick Simulation Trigger for Demonstration */}
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-zinc-800/40 flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">Hackathon Test Trigger:</span>
            <span className="text-zinc-500 text-[11px]">Simulate the exact moment battery exhausts to 0% to test Friends &amp; Family SOS signal.</span>
          </div>
          <button
            onClick={handleSimulateZeroBattery}
            disabled={isSimulatingZero}
            className="px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5"
          >
            <BatteryWarning className="w-3.5 h-3.5 text-rose-500" />
            {isSimulatingZero ? 'Simulating...' : 'Test 0% Battery Auto-SOS'}
          </button>
        </div>

        {/* SOS Action Links if generated */}
        {shareResult && (
          <div className="mt-6 p-4 bg-zinc-50 dark:bg-black rounded-xl border border-black/10 dark:border-white/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-black dark:text-offwhite flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-rose-500" /> Emergency Broadcast Ready
              </span>
              <button
                onClick={() => copyText(shareResult.message_text)}
                className="text-xs text-zinc-500 hover:text-black dark:hover:text-offwhite flex items-center gap-1 font-bold uppercase"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-3 rounded-lg border border-black/5 dark:border-white/5 whitespace-pre-line">
              {shareResult.message_text}
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href={shareResult.links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-black text-offwhite dark:bg-offwhite dark:text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow hover:opacity-90 transition"
              >
                <MessageSquare className="w-4 h-4" />
                Open WhatsApp
              </a>
              <a
                href={shareResult.links.sms}
                className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 border border-black/10 dark:border-white/10 hover:opacity-90"
              >
                <PhoneCall className="w-4 h-4" />
                Send SMS
              </a>
              <a
                href={shareResult.links.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-black/10 dark:border-white/10"
              >
                <MapPin className="w-4 h-4 text-rose-500" />
                View Map
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Friends & Family Emergency Network Card */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-black dark:text-offwhite" />
            <div>
              <h2 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight">Friends &amp; Family SOS Circle</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                These contacts receive immediate automated alerts with live GPS when your battery hits 0% or on SOS dispatch.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Contact
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {familyContacts.map(contact => (
            <div 
              key={contact.id} 
              className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-black dark:text-offwhite">{contact.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase">
                      {contact.relationship}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Auto-SOS Enabled
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveContact(contact.id)}
                  className="text-zinc-400 hover:text-rose-500 p-1 rounded transition"
                  title="Remove contact"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="font-mono text-xs font-bold text-black dark:text-offwhite">
                {contact.phone}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-zinc-800">
                <a
                  href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition"
                >
                  <PhoneCall className="w-3 h-3" /> Call
                </a>
                <a
                  href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`🚨 [EV SOS from ${dashboardData?.vehicle?.name || "Vehicle"}]: Battery exhausted to 0% at https://www.google.com/maps?q=${loc.lat},${loc.lng}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-2 rounded-lg bg-black text-offwhite dark:bg-offwhite dark:text-black hover:opacity-90 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition"
                >
                  <MessageSquare className="w-3 h-3" /> WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add Friends & Family Contact */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase text-black dark:text-white">Add Emergency Contact</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-black dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="e.g. Papa, Sunita, Rohan"
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-black dark:text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Relationship</label>
                <input
                  type="text"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  placeholder="e.g. Father, Spouse, Close Friend, Brother"
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-black dark:text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Phone Number (with Country Code)</label>
                <input
                  type="tel"
                  required
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+91 98111 22334"
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-black dark:text-white font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingContact}
                  className="flex-1 py-2.5 rounded-xl bg-black text-offwhite dark:bg-offwhite dark:text-black font-black uppercase shadow hover:opacity-90"
                >
                  {isAddingContact ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid: Nearby Recovery Providers & Verified Emergency Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Nearby Assistance Providers */}
        <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-black dark:text-offwhite" />
            <h2 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight">Verified Roadside Recovery</h2>
          </div>

          <div className="space-y-3">
            {emergencyData?.nearby_assistance?.map(provider => (
              <div 
                key={provider.id} 
                className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-black/5 dark:border-white/5 flex items-start justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-black dark:text-offwhite uppercase">{provider.name}</h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">{provider.address} • {provider.distance_km} km away</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {provider.services?.map((svc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-zinc-200/80 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-black/5 dark:border-zinc-800 font-medium">
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={`tel:${provider.phone}`}
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-black text-offwhite dark:bg-offwhite dark:text-black border border-transparent text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow hover:opacity-90"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Emergency Protocols */}
        <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-black dark:text-offwhite" />
            <h2 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight">Manufacturer Safety Protocols</h2>
          </div>

          <div className="space-y-3">
            {emergencyData?.manufacturer_protocols?.map((proto, idx) => (
              <div key={idx} className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-black dark:text-offwhite block">{proto.issue}</span>
                <div className="space-y-1">
                  {proto.steps?.map((step, sIdx) => (
                    <p key={sIdx} className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                      {step}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
