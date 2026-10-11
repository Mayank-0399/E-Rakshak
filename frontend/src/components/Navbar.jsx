import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Zap, 
  Navigation, 
  Bell, 
  Sliders, 
  Clock, 
  LifeBuoy, 
  Radio,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  systemStatus = 'OK', 
  dataSource = 'simulated',
  activeVehicle,
  vehicles = [],
  onSelectVehicle,
  alertsCount = 0,
  theme = 'dark',
  onToggleTheme
}) {
  const getStatusBadge = () => {
    switch (systemStatus) {
      case 'Action recommended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30 animate-pulse">
            <AlertOctagon className="w-3.5 h-3.5" />
            Action Required
          </span>
        );
      case 'Caution':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Caution
          </span>
        );
      case 'OK':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-offwhite"></span>
            System OK
          </span>
        );
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
    { id: 'plan-trip', label: 'Plan Trip', icon: Navigation },
    { id: 'history', label: 'Trips & Stats', icon: Clock },
    { id: 'emergency', label: 'SOS Help', icon: LifeBuoy, highlight: true },
    { id: 'settings', label: 'Settings', icon: Sliders }
  ];

  return (
    <header className="sticky top-0 z-50 bg-offwhite/90 dark:bg-black/90 backdrop-blur-xl border-b border-black/10 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main top bar */}
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Emblem (Minimalist Adidas-inspired 3-stripe mark) */}
          <div className="flex items-center gap-5">
            <div 
              onClick={() => setCurrentTab('dashboard')} 
              className="flex items-center gap-3 cursor-pointer group"
            >
              {/* Minimal 3-stripe geometric emblem */}
              <div className="flex items-end gap-1 h-7">
                <div className="w-1 h-3.5 bg-zinc-400 dark:bg-zinc-500 group-hover:bg-black dark:group-hover:bg-zinc-300 transition-colors rounded-sm"></div>
                <div className="w-1 h-5.5 bg-zinc-700 dark:bg-zinc-300 group-hover:bg-black dark:group-hover:bg-offwhite transition-colors rounded-sm"></div>
                <div className="w-1 h-7 bg-black dark:bg-offwhite rounded-sm"></div>
              </div>

              <div>
                <span className="text-base font-black tracking-tight text-black dark:text-offwhite flex items-center gap-2">
                  E-RAKSHAK
                  <span className="text-[10px] font-bold bg-black dark:bg-offwhite text-offwhite dark:text-black px-1.5 py-0.2 rounded tracking-widest">
                    PRO
                  </span>
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium tracking-tight block">
                  Intelligent EV Safety &amp; Decision Support
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2.5 pl-4 border-l border-zinc-300 dark:border-zinc-800">
              {getStatusBadge()}
              
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-zinc-200/80 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-800">
                <Radio className="w-3 h-3 text-black dark:text-zinc-300" />
                <span>{dataSource}</span>
              </span>
            </div>
          </div>

          {/* Right Action Controls: Vehicle Selector & Dark/Light Mode Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg bg-zinc-200/80 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/10 transition shadow-sm"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )}
            </button>

            {/* Vehicle Selector Dropdown */}
            {vehicles.length > 0 && (
              <div className="flex items-center gap-2 bg-zinc-200/80 dark:bg-gradient-to-b dark:from-zinc-900 dark:to-black px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/15 text-xs shadow-inner">
                <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] hidden sm:inline">Active:</span>
                <select 
                  className="bg-transparent text-black dark:text-offwhite font-bold focus:outline-none cursor-pointer text-xs uppercase tracking-wide"
                  value={activeVehicle?.id || ''}
                  onChange={(e) => onSelectVehicle && onSelectVehicle(e.target.value)}
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id} className="bg-white dark:bg-zinc-950 text-black dark:text-offwhite">
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs - High-contrast Monochrome */}
        <nav className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-2.5 border-t border-black/5 dark:border-white/5 no-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap relative ${
                  isActive
                    ? item.highlight
                      ? 'bg-rose-500 text-white shadow-lg'
                      : 'bg-black text-offwhite dark:bg-offwhite dark:text-black font-black shadow-lg shadow-black/10 dark:shadow-white/10'
                    : item.highlight
                    ? 'text-rose-500 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-offwhite hover:bg-zinc-200/60 dark:hover:bg-zinc-900/90'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive && !item.highlight ? 'text-current' : ''}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
