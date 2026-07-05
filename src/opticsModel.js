(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.NuSEPOptics = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sinc(value) {
    if (Math.abs(value) < 1e-6) return 1;
    return Math.sin(value) / value;
  }

  function micrometersToMillimeters(value) {
    return value / 1000;
  }

  function millimetersToMicrometers(value) {
    return value * 1000;
  }

  function getEffectiveSlitCount(params) {
    if (params.pattern === "single") return 1;
    if (params.pattern === "double") return 2;
    return Math.max(2, Math.round(params.slitCount || 2));
  }

  function calculateOpticsValues(yMm, params) {
    const lambdaMm = params.wavelength * 1e-6;
    const screenDistanceMm = params.screenDistance * 1000;
    const screenCoordinateRatio = yMm / screenDistanceMm;
    const beta = Math.PI * params.slitWidth * screenCoordinateRatio / lambdaMm;
    const envelope = clamp(Math.pow(sinc(beta), 2), 0, 1);
    const count = getEffectiveSlitCount(params);

    if (count === 1) {
      return {
        intensity: envelope,
        envelope
      };
    }

    const delta =
      (2 * Math.PI * params.slitSeparation * screenCoordinateRatio) / lambdaMm +
      params.phaseOffset * Math.PI;
    const halfDelta = delta / 2;
    const denominator = Math.sin(halfDelta);
    const multi =
      Math.abs(denominator) < 1e-6
        ? 1
        : Math.pow(Math.sin(count * halfDelta) / (count * denominator), 2);

    return {
      intensity: clamp(envelope * multi, 0, 1),
      envelope
    };
  }

  function calculateOpticsMetrics(params) {
    const lambdaMm = params.wavelength * 1e-6;
    const screenDistanceMm = params.screenDistance * 1000;
    const count = getEffectiveSlitCount(params);
    const singleFeatureSpacing = lambdaMm * screenDistanceMm / params.slitWidth;
    const doubleFeatureSpacing = lambdaMm * screenDistanceMm / params.slitSeparation;
    const featureSpacing = count === 1 ? singleFeatureSpacing : doubleFeatureSpacing;
    const centralWidth = 2 * singleFeatureSpacing;
    const angleHint = count === 1
      ? lambdaMm / params.slitWidth
      : lambdaMm / params.slitSeparation;

    const slitLabel = count === 1
      ? "夫琅禾费单缝"
      : params.pattern === "grating"
        ? "平面光栅"
        : "双缝";

    return {
      featureSpacing,
      centralWidth,
      slitLabel,
      slitCount: count,
      angleHintMicrorad: angleHint * 1e6
    };
  }

  return {
    calculateOpticsMetrics,
    calculateOpticsValues,
    getEffectiveSlitCount,
    micrometersToMillimeters,
    millimetersToMicrometers
  };
});
