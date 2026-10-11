import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({
  center = [28.6139, 77.2090],
  zoom = 13,
  routeWaypoints = [],
  markers = [],
  className = "h-96 w-full rounded-xl overflow-hidden shadow-inner border border-slate-800"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map instance once
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false // Allow page to scroll smoothly without map capturing wheel events
      });

      // Enable zoom if user explicitly holds Ctrl or Cmd while scrolling over map
      const container = mapContainerRef.current;
      if (container) {
        container.addEventListener('wheel', (e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
              map.zoomIn();
            } else if (e.deltaY > 0) {
              map.zoomOut();
            }
          }
        }, { passive: false });
      }

      // OpenStreetMap tiles do not require a separate frontend map tile API key.
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;

    // Clear previous markers & polylines
    layerGroup.clearLayers();

    // Custom Icon generator helper
    const createCustomIcon = (type, color = '#10b981', label = '') => {
      let iconHtml = '';
      if (type === 'vehicle') {
        iconHtml = `<div style="background-color: #0284c7; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <span style="font-size: 16px;">🛺</span>
        </div>`;
      } else if (type === 'station') {
        iconHtml = `<div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <span style="font-size: 15px;">⚡</span>
        </div>`;
      } else if (type === 'hazard') {
        iconHtml = `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); animation: pulse 2s infinite;">
          <span style="font-size: 14px;">⚠️</span>
        </div>`;
      } else if (type === 'origin') {
        iconHtml = `<div style="background-color: #6366f1; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <span style="font-size: 14px;">A</span>
        </div>`;
      } else if (type === 'destination') {
        iconHtml = `<div style="background-color: #f59e0b; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <span style="font-size: 14px;">🏁</span>
        </div>`;
      } else {
        iconHtml = `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #ffffff;"></div>`;
      }

      return L.divIcon({
        className: 'custom-leaflet-icon',
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -20]
      });
    };

    // Add markers
    const bounds = [];
    markers.forEach(m => {
      if (m.lat && m.lng) {
        const marker = L.marker([m.lat, m.lng], {
          icon: createCustomIcon(m.iconType || 'default', m.color, m.label)
        });

        if (typeof m.onClick === 'function') {
          marker.on('click', () => m.onClick(m));
        }

        if (m.popupContent) {
          marker.bindPopup(m.popupContent);
        }

        marker.addTo(layerGroup);
        bounds.push([m.lat, m.lng]);
      }
    });

    // Draw route polyline if waypoints provided
    if (routeWaypoints && routeWaypoints.length > 1) {
      const normalizedWaypoints = routeWaypoints.map(wp => 
        Array.isArray(wp) ? wp : [wp.lat, wp.lng]
      );

      const polyline = L.polyline(normalizedWaypoints, {
        color: '#10b981',
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1.0,
        dashArray: '8, 8'
      }).addTo(layerGroup);

      // Add slight outer glow
      L.polyline(normalizedWaypoints, {
        color: '#059669',
        weight: 9,
        opacity: 0.35
      }).addTo(layerGroup);

      normalizedWaypoints.forEach(wp => bounds.push(wp));
    }

    // Fit map bounds if multiple markers or route exists
    if (bounds.length > 1) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (err) {
        map.setView(center, zoom);
      }
    } else if (bounds.length === 1) {
      map.setView(bounds[0], zoom);
    } else {
      map.setView(center, zoom);
    }

    // Trigger map invalidation on resize
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [center, zoom, routeWaypoints, markers]);

  return (
    <div className={`relative z-0 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full min-h-[320px]" />
      <div className="absolute bottom-2 left-2 z-[25] pointer-events-none select-none text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/85 dark:bg-black/85 backdrop-blur-sm text-zinc-600 dark:text-zinc-400 border border-black/10 dark:border-white/10 shadow-sm">
        Scroll moves page • Use +/- or ⌘+Scroll to zoom
      </div>
    </div>
  );
}
