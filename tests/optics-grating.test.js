const assert = require("node:assert/strict");
const {
  calculateOpticsMetrics,
  calculateOpticsValues,
  micrometersToMillimeters
} = require("../src/opticsModel.js");

const gratingParams = {
  pattern: "grating",
  wavelength: 532,
  screenDistance: 1,
  screenSpan: 160,
  slitSeparation: micrometersToMillimeters(10),
  slitWidth: micrometersToMillimeters(1),
  slitCount: 8,
  phaseOffset: 0
};

function gratingOrderY(params, order) {
  const lambdaMm = params.wavelength * 1e-6;
  const screenDistanceMm = params.screenDistance * 1000;
  return (order * lambdaMm * screenDistanceMm) / params.slitSeparation;
}

function firstGratingNullY(params) {
  const lambdaMm = params.wavelength * 1e-6;
  const screenDistanceMm = params.screenDistance * 1000;
  return lambdaMm * screenDistanceMm / (params.slitCount * params.slitSeparation);
}

const center = calculateOpticsValues(0, gratingParams);
assert.equal(center.intensity, 1, "plane grating central principal maximum should be normalized to 1");

const firstOrder = calculateOpticsValues(gratingOrderY(gratingParams, 1), gratingParams);
assert.equal(
  firstOrder.intensity,
  firstOrder.envelope,
  "plane grating principal maxima should be limited by the single-slit envelope"
);
assert.ok(firstOrder.intensity > 0.9, "with a narrow slit, the first-order grating maximum should be bright");

const firstNull = calculateOpticsValues(firstGratingNullY(gratingParams), gratingParams);
assert.ok(firstNull.intensity < 1e-8, "N-slit grating should have a dark minimum at d y / L = lambda / N");

const metrics = calculateOpticsMetrics(gratingParams);
assert.equal(metrics.slitLabel, "平面光栅", "grating metrics should identify the optical element as a plane grating");
assert.equal(Math.round(metrics.featureSpacing), 53, "grating order spacing should be lambda L / d");

console.log("optics grating model tests passed");
