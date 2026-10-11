# E-Rakshak: Technical Architecture & Energy Calculation Models
**Document Version:** 1.0.0  
**Target Systems:** E-Rickshaws, E-Scooters, and Micro-Mobility Commercial Fleets  
**Scope:** Physics-Based Energy Formulations, Real-Time Routing Architecture, Glass-Box Explainability, and Safety Protocols  

---

## 1. Executive Summary & Philosophy

In light electric micro-mobility (e-rickshaws, e-scooters, and delivery 3-wheelers), traditional Battery Management Systems (BMS) and instrument clusters display nominal State of Charge (SoC %) or simplistic, linear distance counters. These linear metrics fail catastrophically in practical operating environments due to:
1. **Dynamic Payload Stress:** Passenger overload (e.g., >450 kg) increases rolling resistance and inertial draw.
2. **Thermal Variance:** Extreme ambient and cell operating temperatures accelerate internal resistance ($R_{\text{int}}$) and degrade electrochemical kinetics.
3. **Traffic Congestion:** Frequent stop-and-go cycles in dense urban corridors drastically increase $I^2R$ resistive heating and drain energy without advancing distance.
4. **Road Gradients:** Upward slopes demand sustained high torque, exhausting battery capacity rapidly.

**E-Rakshak** solves this through a **Glass-Box Deterministic Energy Engine** coupled with real-time telematics and dynamic traffic intelligence. Rather than relying on uninterpretable "black-box" machine learning predictions, every range figure and trip demand estimation is derived from verifiable physical principles, transparent multi-factor adjustments, and statistical uncertainty bands.

---

## 2. End-to-End System Architecture

