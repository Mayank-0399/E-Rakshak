# EV Safety Copilot — Smart Mobility Decision Support Web Application

> **Smart Mobility Hackathon MVP** built strictly according to [`architecture.md`](./architecture.md).  
> Designed for **E-rickshaw, E-scooter, and E-cycle riders** to turn available EV, trip, and map data into understandable range estimates, reachable charging recommendations, and preventive safety alerts.

---

## 🌟 Tech Stack

- **Frontend:** React 18, Tailwind CSS, Lucide Icons, Leaflet Maps
- **Backend:** Node.js, Express REST API (`/api/v1`)
- **Architecture Compliance:** Baseline deterministic energy calculation, explicit uncertainty bands (`[lower - upper km]`), zero false-safe target, and structured 4-part alerts.

---

## 🚀 Live Servers & Ports

- **Unified Production Web App:** `http://localhost:5000` (Express serves both REST APIs and built React app)
- **Vite React Dev Server:** `http://localhost:5173` (Hot Module Reload with `/api` proxy to port 5000)

---

## 🛠️ How to Run Locally

### 1. Backend Server (Node.js + Express)
```bash
cd backend
npm install
npm run dev # or npm start
# Backend runs on http://localhost:5000
```

### 2. Frontend Application (React + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
# Vite dev server runs on http://localhost:5173
```

### 3. Route API Key

Add your route key to the root `.env` file:

```env
ROUTE_API_KEY=your_route_api_key_here
```

The backend also supports `backend/.env` if you prefer keeping server variables inside the backend folder. Restart the backend after changing `.env`.

---

## 📱 Core Implemented Modules

### 1. 🎛️ Rider Dashboard
- **Usable Range with Uncertainty Interval:** Displays estimated remaining range with explicit confidence margins (e.g. `50.4 km [42.8 - 58.0 km]`).
- **Battery State of Charge (SoC):** Visual progress gauge, pack voltage (V), and motor current (A).
- **Thermal & Health Diagnostics:** Color-coded temperature warning (Optimal <42°C, Caution 45-52°C, Critical >55°C).
- **Interactive Telemetry Simulator:** Quick buttons to test live scenarios:
  - *Normal Baseline (68%)*
  - *Low Battery Caution (8%)*
  - *Thermal Overheat (56.5°C)*
  - *Overloaded Weight Payload*
  - Live sliders for SoC and temperature.
- **System Status Pill:** `OK`, `Caution`, or `Action Recommended`.

### 2. 🗺️ Plan Trip (Destination Reachability)
- **Preset Mobility Corridors:** Tested for urban routes (e.g., Connaught Place to Karol Bagh, Kashmere Gate to Noida, Delhi Ridge).
- **Deterministic Energy Feasibility Engine:**
  - `Likely Feasible` (Green)
  - `Uncertain / Tight Buffer` (Amber)
  - `Not Recommended` (Red)
- **Energy Demand Breakdown:** Required Wh, 15% safety reserve Wh, and remaining arrival battery percentage.
- **Interactive Leaflet Route Map:** Visualizes origin marker, destination marker, route polyline, and on-route road hazards.
- **Simulation Drive Playback:** Live simulation of a driving trip with real-time battery drain, automatically logging the outcome to trip history!

### 3. ⚡ Smart Charging & Swap Hubs
- **Compatibility & Reachability Filtering:** Filters stations by vehicle connector (`15A 3-pin`, `Type 2`, `CCS2`, `Sun Mobility Battery Swap`).
- **Reachability Tagging:** Computes whether station is reachable with 15% safety reserve.
- **Station Cards:** Detour distance (km), charging rate (kW), pricing (₹/kWh), available slots, and direct Google Maps navigation link.
- **Interactive Map:** Color-coded charging station pins.

### 4. 🚨 Preventive Safety & Vehicle Alerts
- **Deterministic Safety Engine:** Separate from language generation; strictly evaluates verified sensor limits.
- **4-Part Explainability Format:**
  1. **Issue Detected**
  2. **Why It Matters**
  3. **Confidence & Data Source**
  4. **Recommended Next Action**
- **User Acknowledgement & Feedback:** "Was this helpful?" feedback collection.
- **Battery Protocol Guide:** Emergency cooling and cell maintenance instructions.

### 5. ⚠️ Road Hazard Intelligence
- **Crowdsourced Hazard Map:** Waterlogging, potholes, road construction, and charger defects.
- **Submit Hazard Modal:** Allows riders to broadcast hazards with GPS coordinates and severity.
- **Community Verification:** Upvote mechanism to confirm active hazards.

### 6. 🆘 One-Tap Emergency Assistance (SOS)
- **One-Tap SOS Dispatch:** Formats current GPS coordinates, battery SoC, and temperature.
- **Direct Dispatch Links:** One-click sharing via **WhatsApp** and **SMS** to pre-configured trusted contact.
- **Nearby Recovery Hubs:** Verified mechanics, EV puncture fix, battery swap, and flatbed towing contacts.
- **Emergency Protocols:** Step-by-step guidance for battery hissing/smoke, waterlogging, and stalled vehicles.

### 7. 📊 Trip History & Accuracy Auditing
- **Predicted vs Observed Consumption:** Compares predicted Wh with actual Wh.
- **Mean Absolute Error (MAE %):** Deviation tracking across journeys.
- **False-Safe Rate Tracking:** Audits critical metric defined in Section 14 to verify safety guarantees.

### 8. ⚙️ Vehicle Profiles & Settings
- **Vehicle Fleet Profiles:** Switch between **Mahindra Treo (E-Rickshaw)**, **Ather 450X (E-Scooter)**, **Hero Lectro (E-Cycle)**, or add a Custom EV.
- **Configurable Safety Reserve:** Adjustable safety buffer slider (10% to 30%).
- **Privacy by Design:** One-click **"Wipe Stored History & Location"** button to purge stored traces.
