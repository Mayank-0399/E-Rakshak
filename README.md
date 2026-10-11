# E-Rakshak

E-Rakshak is a smart EV mobility dashboard for e-rickshaw, e-scooter, and e-cycle riders. It combines battery telemetry, trip planning, charging guidance, safety alerts, and emergency assistance into a single app.

This project is built as a React frontend with a Node.js + Express backend. The backend contains mock EV data and routing logic, and the frontend consumes the REST API under `/api/v1`.

---

## What this app does

The code in this repo supports:

- Rider dashboard with battery health, temperature, SoC, voltage, current, and range prediction
- Vehicle selection for different EV classes
- Trip estimation and route planning for Delhi-NCR style trips
- Charging station filtering and charger recommendations
- Road hazard reporting and nearby hazard lookup
- Safety alerts and acknowledgment/feedback flow
- SOS and emergency contact logic
- Settings and privacy controls
- Trip history and metrics for the current session

This is a working MVP, not a production-grade deployment. It relies on in-memory mock data and local simulation rather than a real database or live vehicle connection.

---

## Tech stack

Frontend
- React 18
- Vite
- Tailwind CSS
- Leaflet + map UI
- Lucide icons

Backend
- Node.js
- Express
- dotenv
- CORS
- morgan

Architecture note
- The backend loads a mock database from `backend/data/mockDatabase.js`
- Services are organized under `backend/services/`
- API routes are defined in `backend/server.js`
- The frontend is built with Vite and proxies `/api` calls to the backend

---

## Local run instructions

### 1. Install backend dependencies

```bash
cd C:\Users\mayan\OneDrive\Desktop\E-Rakshak\backend
npm install
```

### 2. Install frontend dependencies

```bash
cd C:\Users\mayan\OneDrive\Desktop\E-Rakshak\frontend
npm install
```

### 3. Configure environment variables

The backend loads environment variables from:
- `backend/.env`
- or the project root `.env`

Add the route key if you want live routing/geocoding features to work:

```env
ROUTE_API_KEY=your_route_api_key_here
```

The code calls `dotenv.config({ path: path.join(__dirname, '.env') });` and then `dotenv.config({ path: path.join(__dirname, '../.env') });`, so either location is accepted.

### 4. Start the backend

```bash
cd C:\Users\mayan\OneDrive\Desktop\E-Rakshak\backend
npm run dev
```

The backend runs on:

```text
http://localhost:5001
```

### 5. Start the frontend

```bash
cd C:\Users\mayan\OneDrive\Desktop\E-Rakshak\frontend
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

Open:

```text
http://localhost:5173
```

The frontend Vite config proxies `/api` requests to `http://localhost:5001`.

---

## Production-like mode

If you want to run the app as a single served build:

```bash
cd C:\Users\mayan\OneDrive\Desktop\E-Rakshak\frontend
npm run build
```

Then start the backend:

```bash
cd C:\Users\mayan\OneDrive\Desktop\E-Rakshak\backend
npm start
```

The backend serves static files from `frontend/dist` and falls back to `index.html` for all non-API routes.

---

## Important notes from the actual code

1. The project uses port 5001, not 5000.
   - `backend/server.js` sets `const PORT = process.env.PORT || 5001;`
   - `frontend/vite.config.js` proxies `/api` to `http://localhost:5001`

2. The backend is intentionally mock-backed.
   - `backend/data/mockDatabase.js` seeds vehicles, telemetry, charging stations, hazards, trips, and user settings in memory
   - No database like MongoDB, PostgreSQL, or MySQL is configured in the repo

3. The app includes many endpoints under `/api/v1`.
   - Dashboard, vehicles, telemetry, trip planning, emergency, hazards, settings, and charging APIs are present in `backend/server.js`

4. The app is designed for a demo or hackathon scenario.
   - It simulates EV behavior and route scenarios rather than connecting to production hardware or real fleet APIs

5. Some features depend on external route data.
   - `ROUTE_API_KEY` is used for route/geocoding services as seen in the backend route logic

---

## Main API modules

The backend exposes API groups such as:

- `/api/v1/dashboard` — current vehicle health and range
- `/api/v1/vehicles` — list and switch active vehicle
- `/api/v1/telemetry` — update/simulate telemetry
- `/api/v1/range/predict` — estimate driving range
- `/api/v1/trips` and `/api/v1/trips/estimate` — trip scoring and history
- `/api/v1/charging-stations/nearby` — nearby charging stations
- `/api/v1/hazards` — hazard reporting and voting
- `/api/v1/alerts` — safety alerts and feedback
- `/api/v1/emergency` — SOS and emergency contacts
- `/api/v1/settings` — privacy and user settings

Health check:

```bash
curl http://localhost:5001/api/health
```

---

## Project structure

```text
E-Rakshak/
├── backend/
│   ├── data/
│   ├── services/
│   ├── .env.example (if added later)
│   ├── package.json
│   ├── server.js
│   └── ...
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── README.md
├── architecture.md
├── FORMULAS_AND_ARCHITECTURE.md
├── TRIP_PLANNER_SETUP.md
└── ...
```

---

## Summary

This project is a local EV rider safety and trip-planning demo. The frontend is a Vite React app, the backend is a mock Express API, and the app runs locally with:

- Backend: `http://localhost:5001`
- Frontend: `http://localhost:5173`

If you run both and open the frontend, you get a working EV dashboard with simulated telemetry, trip planning, charging recommendations, hazards, and emergency workflows.