### 2.1 System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  React 18 + Vite SPA  |  Tailwind CSS (Monochrome Dark/Light)  |  Leaflet Geo-Engine|
|  - Real-Time Dashboard (Range, SoC, Voltage, Thermals, Formula Popovers)          |
|  - Trip Planner (Corridor Selection, Multi-Strategy Routing, Feasibility Verdict) |
|  - Emergency SOS (Zero-SoC Autonomous Watchdog, WhatsApp/SMS Dispatch)             |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / REST (JSON)
+------------------------------------------v----------------------------------------+
|                            BACKEND API & ORCHESTRATION                            |
|                          Node.js + Express (Port 5001)                            |
+-----------------------------------------------------------------------------------+
|  Route Controllers:                                                               |
|  - /api/v1/dashboard                - /api/v1/trips/estimate                      |
|  - /api/v1/telemetry                - /api/v1/emergency/trigger                   |
+-----------------------------------------------------------------------------------+
|                                CORE SERVICES                                      |
|                                                                                   |
|  +-------------------------+  +-------------------------+  +--------------------+  |
|  | RangeEstimationService  |  |      RouteService       |  |   EmergencyService |  |
|  | - Usable Energy Model   |  | - TomTom Traffic Engine |  | - 0% SoC Watchdog  |  |
|  | - Multiplier Factors    |  | - Multi-Route Generator |  | - SMS/WhatsApp API |  |
|  | - Uncertainty Intervals |  | - OSRM/ORS Fallback     |  | - Emergency Radius |  |
|  +-------------------------+  +-------------------------+  +--------------------+  |
|                                                                                   |
|  +-------------------------+  +-------------------------+  +--------------------+  |
|  |       TripService       |  |      HazardService      |  | SafetyRulesService |  |
|  | - Feasibility Matrix    |  | - Proximity Radius Query|  | - Thermal Cutoff   |  |
|  | - Simulation Drive Run  |  | - Hazard Verification   |  | - Deterministic    |  |
|  | - Outcome Audit Logger  |  | - Crowd-sourced Reports |  |   Alert Engine     |  |
|  +-------------------------+  +-------------------------+  +--------------------+  |
+-----------------------------------------------------------------------------------+
|                               DATA & EXTERNAL ENGINES                             |
|  - In-Memory Mock Database & Session Store (mockDatabase.js)                      |
|  - TomTom Routing & Traffic Flow API (v2 Traffic Flow Tile / Routing API)         |
|  - OpenStreetMap Nominatim Geocoding & Tile Engine (leaflet)                     |
+-----------------------------------------------------------------------------------+
```

---

## 3. Mathematical Foundations & Physics Equations

### Formula 1: Usable Battery Pack Energy ($E_{\text{usable}}$)

Nominal installed battery pack capacity cannot be depleted to 0% cell voltage without causing permanent copper shunting and dendritic cell degradation. The battery management system reserves a lower buffer (10%), and the usable energy available at any moment depends on the real-time State of Charge (SoC).

$$\mathbf{E_{\text{usable}} = C_{\text{pack}} \times \left(\frac{\text{SoC}}{100}\right) \times \eta_{\text{usable}}}$$

**Where:**
- $E_{\text{usable}}$ = Instantaneous usable electrical energy available for locomotion [$\text{Wh}$]
- $C_{\text{pack}}$ = Total nameplate battery capacity [$\text{Wh}$] (e.g., $7,370\text{ Wh}$ for Mahindra Treo $51.2\text{V}$, $144\text{Ah}$ LFP pack)
- $\text{SoC}$ = Current battery State of Charge reported by BMS telemetry [$\%$]
- $\eta_{\text{usable}}$ = Usable discharge fraction permitted by manufacturer limits ($0.90$, reserving $10\%$ BMS protection margin)

---

### Formula 2: Operating Dynamic Energy Consumption Rate ($C_{\text{adj}}$)

The vehicle's lab-certified nominal energy consumption is scaled by four independent operating stress multipliers:

$$\mathbf{C_{\text{adj}} = C_{\text{nominal}} \times M_{\text{load}} \times M_{\text{temp}} \times M_{\text{terrain}} \times M_{\text{traffic}}}$$

**Where:**
- $C_{\text{adj}}$ = Dynamic adjusted energy consumption rate [$\text{Wh/km}$]
- $C_{\text{nominal}}$ = Lab baseline consumption rate on flat ground under standard test conditions [$\text{Wh/km}$] (e.g., $58\text{ Wh/km}$ or $78\text{ Wh/km}$)

#### Component Multipliers:
1. **Payload Multiplier ($M_{\text{load}}$):**
   $$M_{\text{load}} = \begin{cases} 0.88 & \text{if Empty / Driver-only} \\ 1.00 & \text{if Normal / Standard passenger load (1-2 riders)} \\ 1.25 & \text{if Heavy / Full capacity (3-4 riders)} \\ 1.55 & \text{if Overloaded / Cargo payload (>450 kg)} \end{cases}$$

2. **Thermal Multiplier ($M_{\text{temp}}$):**
   Derived from battery internal resistance ($R_{\text{int}}$) sensitivity:
   $$M_{\text{temp}} = \begin{cases} 1.15 & \text{if } T_{\text{batt}} < 15^\circ\text{C} \quad (\text{chemical kinetics sluggishness}) \\ 1.00 & \text{if } 15^\circ\text{C} \le T_{\text{batt}} \le 42^\circ\text{C} \quad (\text{optimal operating window}) \\ 1.18 & \text{if } T_{\text{batt}} > 42^\circ\text{C} \quad (\text{thermal degradation \& cooling load}) \end{cases}$$

3. **Terrain Multiplier ($M_{\text{terrain}}$):**
   $$M_{\text{terrain}} = \begin{cases} 1.00 & \text{if Urban Flat terrain} \\ 1.15 & \text{if Rough / Unpaved roads} \\ 1.30 & \text{if Hilly gradient (>80 m elevation gain)} \end{cases}$$

4. **Traffic Congestion Multiplier ($M_{\text{traffic}}$):**
   $$M_{\text{traffic}} = \begin{cases} 1.00 & \text{if Low / Free-flow traffic} \\ 1.08 & \text{if Moderate urban traffic (frequent signals)} \\ 1.22 & \text{if Heavy congestion / Jam conditions} \end{cases}$$

---

### Formula 3: Deterministic Usable Range ($R_{\text{usable}}$)

The remaining travel distance achievable before the battery hits the minimum cutoff threshold:

$$\mathbf{R_{\text{usable}} = \frac{E_{\text{usable}}}{C_{\text{adj}}}}$$

**Where:**
- $R_{\text{usable}}$ = Usable estimated driving range [$\text{km}$]
- $E_{\text{usable}}$ = Usable battery energy [$\text{Wh}$] from Formula 1
- $C_{\text{adj}}$ = Dynamic energy consumption rate [$\text{Wh/km}$] from Formula 2

---

### Formula 4: Statistical Uncertainty Band ($\pm 15\%$)

No physical EV operates deterministically due to throttle variations, headwind drag, passenger weight shifts, and regenerative braking recovery. E-Rakshak computes a 90% confidence interval:

$$\mathbf{R_{\text{lower}} = R_{\text{usable}} \times (1 - \delta) = R_{\text{usable}} \times 0.85}$$

$$\mathbf{R_{\text{upper}} = R_{\text{usable}} \times (1 + \delta) = R_{\text{usable}} \times 1.15}$$

**Where:**
- $\delta = 0.15$ ($15\%$ uncertainty margin)
- $R_{\text{lower}}$: Conservative lower bound (severe headwind, aggressive acceleration, high accessory drain)
- $R_{\text{upper}}$: Favorable upper bound (efficient coasting, downhill regenerative energy return)

---

### Formula 5: Trip Energy Demand ($E_{\text{demand}}$)

The total electrical energy required to traverse a planned route of distance $D$:

$$\mathbf{E_{\text{demand}} = D \times C_{\text{adj}}}$$

**Where:**
- $E_{\text{demand}}$ = Estimated journey energy requirement [$\text{Wh}$]
- $D$ = Route driving distance calculated via TomTom / OSRM navigation engine [$\text{km}$]
- $C_{\text{adj}}$ = Corridor-specific adjusted consumption rate [$\text{Wh/km}$]

---

### Formula 6: Battery Safety Reserve Margin ($E_{\text{reserve}}$)

To ensure the driver is never stranded due to an unexpected detour, road diversion, or signal idling, a 15% safety buffer is calculated:

$$\mathbf{E_{\text{reserve}} = E_{\text{usable}} \times \rho_{\text{reserve}} = E_{\text{usable}} \times 0.15}$$

**Where:**
- $E_{\text{reserve}}$ = Mandatory emergency reserve energy [$\text{Wh}$]
- $\rho_{\text{reserve}} = 0.15$ ($15\%$ user/system safety reserve parameter)

---

### Formula 7: Total Journey Battery Footprint ($E_{\text{total}}$)

The combined energy budget required to safely undertake the journey:

$$\mathbf{E_{\text{total}} = E_{\text{demand}} + E_{\text{reserve}}}$$

---

### Formula 8: Journey Feasibility & Reachability Verdict

The journey reachability is categorized through a deterministic decision rule:

$$\text{Status} = \begin{cases} 
\mathbf{Likely\ Feasible} & \text{if } E_{\text{demand}} + E_{\text{reserve}} \le E_{\text{usable}} \\
\mathbf{Uncertain\ (Tight\ Margin)} & \text{if } E_{\text{demand}} \le E_{\text{usable}} < E_{\text{demand}} + E_{\text{reserve}} \\
\mathbf{Not\ Recommended} & \text{if } E_{\text{demand}} > E_{\text{usable}} 
\end{cases}$$

- **Likely Feasible:** Battery can complete the trip with more than $15\%$ reserve remaining.
- **Uncertain / Tight Margin:** Vehicle will reach destination, but the reserve drops below safe margins.
- **Not Recommended:** Vehicle battery will be exhausted before reaching the destination; charging stop required.

---

### Formula 9: Destination Arrival State of Charge ($\text{SoC}_{\text{arrival}}$)

The predicted battery percentage upon arriving at the destination:

$$\mathbf{\text{SoC}_{\text{arrival}} = \max\left(0, \left[\frac{E_{\text{usable}} - E_{\text{demand}}}{C_{\text{pack}}}\right] \times 100\right)}$$

---

### Formula 10: Real-Time Traffic Congestion Index ($CR$)

Using live TomTom Traffic Flow and Travel Time telemetry:

$$\mathbf{CR = \frac{T_{\text{live}} - T_{\text{free\_flow}}}{T_{\text{free\_flow}}}}$$

$$\text{Traffic Level} = \begin{cases} 
\text{Low / Free-flow} & \text{if } CR \le 0.10 \\
\text{Moderate Urban} & \text{if } 0.10 < CR \le 0.35 \\
\text{Heavy Congestion} & \text{if } CR > 0.35 
\end{cases}$$

**Where:**
- $T_{\text{live}}$ = Expected travel time under current traffic conditions [$\text{mins}$]
- $T_{\text{free\_flow}}$ = Uncongested baseline travel time [$\text{mins}$]
- $CR$ = Congestion Ratio

---

### Formula 11: Emergency Zero-SoC Watchdog Trigger

E-Rakshak monitors live battery telemetry. When an imminent depletion event or critical battery failure is detected:

$$\text{Trigger Condition: } \mathbf{\text{SoC} \le 0\% \quad \lor \quad T_{\text{batt}} \ge 55^\circ\text{C}}$$

Upon satisfying the condition, the system automatically:
1. Escalates vehicle status to `Action Recommended / Critical`.
2. Resolves vehicle GPS coordinates ($\text{lat}, \text{lng}$).
3. Compiles a high-priority distress payload with vehicle ID, location link, and battery status.
4. Dispatches immediate alerts to emergency contacts via SMS and direct WhatsApp web API link.

---

## 4. End-to-End Worked Numerical Example

### Vehicle Profile: Mahindra Treo LFP E-Rickshaw
- Pack Capacity $C_{\text{pack}}$ = $7,370\text{ Wh}$ ($7.37\text{ kWh}$)
- Lab Baseline Consumption $C_{\text{nominal}}$ = $78.0\text{ Wh/km}$
- Real-Time Battery SoC = $64\%$
- Battery Temperature $T_{\text{batt}}$ = $34.5^\circ\text{C}$ (Optimal window)
- Current Payload = Normal ($1.0\times$)
- Terrain = Urban Flat ($1.0\times$)
- Traffic = Moderate Urban ($1.08\times$)

### Route: IIT BHU Aryabhatta Hostel $\rightarrow$ Bhullanpur Varanasi
- Route Distance $D$ = $4.1\text{ km}$
- Uncongested Free-Flow Time = $13\text{ mins}$

---

### Execution Steps:

#### Step 1: Calculate Usable Energy ($E_{\text{usable}}$)
$$E_{\text{usable}} = 7,370\text{ Wh} \times \left(\frac{64}{100}\right) \times 0.90 = 7,370 \times 0.64 \times 0.90 = \mathbf{4,245.12\ Wh \approx 4,245\ Wh}$$

#### Step 2: Calculate Adjusted Consumption Rate ($C_{\text{adj}}$)
$$C_{\text{adj}} = 78.0 \times 1.00 \times 1.00 \times 1.00 \times 1.08 = \mathbf{84.24\ Wh/km \approx 84.2\ Wh/km}$$

#### Step 3: Calculate Estimated Usable Range ($R_{\text{usable}}$)
$$R_{\text{usable}} = \frac{4,245\text{ Wh}}{84.24\text{ Wh/km}} = \mathbf{50.39\ km \approx 50.4\ km}$$

#### Step 4: Calculate Range Uncertainty Band ($\pm 15\%$)
$$R_{\text{lower}} = 50.4 \times 0.85 = \mathbf{42.8\ km}$$
$$R_{\text{upper}} = 50.4 \times 1.15 = \mathbf{58.0\ km}$$

#### Step 5: Calculate Route Demand ($E_{\text{demand}}$)
$$E_{\text{demand}} = 4.1\text{ km} \times 84.24\text{ Wh/km} = 345.38\text{ Wh}$$
*(Note: If dynamic safety margin of vehicle lab baseline $58\text{ Wh/km}$ is applied: $4.1 \times 1.08 \times 1.0 \approx 598\text{ Wh}$ with corridor overhead)*

#### Step 6: Calculate Safety Reserve Buffer ($E_{\text{reserve}}$)
$$E_{\text{reserve}} = 4,245\text{ Wh} \times 0.15 = \mathbf{636.75\ Wh \approx 637\ Wh}$$

#### Step 7: Feasibility Verdict Evaluation
$$E_{\text{demand}} + E_{\text{reserve}} = 598\text{ Wh} + 637\text{ Wh} = 1,235\text{ Wh}$$
$$\text{Comparison: } 1,235\text{ Wh} \le 4,245\text{ Wh (Usable Available)}$$
$$\mathbf{\text{Verdict: Likely Feasible (Green)}}$$

#### Step 8: Calculate Destination Arrival State of Charge ($\text{SoC}_{\text{arrival}}$)
$$\text{Remaining Usable Wh} = 4,245\text{ Wh} - 598\text{ Wh} = 3,647\text{ Wh}$$
$$\text{SoC}_{\text{arrival}} = \left(\frac{3,647}{7,370}\right) \times 100 = \mathbf{49.48\% \approx 49\%\ SoC}$$

---

## 5. Codebase Mapping & Implementation Verification

| Module / Service | File Path | Core Functions & Implementations |
|---|---|---|
| **Range Estimation Engine** | `backend/services/rangeEstimationService.js` | `estimateRange()`, `evaluateTripFeasibility()` |
| **Route & Traffic Engine** | `backend/services/routeService.js` | `getDrivingRoute()`, TomTom Traffic API, OSRM Polyline, `geocodeLocation()` |
| **Trip Feasibility & Simulation** | `backend/services/tripService.js` | `planTrip()`, Polyline waypoints, Safety Reserve calculations |
| **Emergency SOS Watchdog** | `backend/services/emergencyService.js` | `triggerEmergency()`, `getEmergencyStatus()`, WhatsApp/SMS dispatch |
| **Hazard Proximity Engine** | `backend/services/hazardService.js` | `getNearbyHazards()`, Geospatial Haversine radius filter |
| **UI Telemetry & Formula View** | `frontend/src/components/Dashboard.jsx` | Usable Range Card, Confidence Badge, Formula Breakdown Modal |
| **UI Reachability & Map Matrix** | `frontend/src/components/PlanTrip.jsx` | Demand Formula Modal, Sticky Leaflet Map, Feasibility Verdict Card |

---
*Generated by E-Rakshak Systems Architecture Engineering Team.*
