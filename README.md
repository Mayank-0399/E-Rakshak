# ⚡ E-Rakshak (ई-रक्षक) — Smart EV Mobility Decision Support System

> **A real-world, physics-backed copilot built for India's electric micro-mobility riders (E-Rickshaws, Delivery Scooters & E-Cycles) who cannot afford to be stranded.**

[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green?style=flat-square)](https://nodejs.org/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-blue?style=flat-square)](https://react.dev/)
[![Routing](https://img.shields.io/badge/Navigation-TomTom%20Live%20Traffic-orange?style=flat-square)](https://developer.tomtom.com/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet%20OSM-brightgreen?style=flat-square)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

---

## 💡 Why We Built This (The Real Problem)

If you talk to an electric rickshaw driver in Delhi or Varanasi, or a Zomato/Blinkit delivery rider in Bengaluru on an electric scooter, you quickly realize one harsh truth:

> **The battery percentage on a digital dashboard lies.**

A battery gauge might show **35%**, so the driver assumes they have another 20 kilometers left. But once they load 4 passengers or 80 kg of cargo, hit an incline, face peak 45°C summer heat, or get stuck in bumper-to-bumper traffic:
- Current spikes dramatically.
- Pack voltage sags under load.
- The battery drops from 30% to 0% in just 4 kilometers.
- The driver ends up stranded in the middle of a flyover with zero power, losing their day's earnings, or worse, pushing a 450 kg vehicle in dangerous traffic.

Most commercial navigation apps (like Google Maps) treat EVs like petrol cars: they assume a straight road with infinite range. They don't know your pack capacity, your current motor temperature, your battery chemistry (LFP vs. NMC), or whether that charger down the street actually has a plug that fits your vehicle.

**E-Rakshak** is our solution to this problem. It is an open, transparent, glass-box decision support tool that does real physics calculations before you start your trip, routes you through reachable chargers, and triggers emergency SOS if battery ever fails.

---

## 🧠 The Mathematics & Physics Behind E-Rakshak

We deliberately avoid "black box AI" that guesses random numbers. Every metric you see on the screen can be proven with basic electrical engineering and thermodynamics formulas:

### 1. Usable Battery Energy ($E_{\text{usable}}$)
A battery cannot and should never be depleted to absolute 0% without permanently damaging the lithium cells or triggering BMS low-voltage cutoff.

$$\mathbf{E_{\text{usable}} = C_{\text{battery}} \times \left(\frac{\text{SoC}}{100}\right) \times \eta_{\text{usable}}}$$

- **$C_{\text{battery}}$**: Nominal pack capacity in Watt-hours (Wh). For a Mahindra Treo, this is $7,370\text{ Wh}$; for an Ather 450X, it is $3,700\text{ Wh}$.
- **$\text{SoC}$**: Current State of Charge (0 to 100%).
- **$\eta_{\text{usable}}$**: Safe usable fraction set by the battery manufacturer (typically $0.90$, reserving the bottom 10% to prevent cell inversion).

*Example:* A $7,370\text{ Wh}$ e-rickshaw at $60\%\text{ SoC}$ has:
$$E_{\text{usable}} = 7370 \times 0.60 \times 0.90 = \mathbf{3,979.8\text{ Wh}}$$

---

### 2. Adjusted Consumption Rate ($C_{\text{adj}}$)
Your vehicle’s rated efficiency (e.g., $78\text{ Wh/km}$ on a flat test track) changes drastically in the real world. We calculate an adjusted rate using four real-world physics multipliers:

$$\mathbf{C_{\text{adj}} = C_{\text{nominal}} \times M_{\text{load}} \times M_{\text{temp}} \times M_{\text{terrain}} \times M_{\text{traffic}}}$$

#### The 4 Physical Multipliers:
1. **Payload Multiplier ($M_{\text{load}}$):**
   - *Empty / Rider Only:* $1.0\times$
   - *Normal Cargo / 2 Passengers:* $1.15\times$
   - *Heavy Cargo / 4 Passengers:* $1.35\times$
   - *Overloaded:* $1.55\times$ (High rolling resistance and inertia)
2. **Thermal Multiplier ($M_{\text{temp}}$):**
   Lithium batteries suffer internal resistance spikes at temperature extremes:
   - *Ideal (20°C to 35°C):* $1.0\times$
   - *Mild Cold / Mild Heat (35°C to 42°C):* $1.08\times$
   - *Severe Indian Summer Heat (>45°C):* $1.25\times$
   - *Freezing Cold (<10°C):* $1.20\times$
3. **Terrain Incline ($M_{\text{terrain}}$):**
   - *Urban Flat:* $1.0\times$
   - *Rolling Flyovers / Gentle Slopes:* $1.12\times$
   - *Steep Ghât / Hilly Terrain:* $1.35\times$
4. **Traffic Congestion ($M_{\text{traffic}}$):**
   Micro-mobility vehicles lose significant energy in stop-and-go acceleration cycles:
   - *Light / Free Flow:* $0.95\times$
   - *Moderate City Driving:* $1.05\times$
   - *Severe Bumper-to-Bumper Jam:* $1.20\times$

---

### 3. Usable Estimated Range ($R_{\text{usable}}$) & Uncertainty Band
Instead of promising a single false number, E-Rakshak gives the driver a realistic **nominal range with an explicit $\pm 15\%$ safety window**:

$$\mathbf{R_{\text{nominal}} = \frac{E_{\text{usable}}}{C_{\text{adj}}}}$$

$$\mathbf{\text{Range Interval} = \left[ R_{\text{nominal}} \times 0.85 \quad\text{to}\quad R_{\text{nominal}} \times 1.15 \right]}$$

- **Conservative (Lower Bound -15%):** Headwinds, aggressive throttling, heavy braking.
- **Nominal (P50 Baseline):** Standard steady driving.
- **Optimistic (Upper Bound +15%):** Smooth coasting and regenerative braking capture.

---

### 4. Trip Feasibility & Zero False-Safe Target
When a driver plans a trip of distance $d\text{ km}$:
1. **Trip Energy Demand:** $E_{\text{trip}} = d \times C_{\text{adj}}$
2. **Safety Reserve Buffer:** $E_{\text{reserve}} = E_{\text{usable}} \times 0.15$ (15% reserve buffer)
3. **Feasibility Decision Logic:**
   - **Likely Feasible (Green):** $E_{\text{usable}} \ge (E_{\text{trip}} + E_{\text{reserve}})$
   - **Uncertain / Tight Margin (Amber):** $E_{\text{trip}} \le E_{\text{usable}} < (E_{\text{trip}} + E_{\text{reserve}})$
   - **Not Recommended / High Risk (Red):** $E_{\text{usable}} < E_{\text{trip}}$

> **Zero False-Safe Rule:** We would rather warn a driver that a trip is risky when it might have been barely possible, than tell them a trip is safe and have them get stranded on an unlit road at midnight.

---

### 5. Shortest Route via Charging Station (Two-Leg Navigation)
When a driver selects **"Via Charging Station"** in the trip planner:
1. The system searches verified EV chargers around the origin and route corridor.
2. It filters out incompatible plugs (e.g. CCS2 guns that an e-rickshaw cannot plug into).
3. It identifies the **single closest compatible charger** with the lowest detour.
4. It computes real road driving paths using the TomTom API in two distinct legs:
   $$\text{Total Road Distance} = \text{Distance}(\text{Origin} \to \text{Charger}) + \text{Distance}(\text{Charger} \to \text{Destination})$$
5. It computes arrival battery percentage at the station:
   $$\text{Arrival SoC} = \max\left(0, \text{SoC}_{\text{current}} - \left[\frac{\text{Leg}_1 \times C_{\text{nominal}}}{C_{\text{battery}}} \times 100\right]\right)$$
6. It estimates the exact top-up energy (in kWh) the driver needs to take on before heading to their final destination.

---

## 🛠️ Key Features of E-Rakshak

### 1. 🎛️ Live Driver Dashboard
- Visual SoC gauge with voltage, amperage, and real-time pack temperature.
- Dynamic Usable Range with the $\pm 15\%$ uncertainty interval.
- **Sandbox Simulator:** Test scenarios in one click (Normal 68%, Low Battery 8%, Thermal Overheat 56.5°C, or Heavy Overload).
- Transparent **"How Range is Calculated"** formula modal.

### 2. 🗺️ Consolidated Trip Planner (Two Simple Modes)
No cluttered menus. Drivers pick between two clear options:
- **📏 Shortest Direct Route:** Calculates the shortest point-to-point path using real road turn-by-turn geometry.
- **⚡ Shortest Route via Charging Station:** Automatically identifies the **single nearest compatible charger** along the journey, pops up its specs (kW, plugs, tariff, arrival SoC), and draws the full connected road polyline directly through the station.

### 3. 🇮🇳 Live Pan-India EV Charging Network
- Powered by live **TomTom EV Category Search (POI 7309)** covering every city and state across India (Delhi-NCR, Lucknow, Kanpur, Varanasi, Bengaluru, Mumbai, Pune, Hyderabad, Chennai, Kolkata, Jaipur, etc.).
- Normalizes all local connectors:
  - `15A_3pin` (Standard household socket used by 95% of e-rickshaws)
  - `Type_2` (Mennekes AC chargers)
  - `CCS2` (Fast DC guns)
  - `Battery_Swap` (Sun Mobility / smart swap stations)
  - `Ather_Dot` (Ather Grid proprietary points)
- Multi-tier resolver prevents cross-state routing bugs by prioritizing geographic proximity.

### 4. 🚨 Preventive Safety Rules (Deterministic Engine)
Does not rely on hallucinating AI models. Runs verified mathematical thresholds:
- **Low SoC Lockout:** Triggers before cells hit critical depth-of-discharge.
- **Thermal Runaway Warning:** Triggers at 48°C (Caution) and 55°C (Critical), advising the driver to park in the shade and disconnect master isolator.
- **Payload Overload Detection:** Alerts when cargo exceeds vehicle rating by >25%.

### 5. 🆘 Automatic Zero-Battery & One-Tap SOS
- **Zero-Battery Emergency Trigger:** The moment battery drops to 0%, E-Rakshak immediately activates emergency protocols.
- **One-Tap WhatsApp & SMS Sharing:** Formats vehicle name, exact GPS latitude/longitude, Google Maps pin link, battery state, and custom note into a ready-to-send emergency message for friends, family, or fleet operators.
- **Emergency Checklist:** Safety advice for smoking packs, water ingress, and breakdowns.

### 6. 📄 Standalone Architecture & Formulas PDF
- Includes complete mathematical specifications, system diagrams, and formulas in [FORMULAS_AND_ARCHITECTURE.html](./FORMULAS_AND_ARCHITECTURE.html) and [E_Rakshak_Formulas_and_Architecture.pdf](./E_Rakshak_Formulas_and_Architecture.pdf).

---

## 💻 Tech Stack & Architecture

```
E-Rakshak Project Structure
├── backend/
│   ├── data/
│   │   └── mockDatabase.js         # Curated EV hubs, vehicles, and initial telemetry
│   ├── services/
│   │   ├── rangeEstimationService.js# Baseline physics, multipliers, and uncertainty
│   │   ├── chargingService.js      # Pan-India TomTom EV live search & scoring
│   │   ├── routeService.js         # TomTom routing & photon geocoding
│   │   ├── tripService.js          # Two-leg via-charger routing & feasibility
│   │   ├── safetyRulesService.js   # Deterministic safety rule triggers
│   │   └── emergencyService.js     # WhatsApp/SMS dispatch generator
│   └── server.js                   # Express REST API (Port 5001)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # Driver metrics & telemetry sandbox
│   │   │   ├── PlanTrip.jsx        # Direct shortest & via-charger navigation
│   │   │   ├── MapView.jsx         # Leaflet map with custom EV, stopover & hazard icons
│   │   │   ├── EmergencyHelp.jsx   # One-tap SOS & roadside rescue
│   │   │   ├── TripHistory.jsx     # Logged trip audits & MAE tracking
│   │   │   └── Navbar.jsx          # Clean navigation header & theme switcher
│   │   ├── api.js                  # Frontend API client
│   │   └── App.jsx                 # Application shell & state manager
│   ├── index.html                  # HTML entry point
│   └── vite.config.js              # Vite build setup (Port 5173)
├── FORMULAS_AND_ARCHITECTURE.md    # Complete mathematical specification
├── FORMULAS_AND_ARCHITECTURE.html  # Formatted HTML document
└── E_Rakshak_Formulas_and_Architecture.pdf # Compiled print-ready PDF
```

---

## 🚀 How to Run E-Rakshak Locally

### Prerequisites
- **Node.js** (v18 or newer)
- **npm** (v9 or newer)

### Step 1: Clone the Repository
```bash
git clone https://github.com/apoorvrajawat/E-Rakshak.git
cd E-Rakshak
```

### Step 2: Configure Environment Variables
Create or verify `backend/.env`:
```env
PORT=5001
TOMTOM_API_KEY=your_tomtom_api_key_here
```
*(A working TomTom key is provided for testing real-time Indian traffic, geocoding, and EV station search).*

### Step 3: Install & Start Backend
```bash
cd backend
npm install
npm run dev
```
The backend will launch on `http://localhost:5001`. You should see:
```
⚡ E-Rakshak Backend running on http://localhost:5001
```

### Step 4: Install & Start Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The web app will be available at **`http://localhost:5173/`**.

---

## 🧪 Testing Common Scenarios

1. **Test Direct Shortest Route:**
   - Go to **Plan Trip**.
   - Origin: `Lanka, Varanasi`
   - Destination: `Cantt Railway Station, Varanasi`
   - Select **📏 Shortest Route** ➔ Click **Plan This Route**.
   - See direct road polyline, distance (~7.6 km), and energy demand.

2. **Test Route via Nearest Charging Station:**
   - In **Plan Trip**, select **⚡ Via Charging Station**.
   - Click **Plan This Route**.
   - Notice that **only the single nearest compatible station** pops up (*Hotel Ganges Grand Godowlia*).
   - The map draws the complete two-leg path: Lanka ➔ Charger ➔ Cantt.

3. **Test Zero-Battery Automatic SOS:**
   - Go to **Dashboard**.
   - In the Telemetry Sandbox, slide **Battery SoC** to **0%**.
   - The system immediately triggers the emergency alert with quick WhatsApp/SMS dispatch links to emergency contacts.

---

## 👥 Authors & Acknowledgments

- **Built for:** E-micromobility Hackathon 2026
- **Lead Developer:** [Apoorv Singh](https://github.com/apoorvrajawat)
- **Design Philosophy:** Human-first, transparent physics, zero false-safety promises.
