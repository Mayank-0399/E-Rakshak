import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle
} from 'lucide-react';
import { fetchTrips } from '../api';

export default function TripHistory() {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadTrips = async () => {
      try {
        setIsLoading(true);
        const res = await fetchTrips();
        if (res.success) {
          setTrips(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTrips();
  }, []);

  const completedTrips = trips.filter(t => t.status === 'completed' && t.actual_energy_wh);
  const avgError = completedTrips.length > 0
    ? Math.round(completedTrips.reduce((acc, t) => acc + (t.prediction_error_percent || 0), 0) / completedTrips.length * 10) / 10
    : 0;
  const falseSafeCount = completedTrips.filter(t => t.false_safe).length;
  const falseSafeRate = completedTrips.length > 0
    ? Math.round((falseSafeCount / completedTrips.length) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-black dark:text-offwhite" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Data Provenance &amp; Verification
              </span>
            </div>
            <h1 className="text-2xl font-black text-black dark:text-offwhite uppercase tracking-tight">Trip History &amp; Model Accuracy</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Auditing predicted range vs observed energy consumption and false-safe metrics.
            </p>
          </div>
        </div>

        {/* Section 14 Key Evaluation Metrics Cards */}
        <div className="mt-6 pt-5 border-t border-black/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-50 dark:bg-black p-4 rounded-xl border border-black/10 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">Recorded Trips</span>
            <span className="text-3xl font-mono font-black text-black dark:text-offwhite">{trips.length}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">{completedTrips.length} completed journeys</span>
          </div>

          <div className="bg-zinc-50 dark:bg-black p-4 rounded-xl border border-black/10 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">Mean Prediction Error</span>
            <span className="text-3xl font-mono font-black text-black dark:text-offwhite">{avgError}%</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">Energy consumption deviation</span>
          </div>

          <div className="bg-zinc-50 dark:bg-black p-4 rounded-xl border border-black/10 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">False-Safe Occurrence</span>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-mono font-black ${falseSafeCount === 0 ? 'text-black dark:text-offwhite' : 'text-rose-500'}`}>
                {falseSafeRate}%
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">({falseSafeCount} incidents)</span>
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">Zero-tolerance safety metric</span>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden transition-colors">
        <div className="p-5 border-b border-black/10 dark:border-white/10">
          <h2 className="text-xs font-black text-black dark:text-offwhite uppercase tracking-widest">Journeys &amp; Energy Audits</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-black text-zinc-500 dark:text-zinc-400 border-b border-black/10 dark:border-white/10 uppercase tracking-widest font-black text-[10px]">
              <tr>
                <th className="p-4">Route</th>
                <th className="p-4">Distance</th>
                <th className="p-4">Predicted Energy</th>
                <th className="p-4">Actual Energy</th>
                <th className="p-4">Prediction Error</th>
                <th className="p-4">Safety Audit</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
              {trips.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-zinc-400 dark:text-zinc-500 font-medium">
                    No trips recorded yet. Plan and simulate a journey in the "Plan Trip" tab.
                  </td>
                </tr>
              ) : (
                trips.map(trip => (
                  <tr key={trip.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-black dark:text-offwhite uppercase">{trip.origin_name} → {trip.destination_name}</div>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {new Date(trip.started_at).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-black dark:text-offwhite">{trip.distance_km} km</td>
                    <td className="p-4 font-mono text-zinc-500 dark:text-zinc-400">{trip.predicted_energy_wh} Wh</td>
                    <td className="p-4 font-mono font-bold text-black dark:text-offwhite">
                      {trip.actual_energy_wh ? `${trip.actual_energy_wh} Wh` : '—'}
                    </td>
                    <td className="p-4">
                      {trip.prediction_error_percent !== null ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 text-black dark:text-zinc-200 border border-black/10 dark:border-white/10">
                          {trip.prediction_error_percent}%
                        </span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-600">Pending</span>
                      )}
                    </td>
                    <td className="p-4">
                      {trip.false_safe ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30">
                          False Safe Flagged
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-900 text-black dark:text-offwhite border border-black/10 dark:border-white/20 flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3 text-current" /> Safe Passed
                        </span>
                      )}
                    </td>
                    <td className="p-4 uppercase">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border border-black/5 dark:border-zinc-800">
                        {trip.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
