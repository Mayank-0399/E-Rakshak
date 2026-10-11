import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  PlusCircle, 
  ThumbsUp, 
  Waves, 
  CheckCircle2, 
  X
} from 'lucide-react';
import MapView from './MapView';
import { fetchHazards, reportHazard, upvoteHazard } from '../api';

export default function RoadHazards({ dashboardData, onRefresh }) {
  const [hazards, setHazards] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  
  const [category, setCategory] = useState('waterlogging');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(dashboardData?.telemetry?.location?.lat || 28.6250);
  const [longitude, setLongitude] = useState(dashboardData?.telemetry?.location?.lng || 77.2150);
  const [severity, setSeverity] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadHazards = async () => {
    try {
      const res = await fetchHazards({ category: selectedCategory });
      if (res.success) {
        setHazards(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHazards();
  }, [selectedCategory]);

  const handleUpvote = async (hazardId) => {
    try {
      await upvoteHazard(hazardId);
      loadHazards();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await reportHazard({
        category,
        title: title || `${category.replace('_', ' ').toUpperCase()} Reported`,
        description,
        latitude,
        longitude,
        severity
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      loadHazards();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapMarkers = hazards.map(h => ({
    lat: h.latitude,
    lng: h.longitude,
    iconType: 'hazard',
    popupContent: `
      <div>
        <strong style="color: #ef4444;">${h.title}</strong><br/>
        <span style="font-size: 11px;">${h.description}</span><br/>
        <span style="font-size: 11px;">Severity: <strong>${h.severity.toUpperCase()}</strong></span><br/>
        <span style="font-size: 11px;">Upvotes: <strong>${h.upvotes}</strong></span>
      </div>
    `
  }));

  if (dashboardData?.telemetry?.location) {
    mapMarkers.push({
      lat: dashboardData.telemetry.location.lat,
      lng: dashboardData.telemetry.location.lng,
      iconType: 'vehicle',
      popupContent: `<strong>Current Location</strong>`
    });
  }

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-black dark:text-offwhite" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Community Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-black text-black dark:text-offwhite uppercase tracking-tight">Road Hazard Surveillance</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Live crowdsourced reports of waterlogging, hazardous craters, and charger outages.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-black text-offwhite dark:bg-offwhite dark:text-black hover:opacity-90 transition shadow-lg"
          >
            <PlusCircle className="w-4 h-4" />
            Broadcast Hazard
          </button>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 pt-5 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Hazards' },
            { id: 'waterlogging', label: 'Waterlogging (Immersion Risk)' },
            { id: 'pothole', label: 'Severe Craters' },
            { id: 'construction', label: 'Road Construction' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`text-xs px-3.5 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition ${
                selectedCategory === c.id
                  ? 'bg-black text-offwhite dark:bg-offwhite dark:text-black border-transparent shadow-md'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border-black/10 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Map & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Map */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-xl dark:shadow-2xl transition-colors">
            <h2 className="text-xs font-black text-black dark:text-offwhite uppercase tracking-widest mb-3">Hazard Spatial Coordinate Grid</h2>
            <MapView
              center={[28.6358, 77.2250]}
              zoom={12}
              markers={mapMarkers}
              className="h-[480px] w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10"
            />
          </div>
        </div>

        {/* Right: Hazard Cards */}
        <div className="lg:col-span-6 space-y-3.5">
          {hazards.map(h => (
            <div
              key={h.id}
              className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-lg dark:shadow-2xl space-y-3.5 hover:border-black/20 dark:hover:border-white/25 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-black text-black dark:text-white border border-black/10 dark:border-white/10 shrink-0">
                    {h.category === 'waterlogging' ? <Waves className="w-5 h-5 text-blue-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight">{h.title}</h3>
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded border border-black/10 dark:border-white/15 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                        {h.severity}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 font-medium">{h.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleUpvote(h.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-black dark:text-white border border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-wider transition"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-current" />
                  <span>{h.upvotes}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-black/10 dark:border-zinc-800/80">
                <span className="flex items-center gap-1 text-zinc-800 dark:text-zinc-300 font-bold uppercase tracking-wider text-[10px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-black dark:text-white" /> {h.verification_status.replace('_', ' ')}
                </span>
                <span className="font-mono">{h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Modal: Report New Hazard */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/20 dark:border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Broadcast Hazard
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-600 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Hazard Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-bold uppercase tracking-wider"
                >
                  <option value="waterlogging">Waterlogging (Submersion Risk)</option>
                  <option value="pothole">Deep Potholes / Broken Trench</option>
                  <option value="construction">Construction Detour</option>
                  <option value="broken_charger">Broken / Out-of-service Charger</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-600 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Title / Landmark</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Minto Bridge Underpass Submerged"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-zinc-600 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Detailed Risk Profile</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe water depth or hazard to bottom-mounted battery packs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-600 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-600 dark:text-zinc-400 block mb-1 uppercase tracking-wider text-[10px] font-bold">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-black dark:text-white font-bold uppercase tracking-wider"
                >
                  <option value="low">Low (Passable with caution)</option>
                  <option value="medium">Medium (Significant risk/delay)</option>
                  <option value="high">High (Severe danger / Battery risk)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-black text-offwhite dark:bg-offwhite dark:text-black font-black uppercase tracking-wider hover:opacity-90"
                >
                  {isSubmitting ? 'Submitting...' : 'Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
