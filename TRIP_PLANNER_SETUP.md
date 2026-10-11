# Trip Planner Battery + Elevation Setup

You already have the map and route API. Keep that API key wherever your current app expects it, but do not hard-code secret keys into frontend files.

## If Your App Has A Backend

Put the route API key in the backend `.env` file:

```env
ROUTE_API_KEY=your_route_api_key_here
```

Then call the route API from the backend and return only the route result to the frontend.

## If Your App Is Frontend Only

Only use this for browser-safe/public keys:

```env
VITE_ROUTE_API_KEY=your_route_api_key_here
```

Then read it in Vite/React:

```js
const routeApiKey = import.meta.env.VITE_ROUTE_API_KEY;
```

## How To Use The Battery Module

Import the helper from `trip-planner-battery.js`:

```js
import { estimateRouteFeasibility } from "./trip-planner-battery.js";
```

After your route API returns route geometry and distance:

```js
const result = await estimateRouteFeasibility({
  routeCoordinates: route.geometry.coordinates,
  distanceKm: route.distance / 1000,
  vehicleWeightKg: 1400,
  loadKg: 120,
  batteryCapacityKWh: 40,
  currentBatteryPercent: 65,
  baseConsumptionKWhPerKm: 0.16
});

console.log(result.battery.rating);
console.log(result.battery.totalEnergyNeededKWh);
console.log(result.elevationProfile.totalElevationGainM);
```

## Output Ratings

- `Safe`: the trip is possible and leaves the configured reserve battery.
- `Risky`: the trip is possible but reaches below reserve.
- `Not Possible`: estimated energy needed is more than available battery.

## Inputs You Should Show In The UI

- Current battery percentage
- Load in kg
- Battery capacity in kWh
- Vehicle weight in kg
- Vehicle consumption in kWh/km

Good demo defaults:

```js
{
  vehicleWeightKg: 1400,
  batteryCapacityKWh: 40,
  baseConsumptionKWhPerKm: 0.16,
  currentBatteryPercent: 70,
  loadKg: 100
}
```

## Notes

The elevation lookup uses OpenTopoData's public SRTM endpoint. For demo use this is fine, but for heavy traffic you should check OpenTopoData limits or host your own elevation service.
