import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import PlanTrip from './components/PlanTrip';
import ChargingStations from './components/ChargingStations';
import EmergencyHelp from './components/EmergencyHelp';
import TripHistory from './components/TripHistory';
import Settings from './components/Settings';

import { fetchDashboard, fetchVehicles, selectVehicle } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dark / Light Mode state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ev_copilot_theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ev_copilot_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const loadData = async () => {
    try {
      const [dashRes, vehRes] = await Promise.all([
        fetchDashboard(),
        fetchVehicles()
      ]);

      if (dashRes.success) {
        setDashboardData(dashRes.data);
      }
      if (vehRes.success) {
        setVehicles(vehRes.data.vehicles || []);
        const active = vehRes.data.vehicles.find(v => v.id === vehRes.data.active_vehicle_id);
        setActiveVehicle(active || vehRes.data.vehicles[0]);
      }
    } catch (err) {
      console.error('Error loading app data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectVehicle = async (vehId) => {
    try {
      await selectVehicle(vehId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen text-zinc-900 dark:text-offwhite flex flex-col font-sans selection:bg-black selection:text-white dark:selection:bg-offwhite dark:selection:text-black transition-colors duration-200">
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        systemStatus={dashboardData?.system_status || 'OK'}
        dataSource={dashboardData?.data_source || 'simulated'}
        activeVehicle={activeVehicle}
        vehicles={vehicles}
        onSelectVehicle={handleSelectVehicle}
        alertsCount={dashboardData?.alerts_count?.total || 0}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isLoading && !dashboardData ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-black dark:border-offwhite border-t-transparent"></div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Initializing Core Telemetry Engine...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                dashboardData={dashboardData}
                onRefresh={loadData}
                onNavigate={setCurrentTab}
              />
            )}

            {(currentTab === 'plan-trip' || currentTab === 'charging') && (
              <PlanTrip
                dashboardData={dashboardData}
                onRefresh={loadData}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'emergency' && (
              <EmergencyHelp
                dashboardData={dashboardData}
              />
            )}

            {currentTab === 'history' && (
              <TripHistory />
            )}

            {currentTab === 'settings' && (
              <Settings
                dashboardData={dashboardData}
                onRefresh={loadData}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            )}
          </>
        )}
      </main>

      {/* Footer - Minimalist Adidas Performance Style */}
      <footer className="border-t border-black/10 dark:border-white/10 bg-offwhite/50 dark:bg-black py-7 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-offwhite"></span>
            <span className="text-zinc-800 dark:text-zinc-300">E-RAKSHAK • SMART EV MOBILITY ENGINE</span>
          </div>
          <div className="flex items-center gap-5 text-zinc-600 dark:text-zinc-400">
            <span>Deterministic Safety Rules</span>
            <span>Uncertainty Range Calibration</span>
            <span className="text-black dark:text-offwhite font-black">Zero False-Safe Target</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
