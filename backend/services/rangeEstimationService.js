// Range Estimation & Feasibility Service
// Implements transparent baseline logic from Section 10.1 of architecture.md

export class RangeEstimationService {
  /**
   * Calculates current usable energy and range with uncertainty intervals
   */
  static estimateRange({
    batteryCapacityWh,
    socPercent,
    nominalEfficiencyWhPerKm,
    loadCategory = "normal",
    batteryTemperatureC = 30,
    terrain = "urban_flat",
    trafficLevel = "moderate",
    usableFraction = 0.90
  }) {
    // 1. Calculate usable energy: usable_energy_Wh = battery_capacity_Wh × SoC_fraction × usable_fraction
    const socFraction = Math.max(0, Math.min(100, socPercent)) / 100;
    const usableEnergyWh = Math.round(batteryCapacityWh * socFraction * usableFraction);

    // 2. Adjust consumption based on verified operating factors
    let loadMultiplier = 1.0;
    if (loadCategory === "empty") loadMultiplier = 0.88;
    else if (loadCategory === "heavy") loadMultiplier = 1.25;
    else if (loadCategory === "overloaded") loadMultiplier = 1.55;

    // Thermal adjustment (battery internal resistance increases in extreme cold or excessive heat)
    let tempMultiplier = 1.0;
    if (batteryTemperatureC < 15) {
      tempMultiplier = 1.15; // cold slows down chemical reaction
    } else if (batteryTemperatureC > 42) {
      tempMultiplier = 1.18; // heat degradation and auxiliary thermal management
    }

    // Terrain and traffic multipliers
    let terrainMultiplier = 1.0;
    if (terrain === "hilly") terrainMultiplier = 1.30;
    if (terrain === "rough_roads") terrainMultiplier = 1.15;

    let trafficMultiplier = 1.0;
    if (trafficLevel === "heavy_congestion") trafficMultiplier = 1.22;
    else if (trafficLevel === "moderate") trafficMultiplier = 1.08;

    const adjustedWhPerKm = Math.round(
      nominalEfficiencyWhPerKm * loadMultiplier * tempMultiplier * terrainMultiplier * trafficMultiplier * 10
    ) / 10;

    // 3. Estimate Usable Range in km
    const rawEstimatedRangeKm = adjustedWhPerKm > 0 ? (usableEnergyWh / adjustedWhPerKm) : 0;
    const estimatedRangeKm = Math.round(rawEstimatedRangeKm * 10) / 10;

    // 4. Uncertainty Intervals based on variance in driving dynamics (±15% baseline)
    const uncertaintyMargin = 0.15;
    const lowerRangeKm = Math.round(estimatedRangeKm * (1 - uncertaintyMargin) * 10) / 10;
    const upperRangeKm = Math.round(estimatedRangeKm * (1 + uncertaintyMargin) * 10) / 10;

    return {
      usable_energy_wh: usableEnergyWh,
      adjusted_consumption_wh_per_km: adjustedWhPerKm,
      estimated_range_km: estimatedRangeKm,
      range_interval_km: {
        lower: lowerRangeKm,
        upper: upperRangeKm
      },
      factors: {
        load_multiplier: loadMultiplier,
        temp_multiplier: tempMultiplier,
        terrain_multiplier: terrainMultiplier,
        traffic_multiplier: trafficMultiplier
      },
      model_version: "baseline-deterministic-v1.0",
      confidence: socPercent > 15 ? "high" : "moderate"
    };
  }

  /**
   * Evaluates reachability for a specific trip route
   */
  static evaluateTripFeasibility({
    vehicle,
    telemetry,
    distanceKm,
    loadCategory,
    terrain = "urban_flat",
    trafficLevel = "moderate",
    safetyReservePercent = 15
  }) {
    const rangeEstimate = this.estimateRange({
      batteryCapacityWh: vehicle.battery_capacity_wh,
      socPercent: telemetry.soc_percent,
      nominalEfficiencyWhPerKm: vehicle.nominal_efficiency_wh_per_km,
      loadCategory: loadCategory || telemetry.load_category,
      batteryTemperatureC: telemetry.battery_temperature_c,
      terrain,
      trafficLevel,
      usableFraction: vehicle.manufacturer_limits?.recommended_usable_fraction || 0.90
    });

    const estimatedEnergyRequiredWh = Math.round(distanceKm * rangeEstimate.adjusted_consumption_wh_per_km);
    const safetyReserveWh = Math.round(rangeEstimate.usable_energy_wh * (safetyReservePercent / 100));
    const totalRequiredWithReserveWh = estimatedEnergyRequiredWh + safetyReserveWh;

    let status = "likely_feasible";
    let statusLabel = "Likely Feasible";
    let recommendedAction = "Journey is well within battery capacity. Maintain standard driving profile.";
    let confidence = "high";

    if (estimatedEnergyRequiredWh > rangeEstimate.usable_energy_wh) {
      status = "not_recommended";
      statusLabel = "Not Recommended";
      recommendedAction = `Estimated energy (${estimatedEnergyRequiredWh} Wh) exceeds usable battery (${rangeEstimate.usable_energy_wh} Wh). Stop at a recommended charging station before proceeding.`;
      confidence = "high";
    } else if (totalRequiredWithReserveWh > rangeEstimate.usable_energy_wh) {
      status = "uncertain";
      statusLabel = "Uncertain / Tight Margin";
      recommendedAction = `Estimated energy fits into battery, but falls below your ${safetyReservePercent}% safety reserve. Unexpected detours or traffic could strand the vehicle.`;
      confidence = "moderate";
    }

    return {
      status,
      status_label: statusLabel,
      estimated_distance_km: distanceKm,
      estimated_energy_required_wh: estimatedEnergyRequiredWh,
      safety_reserve_wh: safetyReserveWh,
      usable_energy_wh: rangeEstimate.usable_energy_wh,
      estimated_range_km: rangeEstimate.estimated_range_km,
      range_interval_km: rangeEstimate.range_interval_km,
      remaining_soc_after_trip: Math.max(0, Math.round(((rangeEstimate.usable_energy_wh - estimatedEnergyRequiredWh) / vehicle.battery_capacity_wh) * 100)),
      recommended_action: recommendedAction,
      confidence,
      model_version: rangeEstimate.model_version,
      factors: rangeEstimate.factors,
      data_quality: [
        telemetry.source_type === "manual" ? "manual_soc_input" : "telemetry_stream",
        telemetry.quality_status
      ]
    };
  }
}

