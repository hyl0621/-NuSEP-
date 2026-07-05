(() => {
  "use strict";

  const canvas = document.getElementById("simCanvas");
  const chartCanvas = document.getElementById("chartCanvas");
  const ctx = canvas.getContext("2d");
  const chartCtx = chartCanvas.getContext("2d");

  const experimentButtons = Array.from(document.querySelectorAll("[data-experiment]"));
  const emInputs = Array.from(document.querySelectorAll("[data-param]"));
  const emNumberInputs = Array.from(document.querySelectorAll("[data-number]"));
  const opticsInputs = Array.from(document.querySelectorAll("[data-opt-param]"));
  const opticsNumberInputs = Array.from(document.querySelectorAll("[data-opt-number]"));
  const emPresetButtons = Array.from(document.querySelectorAll("[data-preset]"));
  const opticsPresetButtons = Array.from(document.querySelectorAll("[data-optics-preset]"));

  const emInputByParam = Object.fromEntries(emInputs.map((input) => [input.dataset.param, input]));
  const emNumberByParam = Object.fromEntries(emNumberInputs.map((input) => [input.dataset.number, input]));
  const opticsInputByParam = Object.fromEntries(opticsInputs.map((input) => [input.dataset.optParam, input]));
  const opticsNumberByParam = Object.fromEntries(opticsNumberInputs.map((input) => [input.dataset.optNumber, input]));

  const controls = {
    appTitle: document.getElementById("appTitle"),
    toggleRun: document.getElementById("toggleRun"),
    stepOnce: document.getElementById("stepOnce"),
    resetSim: document.getElementById("resetSim"),
    showVectors: document.getElementById("showVectors"),
    showGrid: document.getElementById("showGrid"),
    compareCharge: document.getElementById("compareCharge"),
    stageBadge: document.getElementById("stageBadge"),
    legend: document.getElementById("legend"),
    metrics: [
      { label: document.getElementById("metric1Label"), value: document.getElementById("metric1Value") },
      { label: document.getElementById("metric2Label"), value: document.getElementById("metric2Value") },
      { label: document.getElementById("metric3Label"), value: document.getElementById("metric3Value") },
      { label: document.getElementById("metric4Label"), value: document.getElementById("metric4Value") },
      { label: document.getElementById("metric5Label"), value: document.getElementById("metric5Value") }
    ],
    force: document.getElementById("forceReadout"),
    drift: document.getElementById("driftReadout")
  };
  const opticsModel = window.NuSEPOptics;

  const emParams = {
    qOverM: 1,
    Ex: 0,
    Ey: 0,
    Ez: 0,
    Bx: 0,
    By: 0,
    Bz: 1,
    vx: 1.35,
    vy: 0.25,
    vz: 0.72,
    dt: 0.018,
    stepsPerFrame: 5,
    zoom: 38
  };

  const opticsParams = {
    pattern: "double",
    wavelength: 532,
    screenDistance: 1.2,
    screenSpan: 24,
    slitSeparation: 0.22,
    slitWidth: 0.035,
    slitCount: 2,
    phaseOffset: 0,
    intensityGain: 1.2
  };

  const emPresets = {
    helix: {
      label: "纯磁场螺旋",
      qOverM: 1,
      Ex: 0,
      Ey: 0,
      Ez: 0,
      Bx: 0,
      By: 0,
      Bz: 1,
      vx: 1.35,
      vy: 0.25,
      vz: 0.72,
      dt: 0.018,
      stepsPerFrame: 5,
      zoom: 38
    },
    drift: {
      label: "E×B 漂移",
      qOverM: 1,
      Ex: 0,
      Ey: 0.72,
      Ez: 0,
      Bx: 0,
      By: 0,
      Bz: 1.15,
      vx: 0.1,
      vy: 0,
      vz: 0.62,
      dt: 0.016,
      stepsPerFrame: 6,
      zoom: 34
    },
    selector: {
      label: "速度选择器",
      qOverM: 1,
      Ex: 0,
      Ey: 0.9,
      Ez: 0,
      Bx: 0,
      By: 0,
      Bz: 0.9,
      vx: 1,
      vy: 0,
      vz: 0,
      dt: 0.014,
      stepsPerFrame: 5,
      zoom: 44
    },
    accelerator: {
      label: "电场加速",
      qOverM: 1,
      Ex: 0.55,
      Ey: 0,
      Ez: 0.16,
      Bx: 0,
      By: 0,
      Bz: 0.45,
      vx: 0.25,
      vy: 0.85,
      vz: 0,
      dt: 0.012,
      stepsPerFrame: 5,
      zoom: 32
    },
    negative: {
      label: "负电荷偏转",
      qOverM: -1,
      Ex: 0.35,
      Ey: 0.18,
      Ez: 0,
      Bx: 0,
      By: 0,
      Bz: 1.05,
      vx: 1.2,
      vy: 0.05,
      vz: 0.54,
      dt: 0.016,
      stepsPerFrame: 5,
      zoom: 37
    }
  };

  const opticsPresets = {
    double: {
      label: "双缝干涉",
      pattern: "double",
      wavelength: 635,
      screenDistance: 1.4,
      screenSpan: 90,
      slitSeparation: 0.12,
      slitWidth: 0.02,
      slitCount: 2,
      phaseOffset: 0,
      intensityGain: 1.8
    },
    single: {
      label: "夫琅禾费单缝衍射",
      pattern: "single",
      wavelength: 635,
      screenDistance: 1.4,
      screenSpan: 160,
      slitSeparation: 0.18,
      slitWidth: 0.03,
      slitCount: 1,
      phaseOffset: 0,
      intensityGain: 2.2
    },
    grating: {
      label: "平面衍射光栅",
      pattern: "grating",
      wavelength: 532,
      screenDistance: 1,
      screenSpan: 160,
      slitSeparation: 0.01,
      slitWidth: 0.001,
      slitCount: 8,
      phaseOffset: 0,
      intensityGain: 2.4
    }
  };

  let currentExperiment = "em";
  let running = true;
  let selectedEmPreset = "helix";
  let selectedOpticsPreset = "double";
  let time = 0;
  let state;
  let shadowState;
  let path = [];
  let shadowPath = [];
  let samples = [];
  let camera = vec3(0, 0, 0);
  let viewZoom = emParams.zoom;
  let dragState = { active: false, lastX: 0, lastY: 0 };
  let opticsPhase = 0;
  let view = { width: 1, height: 1, chartWidth: 1, chartHeight: 1, dpr: 1 };

  function vec3(x = 0, y = 0, z = 0) {
    return { x, y, z };
  }

  function add(a, b) {
    return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  function sub(a, b) {
    return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  function scale(a, k) {
    return vec3(a.x * k, a.y * k, a.z * k);
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function cross(a, b) {
    return vec3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }

  function mag(a) {
    return Math.hypot(a.x, a.y, a.z);
  }

  function normalize(a) {
    const length = mag(a);
    return length > 1e-9 ? scale(a, 1 / length) : vec3();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "--";
    if (Math.abs(value) >= 100) return value.toFixed(0);
    if (Math.abs(value) >= 10) return value.toFixed(1);
    return value.toFixed(2);
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasRect = canvas.getBoundingClientRect();
    const chartRect = chartCanvas.getBoundingClientRect();

    view = {
      width: Math.max(1, canvasRect.width),
      height: Math.max(1, canvasRect.height),
      chartWidth: Math.max(1, chartRect.width),
      chartHeight: Math.max(1, chartRect.height),
      dpr
    };

    canvas.width = Math.round(view.width * dpr);
    canvas.height = Math.round(view.height * dpr);
    chartCanvas.width = Math.round(view.chartWidth * dpr);
    chartCanvas.height = Math.round(view.chartHeight * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setLegend(items) {
    controls.legend.innerHTML = items
      .map((item) => `<span><i class="dot ${item.kind}"></i>${item.text}</span>`)
      .join("");
  }

  function setMetricLabels(labels) {
    controls.metrics.forEach((metric, index) => {
      metric.label.textContent = labels[index] || "";
    });
  }

  function setMetricValues(values) {
    controls.metrics.forEach((metric, index) => {
      metric.value.textContent = values[index] || "--";
    });
  }

  function fields() {
    return {
      e: vec3(emParams.Ex, emParams.Ey, emParams.Ez),
      b: vec3(emParams.Bx, emParams.By, emParams.Bz)
    };
  }

  function derivative(source, qOverM) {
    const { e, b } = fields();
    const magneticPart = cross(source.v, b);
    return {
      p: source.v,
      v: scale(add(e, magneticPart), qOverM)
    };
  }

  function offsetState(source, delta, factor) {
    return {
      p: add(source.p, scale(delta.p, factor)),
      v: add(source.v, scale(delta.v, factor))
    };
  }

  function rk4(source, qOverM, dt) {
    const k1 = derivative(source, qOverM);
    const k2 = derivative(offsetState(source, k1, dt / 2), qOverM);
    const k3 = derivative(offsetState(source, k2, dt / 2), qOverM);
    const k4 = derivative(offsetState(source, k3, dt), qOverM);

    return {
      p: add(
        source.p,
        scale(add(add(k1.p, scale(k2.p, 2)), add(scale(k3.p, 2), k4.p)), dt / 6)
      ),
      v: add(
        source.v,
        scale(add(add(k1.v, scale(k2.v, 2)), add(scale(k3.v, 2), k4.v)), dt / 6)
      )
    };
  }

  function resetEMSimulation() {
    time = 0;
    state = {
      p: vec3(0, 0, 0),
      v: vec3(emParams.vx, emParams.vy, emParams.vz)
    };
    shadowState = {
      p: vec3(0, 0, 0),
      v: vec3(emParams.vx, emParams.vy, emParams.vz)
    };
    path = [];
    shadowPath = [];
    samples = [];
    camera = vec3(0, 0, 0);
    recordEM();
    updateEMMetrics();
  }

  function recordEM() {
    const speed = mag(state.v);
    const energy = 0.5 * speed * speed;
    path.push({ p: { ...state.p }, speed });
    if (controls.compareCharge.checked) {
      shadowPath.push({ p: { ...shadowState.p }, speed: mag(shadowState.v) });
    }

    const maxTrail = 1500;
    if (path.length > maxTrail) path.splice(0, path.length - maxTrail);
    if (shadowPath.length > maxTrail) shadowPath.splice(0, shadowPath.length - maxTrail);

    samples.push({ t: time, speed, energy });
    if (samples.length > 420) samples.shift();
  }

  function stepEM(frameSteps = emParams.stepsPerFrame) {
    const steps = Math.max(1, Math.round(frameSteps));
    for (let i = 0; i < steps; i += 1) {
      state = rk4(state, emParams.qOverM, emParams.dt);
      if (controls.compareCharge.checked) {
        shadowState = rk4(shadowState, -emParams.qOverM, emParams.dt);
      }
      time += emParams.dt;
      recordEM();
    }
    updateEMMetrics();
  }

  function updateEMMetrics() {
    if (!state) return;
    const { e, b } = fields();
    const speed = mag(state.v);
    const energy = 0.5 * speed * speed;
    const bMag = mag(b);
    const omega = Math.abs(emParams.qOverM) * bMag;
    const bHat = bMag > 1e-8 ? scale(b, 1 / bMag) : vec3(0, 0, 1);
    const vParallel = dot(state.v, bHat);
    const vPerp = Math.sqrt(Math.max(0, speed * speed - vParallel * vParallel));
    const radius = omega > 1e-8 ? vPerp / omega : Infinity;
    const period = omega > 1e-8 ? (2 * Math.PI) / omega : Infinity;
    const pitch = speed > 1e-8 ? Math.atan2(vPerp, Math.abs(vParallel)) * 180 / Math.PI : 0;
    const acceleration = scale(add(e, cross(state.v, b)), emParams.qOverM);
    const drift = bMag > 1e-8 ? scale(cross(e, b), 1 / (bMag * bMag)) : null;

    setMetricValues([
      formatNumber(speed),
      formatNumber(energy),
      Number.isFinite(radius) ? formatNumber(radius) : "--",
      Number.isFinite(period) ? formatNumber(period) : "--",
      `${formatNumber(pitch)}°`
    ]);
    controls.force.textContent = formatNumber(mag(acceleration));
    controls.drift.textContent = drift ? `(${formatNumber(drift.x)}, ${formatNumber(drift.y)}, ${formatNumber(drift.z)})` : "--";
  }

  function project(point) {
    const rel = sub(point, camera);
    return {
      x: view.width / 2 + (rel.x - rel.z * 0.42) * viewZoom,
      y: view.height / 2 - (rel.y + rel.z * 0.24) * viewZoom,
      z: rel.z
    };
  }

  function drawEM() {
    viewZoom = emParams.zoom;
    ctx.clearRect(0, 0, view.width, view.height);
    drawBackground();
    if (controls.showGrid.checked) drawGrid();
    drawAxes();
    drawFieldVectors();
    drawTrajectory(shadowPath, () => "rgba(91, 103, 124, 0.38)", 1.3);
    drawTrajectory(path, speedColor, 2.4);
    drawStartMarker();
    drawParticle();
    if (controls.showVectors.checked) drawLocalVectors();
    drawEMChart();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, view.width, view.height);
    gradient.addColorStop(0, "#f7fbff");
    gradient.addColorStop(0.52, "#eef5f6");
    gradient.addColorStop(1, "#fff8ea");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, view.width, view.height);
  }

  function drawGrid() {
    const spacing = 1;
    const halfSpan = Math.ceil(Math.max(view.width, view.height) / viewZoom / 2) + 6;
    const startX = Math.floor((camera.x - halfSpan) / spacing) * spacing;
    const endX = Math.ceil((camera.x + halfSpan) / spacing) * spacing;
    const startY = Math.floor((camera.y - halfSpan) / spacing) * spacing;
    const endY = Math.ceil((camera.y + halfSpan) / spacing) * spacing;
    const gridZ = Math.round(camera.z / spacing) * spacing;

    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += spacing) {
      const nearAxis = Math.abs(x) < 1e-6;
      ctx.strokeStyle = `rgba(36, 48, 66, ${nearAxis ? 0.34 : 0.12})`;
      drawLine3D(vec3(x, startY, gridZ), vec3(x, endY, gridZ));
    }
    for (let y = startY; y <= endY; y += spacing) {
      const nearAxis = Math.abs(y) < 1e-6;
      ctx.strokeStyle = `rgba(36, 48, 66, ${nearAxis ? 0.34 : 0.12})`;
      drawLine3D(vec3(startX, y, gridZ), vec3(endX, y, gridZ));
    }

    const coarseSpacing = 5;
    ctx.strokeStyle = "rgba(39, 87, 168, 0.18)";
    for (let x = Math.ceil(startX / coarseSpacing) * coarseSpacing; x <= endX; x += coarseSpacing) {
      drawLine3D(vec3(x, startY, gridZ), vec3(x, endY, gridZ));
    }
    for (let y = Math.ceil(startY / coarseSpacing) * coarseSpacing; y <= endY; y += coarseSpacing) {
      drawLine3D(vec3(startX, y, gridZ), vec3(endX, y, gridZ));
    }
  }

  function drawAxes() {
    drawArrow3D(vec3(0, 0, 0), vec3(3.2, 0, 0), "#d85252", "x", 1);
    drawArrow3D(vec3(0, 0, 0), vec3(0, 3.2, 0), "#2f9473", "y", 1);
    drawArrow3D(vec3(0, 0, 0), vec3(0, 0, 3.2), "#486bd9", "z", 1);
  }

  function drawFieldVectors() {
    const { e, b } = fields();
    if (mag(e) > 1e-5) drawArrow3D(vec3(-4.7, -3.7, 0), e, "#f0a929", "E", 2.1);
    if (mag(b) > 1e-5) drawArrow3D(vec3(-4.7, -4.7, 0), b, "#2f8f83", "B", 2.1);
  }

  function drawLocalVectors() {
    const { e, b } = fields();
    const acceleration = scale(add(e, cross(state.v, b)), emParams.qOverM);
    drawArrow3D(state.p, normalize(state.v), "#3978d8", "v", 1.6);
    if (mag(acceleration) > 1e-5) {
      drawArrow3D(state.p, normalize(acceleration), "#d95f88", "F", 1.35);
    }
  }

  function drawTrajectory(points, colorResolver, lineWidth) {
    if (points.length < 2) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < points.length; i += 1) {
      const prev = project(points[i - 1].p);
      const next = project(points[i].p);
      if (!isOnReasonableCanvas(prev) && !isOnReasonableCanvas(next)) continue;
      ctx.strokeStyle = colorResolver(points[i].speed);
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
  }

  function drawStartMarker() {
    const p = project(vec3(0, 0, 0));
    if (!isOnReasonableCanvas(p)) return;

    ctx.save();
    ctx.strokeStyle = "#182536";
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#f0a929";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(p.x - 14, p.y);
    ctx.lineTo(p.x + 14, p.y);
    ctx.moveTo(p.x, p.y - 14);
    ctx.lineTo(p.x, p.y + 14);
    ctx.stroke();

    ctx.fillStyle = "#182536";
    ctx.font = "700 12px Microsoft YaHei, Segoe UI, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("起点", p.x + 14, p.y - 15);
    ctx.restore();
  }

  function drawParticle() {
    const p = project(state.p);
    ctx.save();
    ctx.shadowColor = "rgba(39, 87, 168, 0.45)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = emParams.qOverM >= 0 ? "#2757a8" : "#c84f7b";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font = "700 12px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emParams.qOverM >= 0 ? "+" : "-", p.x, p.y + 0.5);

    if (controls.compareCharge.checked) {
      const sp = project(shadowState.p);
      ctx.fillStyle = "rgba(78, 87, 107, 0.82)";
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLine3D(a, b) {
    const pa = project(a);
    const pb = project(b);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  function drawArrow3D(origin, vector, color, label, lengthScale) {
    const length = mag(vector);
    if (length < 1e-8) return;
    const start = project(origin);
    const endPoint = add(origin, scale(vector, lengthScale));
    const end = project(endPoint);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - 9 * Math.cos(angle - 0.45), end.y - 9 * Math.sin(angle - 0.45));
    ctx.lineTo(end.x - 9 * Math.cos(angle + 0.45), end.y - 9 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();

    ctx.font = "700 13px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, end.x + 12 * Math.cos(angle), end.y + 12 * Math.sin(angle));
  }

  function speedColor(speed) {
    const t = clamp(speed / 4, 0, 1);
    const stops = [
      [88, 199, 232],
      [240, 190, 74],
      [218, 90, 136]
    ];
    const a = t < 0.5 ? stops[0] : stops[1];
    const b = t < 0.5 ? stops[1] : stops[2];
    const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const rgb = a.map((channel, index) => Math.round(channel + (b[index] - channel) * local));
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  function isOnReasonableCanvas(point) {
    const margin = 240;
    return (
      point.x > -margin &&
      point.x < view.width + margin &&
      point.y > -margin &&
      point.y < view.height + margin
    );
  }

  function opticsValuesAt(yMm) {
    return opticsModel.calculateOpticsValues(yMm, opticsParams);
  }

  function updateOpticsMetrics() {
    const metrics = opticsModel.calculateOpticsMetrics(opticsParams);

    setMetricValues([
      `${formatNumber(metrics.featureSpacing)} mm`,
      `${formatNumber(metrics.centralWidth)} mm`,
      metrics.slitLabel,
      `${metrics.slitCount}`,
      `${formatNumber(metrics.angleHintMicrorad)} µrad`
    ]);
  }

  function wavelengthToRgb(wavelength) {
    let r = 0;
    let g = 0;
    let b = 0;
    if (wavelength >= 380 && wavelength < 440) {
      r = -(wavelength - 440) / (440 - 380);
      b = 1;
    } else if (wavelength < 490) {
      g = (wavelength - 440) / (490 - 440);
      b = 1;
    } else if (wavelength < 510) {
      g = 1;
      b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength < 580) {
      r = (wavelength - 510) / (580 - 510);
      g = 1;
    } else if (wavelength < 645) {
      r = 1;
      g = -(wavelength - 645) / (645 - 580);
    } else {
      r = 1;
    }

    const factor =
      wavelength < 420
        ? 0.35 + (0.65 * (wavelength - 380)) / 40
        : wavelength > 700
          ? 0.35 + (0.65 * (760 - wavelength)) / 60
          : 1;
    return {
      r: Math.round(255 * Math.pow(clamp(r * factor, 0, 1), 0.8)),
      g: Math.round(255 * Math.pow(clamp(g * factor, 0, 1), 0.8)),
      b: Math.round(255 * Math.pow(clamp(b * factor, 0, 1), 0.8))
    };
  }

  function lightColor(intensity, alpha = 1) {
    const base = wavelengthToRgb(opticsParams.wavelength);
    const value = clamp(Math.pow(intensity * opticsParams.intensityGain, 0.72), 0, 1);
    const floor = 10;
    const r = Math.round(floor + base.r * value);
    const g = Math.round(floor + base.g * value);
    const b = Math.round(floor + base.b * value);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function drawOptics() {
    ctx.clearRect(0, 0, view.width, view.height);
    const bg = ctx.createLinearGradient(0, 0, view.width, view.height);
    bg.addColorStop(0, "#f7fbff");
    bg.addColorStop(0.58, "#eef6f7");
    bg.addColorStop(1, "#fff8ec");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, view.width, view.height);

    const slitX = Math.max(86, view.width * 0.16);
    const screenX = Math.min(view.width - 128, view.width * 0.78);
    const centerY = view.height / 2;
    const screenHeight = Math.max(250, view.height * 0.72);
    const screenTop = centerY - screenHeight / 2;
    const screenWidth = 96;
    const slitPositions = getSlitScreenPositions(centerY);

    drawOpticsBench(slitX, screenX, screenWidth, screenTop, screenHeight, slitPositions);
    drawInterferenceScreen(screenX, screenWidth, screenTop, screenHeight);
    drawWavefronts(slitX, slitPositions);
    drawOpticsChart();
    updateOpticsMetrics();
  }

  function getSlitScreenPositions(centerY) {
    const count = opticsModel.getEffectiveSlitCount(opticsParams);
    const separation = clamp(160 * opticsParams.slitSeparation, 14, 42);
    const positions = [];
    for (let i = 0; i < count; i += 1) {
      positions.push(centerY + (i - (count - 1) / 2) * separation);
    }
    return positions;
  }

  function drawOpticsBench(slitX, screenX, screenWidth, screenTop, screenHeight, slitPositions) {
    ctx.strokeStyle = "rgba(23, 32, 42, 0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(42, view.height / 2);
    ctx.lineTo(screenX + screenWidth + 52, view.height / 2);
    ctx.stroke();

    ctx.fillStyle = "#26313f";
    ctx.fillRect(slitX - 10, screenTop, 20, screenHeight);
    ctx.fillStyle = "#f7fbff";
    const slitHeight = clamp(260 * opticsParams.slitWidth, 5, 17);
    slitPositions.forEach((slitY) => {
      ctx.fillRect(slitX - 11, slitY - slitHeight / 2, 22, slitHeight);
    });

    ctx.strokeStyle = "rgba(39, 87, 168, 0.16)";
    ctx.lineWidth = 1;
    slitPositions.forEach((slitY) => {
      [-0.32, 0, 0.32].forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(slitX + 12, slitY);
        ctx.lineTo(screenX, view.height / 2 + offset * screenHeight);
        ctx.stroke();
      });
    });

    ctx.fillStyle = "#182536";
    ctx.font = "700 12px Microsoft YaHei, Segoe UI, Arial";
    ctx.textAlign = "center";
    const effectiveCount = opticsModel.getEffectiveSlitCount(opticsParams);
    const slitLabel = opticsParams.pattern === "grating"
      ? `光栅 N=${effectiveCount}`
      : effectiveCount === 1
        ? "单缝"
        : "双缝";
    ctx.fillText(slitLabel, slitX, screenTop - 12);
    ctx.fillText("观察屏", screenX + screenWidth / 2, screenTop - 12);
  }

  function drawInterferenceScreen(screenX, screenWidth, screenTop, screenHeight) {
    ctx.fillStyle = "#101820";
    ctx.fillRect(screenX, screenTop, screenWidth, screenHeight);

    for (let py = Math.floor(screenTop); py <= screenTop + screenHeight; py += 1) {
      const relative = (py - (screenTop + screenHeight / 2)) / screenHeight;
      const yMm = relative * opticsParams.screenSpan;
      const { intensity } = opticsValuesAt(yMm);
      ctx.fillStyle = lightColor(intensity);
      ctx.fillRect(screenX, py, screenWidth, 1);
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX, screenTop + screenHeight / 2);
    ctx.lineTo(screenX + screenWidth, screenTop + screenHeight / 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(24, 37, 54, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, screenTop, screenWidth, screenHeight);
  }

  function drawWavefronts(slitX, slitPositions) {
    const base = wavelengthToRgb(opticsParams.wavelength);
    ctx.strokeStyle = `rgba(${base.r}, ${base.g}, ${base.b}, 0.24)`;
    ctx.lineWidth = 1.2;
    slitPositions.forEach((slitY) => {
      for (let radius = 22 + opticsPhase * 18; radius < view.width; radius += 36) {
        ctx.beginPath();
        ctx.arc(slitX, slitY, radius, -0.72, 0.72);
        ctx.stroke();
      }
    });
  }

  function drawOpticsChart() {
    const width = view.chartWidth;
    const height = view.chartHeight;
    chartCtx.clearRect(0, 0, width, height);
    chartCtx.fillStyle = "#ffffff";
    chartCtx.fillRect(0, 0, width, height);

    const left = 44;
    const right = width - 18;
    const top = 30;
    const bottom = height - 18;
    chartCtx.strokeStyle = "rgba(23, 32, 42, 0.08)";
    chartCtx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = top + ((bottom - top) * i) / 4;
      chartCtx.beginPath();
      chartCtx.moveTo(left, y);
      chartCtx.lineTo(right, y);
      chartCtx.stroke();
    }

    const samplesCount = 420;
    const intensityValues = [];
    const envelopeValues = [];
    for (let i = 0; i < samplesCount; i += 1) {
      const normalized = i / (samplesCount - 1);
      const yMm = (normalized - 0.5) * opticsParams.screenSpan;
      const values = opticsValuesAt(yMm);
      intensityValues.push(values.intensity);
      envelopeValues.push(values.envelope);
    }

    drawChartSeries(intensityValues, "#2757a8", left, right, top, bottom, 2.2);
    drawChartSeries(envelopeValues, "#d95f88", left, right, top, bottom, 1.5);

    chartCtx.fillStyle = "#667085";
    chartCtx.font = "12px Microsoft YaHei, Segoe UI, Arial";
    chartCtx.fillText("屏幕位置 y / 强度 I", 16, 22);
    chartCtx.fillStyle = "#2757a8";
    chartCtx.fillText("强度", width - 98, 23);
    chartCtx.fillStyle = "#d95f88";
    chartCtx.fillText("包络", width - 54, 23);
  }

  function drawEMChart() {
    const width = view.chartWidth;
    const height = view.chartHeight;
    chartCtx.clearRect(0, 0, width, height);
    chartCtx.fillStyle = "#ffffff";
    chartCtx.fillRect(0, 0, width, height);

    const left = 44;
    const right = width - 18;
    const top = 30;
    const bottom = height - 18;
    chartCtx.strokeStyle = "rgba(23, 32, 42, 0.08)";
    chartCtx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = top + ((bottom - top) * i) / 4;
      chartCtx.beginPath();
      chartCtx.moveTo(left, y);
      chartCtx.lineTo(right, y);
      chartCtx.stroke();
    }

    chartCtx.fillStyle = "#667085";
    chartCtx.font = "12px Microsoft YaHei, Segoe UI, Arial";
    chartCtx.fillText("速率 / 动能", 16, 22);

    if (samples.length < 2) return;
    const maxSpeed = Math.max(...samples.map((s) => s.speed), 1);
    const maxEnergy = Math.max(...samples.map((s) => s.energy), 1);
    drawChartSeries(samples.map((s) => s.speed / maxSpeed), "#3978d8", left, right, top, bottom, 2);
    drawChartSeries(samples.map((s) => s.energy / maxEnergy), "#f0a929", left, right, top, bottom, 2);

    chartCtx.fillStyle = "#3978d8";
    chartCtx.fillText("速率", width - 96, 23);
    chartCtx.fillStyle = "#f0a929";
    chartCtx.fillText("动能", width - 52, 23);
  }

  function drawChartSeries(values, color, left, right, top, bottom, lineWidth) {
    chartCtx.strokeStyle = color;
    chartCtx.lineWidth = lineWidth;
    chartCtx.beginPath();
    values.forEach((value, index) => {
      const x = left + (index / Math.max(1, values.length - 1)) * (right - left);
      const y = bottom - clamp(value, 0, 1) * (bottom - top);
      if (index === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    });
    chartCtx.stroke();
  }

  function syncEMInputsFromParams() {
    emInputs.forEach((input) => {
      const name = input.dataset.param;
      input.value = emParams[name];
    });
    emNumberInputs.forEach((input) => {
      const name = input.dataset.number;
      input.value = formatEMParamInput(name, emParams[name]);
    });
  }

  function syncOpticsInputsFromParams() {
    opticsInputs.forEach((input) => {
      const name = input.dataset.optParam;
      input.value = formatOpticsParamInput(name, opticsParams[name]);
    });
    opticsNumberInputs.forEach((input) => {
      const name = input.dataset.optNumber;
      input.value = formatOpticsParamInput(name, opticsParams[name]);
    });
  }

  function formatEMParamInput(name, value) {
    if (name === "dt") return Number(value).toFixed(3);
    if (name === "stepsPerFrame" || name === "zoom") return String(Math.round(value));
    return Number(value).toFixed(2);
  }

  function formatOpticsParamInput(name, value) {
    if (name === "wavelength" || name === "slitCount") return String(Math.round(value));
    if (name === "screenSpan") return Number(value).toFixed(1);
    if (name === "slitWidth" || name === "slitSeparation") return Number(opticsModel.millimetersToMicrometers(value)).toFixed(1);
    return Number(value).toFixed(2);
  }

  function opticsControlValueToModelValue(name, value) {
    if (name === "slitWidth" || name === "slitSeparation") return opticsModel.micrometersToMillimeters(value);
    return value;
  }

  function normalizeParam(name, value, inputMap, integerNames = []) {
    const rangeInput = inputMap[name];
    const min = rangeInput ? Number(rangeInput.min) : -Infinity;
    const max = rangeInput ? Number(rangeInput.max) : Infinity;
    let nextValue = clamp(value, min, max);
    if (integerNames.includes(name)) nextValue = Math.round(nextValue);
    return nextValue;
  }

  function refreshInitialVelocityIfNeeded() {
    if (time === 0) {
      state.v = vec3(emParams.vx, emParams.vy, emParams.vz);
      shadowState.v = vec3(emParams.vx, emParams.vy, emParams.vz);
      path = [];
      shadowPath = [];
      samples = [];
      recordEM();
    }
    updateEMMetrics();
  }

  function setEMParamFromControl(name, rawValue, options = {}) {
    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      if (options.normalizeNumber) syncEMInputsFromParams();
      return;
    }

    const nextValue = normalizeParam(name, parsedValue, emInputByParam, ["stepsPerFrame", "zoom"]);
    emParams[name] = nextValue;

    if (emInputByParam[name]) emInputByParam[name].value = nextValue;
    const numberInput = emNumberByParam[name];
    if (numberInput && (options.normalizeNumber || document.activeElement !== numberInput)) {
      numberInput.value = formatEMParamInput(name, nextValue);
    }

    refreshInitialVelocityIfNeeded();
  }

  function setOpticsParamFromControl(name, rawValue, options = {}) {
    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      if (options.normalizeNumber) syncOpticsInputsFromParams();
      return;
    }

    const controlValue = normalizeParam(name, parsedValue, opticsInputByParam, ["wavelength", "slitCount"]);
    const nextValue = opticsControlValueToModelValue(name, controlValue);
    opticsParams[name] = nextValue;

    if (opticsInputByParam[name]) opticsInputByParam[name].value = formatOpticsParamInput(name, nextValue);
    const numberInput = opticsNumberByParam[name];
    if (numberInput && (options.normalizeNumber || document.activeElement !== numberInput)) {
      numberInput.value = formatOpticsParamInput(name, nextValue);
    }

    updateOpticsMetrics();
  }

  function setEmPreset(name) {
    selectedEmPreset = name;
    Object.assign(emParams, emPresets[name]);
    emPresetButtons.forEach((button) => button.classList.toggle("active", button.dataset.preset === name));
    syncEMInputsFromParams();
    resetEMSimulation();
    if (currentExperiment === "em") {
      controls.stageBadge.textContent = emPresets[name].label;
    }
  }

  function setOpticsPreset(name) {
    selectedOpticsPreset = name;
    Object.assign(opticsParams, opticsPresets[name]);
    opticsPresetButtons.forEach((button) => button.classList.toggle("active", button.dataset.opticsPreset === name));
    syncOpticsInputsFromParams();
    opticsPhase = 0;
    updateOpticsMetrics();
    if (currentExperiment === "optics") {
      controls.stageBadge.textContent = opticsPresets[name].label;
    }
  }

  function setExperiment(name) {
    currentExperiment = name;
    document.body.classList.toggle("mode-em", name === "em");
    document.body.classList.toggle("mode-optics", name === "optics");
    experimentButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.experiment === name);
    });

    if (name === "em") {
      controls.appTitle.textContent = "带电粒子在电磁场中的运动仿真";
      controls.stageBadge.textContent = emPresets[selectedEmPreset].label;
      setMetricLabels(["速率 |v|", "归一化动能", "回旋半径", "回旋周期", "俯仰角"]);
      setLegend([
        { kind: "electric", text: "电场 E" },
        { kind: "magnetic", text: "磁场 B" },
        { kind: "force", text: "洛伦兹力" },
        { kind: "velocity", text: "速度" }
      ]);
      updateEMMetrics();
    } else {
      controls.appTitle.textContent = "双缝、夫琅禾费单缝与平面光栅仿真";
      controls.stageBadge.textContent = opticsPresets[selectedOpticsPreset].label;
      setMetricLabels(["主纹间距 Δy", "中央亮纹宽", "光学元件", "有效缝数 N", "特征角"]);
      setLegend([
        { kind: "interference", text: "光强 I" },
        { kind: "envelope", text: "单缝包络" },
        { kind: "principal", text: "主极大" }
      ]);
      updateOpticsMetrics();
    }
  }

  function beginCanvasDrag(event) {
    if (currentExperiment !== "em") return;
    if (event.button !== undefined && event.button !== 0) return;
    dragState = { active: true, lastX: event.clientX, lastY: event.clientY };
    canvas.classList.add("is-dragging");
    if (canvas.setPointerCapture && event.pointerId !== undefined) {
      canvas.setPointerCapture(event.pointerId);
    }
    if (event.preventDefault) event.preventDefault();
  }

  function dragCanvas(event) {
    if (!dragState.active || currentExperiment !== "em") return;
    const dx = event.clientX - dragState.lastX;
    const dy = event.clientY - dragState.lastY;
    camera.x -= dx / viewZoom;
    camera.y += dy / viewZoom;
    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
    if (event.preventDefault) event.preventDefault();
  }

  function endCanvasDrag(event) {
    if (!dragState.active) return;
    dragState.active = false;
    canvas.classList.remove("is-dragging");
    if (canvas.releasePointerCapture && event.pointerId !== undefined) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function resetCurrentExperiment() {
    if (currentExperiment === "em") {
      resetEMSimulation();
    } else {
      opticsPhase = 0;
      updateOpticsMetrics();
    }
  }

  function stepCurrentExperiment() {
    if (running) {
      running = false;
      controls.toggleRun.textContent = "▶";
    }
    if (currentExperiment === "em") {
      stepEM(1);
    } else {
      opticsPhase = (opticsPhase + 0.22) % 1;
      updateOpticsMetrics();
    }
    drawCurrentExperiment();
  }

  function drawCurrentExperiment() {
    if (currentExperiment === "em") drawEM();
    else drawOptics();
  }

  function animate() {
    if (currentExperiment === "em") {
      if (running) stepEM();
    } else if (running) {
      opticsPhase = (opticsPhase + 0.012) % 1;
    }
    drawCurrentExperiment();
    requestAnimationFrame(animate);
  }

  function init() {
    experimentButtons.forEach((button) => {
      button.addEventListener("click", () => setExperiment(button.dataset.experiment));
    });
    emInputs.forEach((input) => {
      input.addEventListener("input", () => setEMParamFromControl(input.dataset.param, input.value, { normalizeNumber: true }));
    });
    emNumberInputs.forEach((input) => {
      input.addEventListener("input", () => setEMParamFromControl(input.dataset.number, input.value, { normalizeNumber: false }));
      input.addEventListener("change", () => setEMParamFromControl(input.dataset.number, input.value, { normalizeNumber: true }));
    });
    opticsInputs.forEach((input) => {
      input.addEventListener("input", () => setOpticsParamFromControl(input.dataset.optParam, input.value, { normalizeNumber: true }));
    });
    opticsNumberInputs.forEach((input) => {
      input.addEventListener("input", () => setOpticsParamFromControl(input.dataset.optNumber, input.value, { normalizeNumber: false }));
      input.addEventListener("change", () => setOpticsParamFromControl(input.dataset.optNumber, input.value, { normalizeNumber: true }));
    });
    emPresetButtons.forEach((button) => {
      button.addEventListener("click", () => setEmPreset(button.dataset.preset));
    });
    opticsPresetButtons.forEach((button) => {
      button.addEventListener("click", () => setOpticsPreset(button.dataset.opticsPreset));
    });

    controls.toggleRun.addEventListener("click", () => {
      running = !running;
      controls.toggleRun.textContent = running ? "Ⅱ" : "▶";
    });
    controls.stepOnce.addEventListener("click", stepCurrentExperiment);
    controls.resetSim.addEventListener("click", resetCurrentExperiment);
    controls.compareCharge.addEventListener("change", () => {
      shadowState = {
        p: vec3(0, 0, 0),
        v: vec3(emParams.vx, emParams.vy, emParams.vz)
      };
      shadowPath = [];
    });

    canvas.addEventListener("pointerdown", beginCanvasDrag);
    canvas.addEventListener("pointermove", dragCanvas);
    canvas.addEventListener("pointerup", endCanvasDrag);
    canvas.addEventListener("pointercancel", endCanvasDrag);
    canvas.addEventListener("lostpointercapture", endCanvasDrag);

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    if ("ResizeObserver" in window) {
      new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
      new ResizeObserver(resizeCanvas).observe(chartCanvas.parentElement);
    }

    setEmPreset(selectedEmPreset);
    setOpticsPreset(selectedOpticsPreset);
    setExperiment("em");
    animate();
  }

  init();
})();
