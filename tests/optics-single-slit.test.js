const assert = require("node:assert/strict");
const {
  calculateOpticsValues,
  getEffectiveSlitCount,
  micrometersToMillimeters,
  millimetersToMicrometers
} = require("../src/opticsModel.js");

const baseParams = {
  pattern: "single",
  wavelength: 500,
  screenDistance: 1,
  slitSeparation: 0.25,
  slitWidth: 0.05,
  slitCount: 8,
  phaseOffset: 1.5
};

assert.equal(micrometersToMillimeters(30), 0.03, "slit width UI values in micrometers must convert to millimeters");
assert.equal(millimetersToMicrometers(0.03), 30, "internal slit width values must display as micrometers");

function fraunhoferFirstSingleSlitMinimumY(params) {
  const lambdaMm = params.wavelength * 1e-6;
  const screenDistanceMm = params.screenDistance * 1000;
  return lambdaMm * screenDistanceMm / params.slitWidth;
}

assert.equal(
  getEffectiveSlitCount(baseParams),
  1,
  "single-slit diffraction must use exactly one slit even if slitCount is higher"
);

const offAxis = calculateOpticsValues(3.7, baseParams);
assert.equal(
  offAxis.intensity,
  offAxis.envelope,
  "single-slit intensity must be the diffraction envelope without a multi-slit factor"
);

const changedInterferenceParams = {
  ...baseParams,
  slitSeparation: 0.7,
  phaseOffset: -0.8
};
assert.equal(
  calculateOpticsValues(3.7, changedInterferenceParams).intensity,
  offAxis.intensity,
  "single-slit intensity must not change when interference-only parameters change"
);

const firstMinimum = calculateOpticsValues(fraunhoferFirstSingleSlitMinimumY(baseParams), baseParams);
assert.ok(
  firstMinimum.intensity < 1e-8,
  "Fraunhofer single-slit intensity should approach zero at y = lambda L / a"
);

const narrowSlitParams = {
  ...baseParams,
  wavelength: 650,
  screenDistance: 0.2,
  slitWidth: micrometersToMillimeters(5)
};
const fraunhoferMinimum = calculateOpticsValues(
  fraunhoferFirstSingleSlitMinimumY(narrowSlitParams),
  narrowSlitParams
);
assert.ok(
  fraunhoferMinimum.intensity < 1e-8,
  "Fraunhofer single-slit model must place the first minimum at y = lambda L / a"
);

console.log("optics single-slit model tests passed");
