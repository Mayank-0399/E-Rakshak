import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  AlertTriangle, 
  Flame, 
  CheckCircle2, 
  ThumbsUp, 
  ThumbsDown, 
  Info,
  Clock,
  BookOpen
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, submitAlertFeedback } from '../api';

export default function SafetyAlerts({ dashboardData, onRefresh }) {
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const loadAlerts = async () => {
    try {
      const res = await fetchAlerts();
      if (res.success) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [dashboardData]);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId);
      loadAlerts();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFeedback = async (alertId, rating) => {
    try {
      await submitAlertFeedback(alertId, {
        rating,
        feedbackText: rating === 5 ? 'Accurate and actionable' : 'Stale warning'
      });
      setFeedbackGiven(prev => ({ ...prev, [alertId]: rating }));
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          card: 'border-rose-500/40 bg-white dark:bg-zinc-950',
          badge: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
          icon: Flame
        };
      case 'high':
        return {
          card: 'border-amber-500/40 bg-white dark:bg-zinc-950',
          badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
          icon: AlertTriangle
        };
      case 'caution':
        return {
          card: 'border-yellow-500/30 bg-white dark:bg-zinc-950',
          badge: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
          icon: AlertTriangle
        };
      case 'info':
      default:
        return {
          card: 'border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950',
          badge: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
          icon: Info
        };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-black dark:text-offwhite" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Deterministic Decision Support
              </span>
            </div>
            <h1 className="text-2xl font-black text-black dark:text-offwhite uppercase tracking-tight">Safety Engine &amp; Anomaly Protocols</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Deterministic sensor-based safety rules separate from language generation models.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-black p-1 rounded-xl border border-black/10 dark:border-white/10">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'active'
                  ? 'bg-black text-offwhite dark:bg-offwhite dark:text-black shadow'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-offwhite'
              }`}
            >
              Active Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab('guidance')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'guidance'
                  ? 'bg-black text-offwhite dark:bg-offwhite dark:text-black shadow'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-offwhite'
              }`}
            >
              Battery Protocols
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'active' ? (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-12 text-center shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-black dark:text-offwhite mx-auto mb-3" />
              <h3 className="text-lg font-black text-black dark:text-offwhite uppercase tracking-wide">All Systems Nominal</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                Your battery state, temperatures, and vehicle payload are currently within certified manufacturer thresholds.
              </p>
            </div>
          ) : (
            alerts.map(alert => {
              const style = getSeverityStyle(alert.severity);
              const Icon = style.icon;
              const isFeedbackDone = feedbackGiven[alert.id];

              return (
                <div
                  key={alert.id}
                  className={`border rounded-2xl p-6 shadow-xl space-y-4 transition ${style.card}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-black border border-black/10 dark:border-white/10 shrink-0">
                        <Icon className="w-5 h-5 text-current" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight">{alert.title}</h2>
                          <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded border tracking-wider ${style.badge}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 font-medium">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          Source: {alert.trigger_source} • Confidence: {alert.confidence}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!alert.acknowledged ? (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-black text-offwhite dark:bg-offwhite dark:text-black hover:opacity-90 transition shadow"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-xs text-black dark:text-offwhite flex items-center gap-1.5 font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-current" /> Acknowledged
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                    {alert.message}
                  </p>

                  {/* 4-Part Explainability Card from Architecture.md */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs bg-zinc-50 dark:bg-black p-4 rounded-xl border border-black/5 dark:border-white/5">
                    <div>
                      <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-bold mb-1">Why it matters:</span>
                      <p className="text-zinc-800 dark:text-zinc-300">{alert.why_it_matters || 'Direct impact on journey completion and cell longevity.'}</p>
                    </div>

                    <div>
                      <span className="text-black dark:text-offwhite block uppercase tracking-wider text-[10px] font-bold mb-1">Recommended Action:</span>
                      <p className="text-zinc-800 dark:text-zinc-200 font-medium">{alert.recommended_action}</p>
                    </div>
                  </div>

                  {/* Rider Feedback Controls */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-black/10 dark:border-zinc-800/80">
                    <span className="text-zinc-500 dark:text-zinc-400">Was this alert helpful to your driving decision?</span>
                    {isFeedbackDone ? (
                      <span className="text-black dark:text-offwhite font-bold">Feedback recorded. Thank you.</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFeedback(alert.id, 5)}
                          className="flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-black dark:text-zinc-200 border border-black/10 dark:border-white/10 transition text-xs font-bold uppercase tracking-wider"
                        >
                          <ThumbsUp className="w-3 h-3 text-current" /> Yes
                        </button>
                        <button
                          onClick={() => handleFeedback(alert.id, 1)}
                          className="flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-black/10 dark:border-white/10 transition text-xs font-bold uppercase tracking-wider"
                        >
                          <ThumbsDown className="w-3 h-3 text-zinc-400" /> No
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Battery Thermal Guidance Section */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4">
            <h2 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-current" />
              Thermal Operating Envelopes (LFP / NMC)
            </h2>
            <div className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl">
                <strong className="text-black dark:text-offwhite block uppercase text-[10px] tracking-wider mb-1">20°C – 42°C (Optimal Window)</strong>
                Nominal cell discharge efficiency. Ideal conditions for normal throttle and fast charging.
              </div>
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-amber-500/30 rounded-xl">
                <strong className="text-amber-700 dark:text-amber-300 block uppercase text-[10px] tracking-wider mb-1">45°C – 52°C (Elevated Warning)</strong>
                High internal resistance. Avoid continuous full throttle, hill climbing, or charging immediately after high-speed runs.
              </div>
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-rose-500/30 rounded-xl">
                <strong className="text-rose-600 dark:text-rose-400 block uppercase text-[10px] tracking-wider mb-1">&gt; 55°C (Critical Safety Threshold)</strong>
                BMS low-power limp mode or emergency pack disconnection. Park vehicle in shade immediately and allow natural convection cooling.
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4">
            <h2 className="text-base font-black text-black dark:text-offwhite uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-current" />
              Preventive Guidelines for Light EVs
            </h2>
            <ul className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300 list-disc list-inside">
              <li><strong>Do not drain below 10% SoC:</strong> Deep discharge accelerates lead-acid sulfation and causes LFP cell imbalance.</li>
              <li><strong>Post-Ride Cooling:</strong> Wait 15 minutes after stopping before connecting to a high-current charger.</li>
              <li><strong>Monsoon Safety:</strong> Never wade through water where puddle depth reaches the vehicle hub or battery enclosure.</li>
              <li><strong>Overload Awareness:</strong> Operating with 5+ passengers increases current draw by up to 55%, causing accelerated cable heating.</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
