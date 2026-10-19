import assert from "node:assert/strict";
import test from "node:test";
import { drawSolarChart } from "../src/chart.js";
import { solarAltitude } from "../src/solar.js";

const DEFAULT_CHART_LATITUDE = 48;
const DEFAULT_CHART_DECLINATION = -9.72;
const CHART_DECLINATION_FOR_HIDDEN_CANVAS = 10;
const DEFAULT_CHART_THRESHOLD = -0.833;
const DEFAULT_DEVICE_PIXEL_RATIO = 1;
const DEFAULT_CANVAS_WIDTH = 400;
const DEFAULT_CANVAS_HEIGHT = 200;
const CHART_NIGHT_COLOR = "#081b37";
const CHART_DAY_COLOR = "#38bdf8";
const CHART_SUN_COLOR = "#ffe45c";
const EXPECTED_DAY_AND_NIGHT_ARE_DRAWN = true;
const EXPECTED_SUN_PATH_IS_YELLOW = true;

// Installe temporairement le ratio de pixels de l'écran dans l'environnement global.
function installWindow(t, devicePixelRatio) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { devicePixelRatio }
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "window", original);
    else delete globalThis.window;
  });
}

// Crée un canvas simulé qui enregistre les appels de dessin.
function createCanvas(width, height) {
  const calls = [];
  const attributes = new Map();
  const context = Object.fromEntries([
    "beginPath", "clearRect", "clip", "closePath", "fill", "fillRect", "fillText", "lineTo",
    "moveTo", "rect", "restore", "save", "scale", "setLineDash", "stroke", "strokeText"
  ].map((name) => [name, (...args) => calls.push([name, ...args])]));
  context.font = "";
  context.fillRect = (...args) => calls.push(["fillRect", ...args, context.fillStyle]);
  context.fillText = (...args) => calls.push(["fillText", ...args, context.font, context.fillStyle]);
  context.strokeText = (...args) => calls.push(["strokeText", ...args, context.strokeStyle]);
  context.stroke = (...args) => calls.push(["stroke", context.strokeStyle, context.lineWidth]);
  return {
    calls,
    attributes,
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({ width, height }),
    getContext: () => context,
    setAttribute: (name, value) => attributes.set(name, value)
  };
}

// Vérifie que le graphique attend une largeur de canvas valide.
test("le graphique ne se dessine pas sans largeur de canvas", () => {
  // Given
  const expectedDrawResult = undefined;
  const declination = CHART_DECLINATION_FOR_HIDDEN_CANVAS;
  const canvas = {
    getBoundingClientRect: () => ({ width: 0, height: DEFAULT_CANVAS_HEIGHT }),
    getContext() { throw new Error("hidden canvases should not be drawn"); }
  };

  // When
  const result = drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, declination, DEFAULT_CHART_THRESHOLD);

  // Then
  assert.equal(result, expectedDrawResult);
});

// Vérifie que le graphique attend une hauteur de canvas valide.
test("le graphique ne se dessine pas sans hauteur de canvas", () => {
  // Given
  const expectedDrawResult = undefined;
  const declination = CHART_DECLINATION_FOR_HIDDEN_CANVAS;
  const canvas = {
    getBoundingClientRect: () => ({ width: DEFAULT_CANVAS_WIDTH, height: 0 }),
    getContext() { throw new Error("hidden canvases should not be drawn"); }
  };

  // When
  const result = drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, declination, DEFAULT_CHART_THRESHOLD);

  // Then
  assert.equal(result, expectedDrawResult);
});

// Vérifie que le canvas tient compte du ratio de pixels de l'écran.
test("le graphique dimensionne le canvas selon le ratio de pixels", (t) => {
  // Given
  const devicePixelRatio = 2;
  const canvasWidth = 600;
  const canvasHeight = 240;
  const latitude = DEFAULT_CHART_LATITUDE;
  const declination = DEFAULT_CHART_DECLINATION;
  const threshold = DEFAULT_CHART_THRESHOLD;
  const expectedCanvasWidth = canvasWidth * devicePixelRatio;
  const expectedCanvasHeight = canvasHeight * devicePixelRatio;
  const expectedScale = ["scale", devicePixelRatio, devicePixelRatio];
  installWindow(t, devicePixelRatio);
  const canvas = createCanvas(canvasWidth, canvasHeight);

  // When
  drawSolarChart(canvas, latitude, declination, threshold);

  // Then
  assert.equal(canvas.width, expectedCanvasWidth);
  assert.equal(canvas.height, expectedCanvasHeight);
  assert.deepEqual(canvas.calls.find(([name]) => name === "scale"), expectedScale);
});

// Vérifie que les plages jour/nuit et la trajectoire solaire ont leurs couleurs dédiées.
test("le graphique distingue le jour, la nuit et le tracé solaire", (t) => {
  // Given
  const expectedDayAndNightAreDrawn = EXPECTED_DAY_AND_NIGHT_ARE_DRAWN;
  const expectedSunPathIsYellow = EXPECTED_SUN_PATH_IS_YELLOW;
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD);

  // Then
  const fillColors = canvas.calls
    .filter(([name]) => name === "fillRect")
    .map(([, ...args]) => args.at(-1));
  const dayAndNightAreDrawn = fillColors.includes(CHART_NIGHT_COLOR) && fillColors.includes(CHART_DAY_COLOR);
  const sunPathIsYellow = canvas.calls.some(([name, color]) => name === "stroke" && color === CHART_SUN_COLOR);
  assert.equal(dayAndNightAreDrawn, expectedDayAndNightAreDrawn);
  assert.equal(sunPathIsYellow, expectedSunPathIsYellow);
});

// Vérifie que l'axe du graphique affiche les heures solaires.
test("le graphique indique les heures solaires sur son axe", (t) => {
  // Given
  const expectedAxisLabel = "00 h";
  const expectedAxisLabelWasDrawn = true;
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD);

  // Then
  const axisLabelWasDrawn = canvas.calls.some(([name, text]) => name === "fillText" && text === expectedAxisLabel);
  assert.equal(axisLabelWasDrawn, expectedAxisLabelWasDrawn);
  const axisLabel = canvas.calls.find(([name, text]) => name === "fillText" && text === expectedAxisLabel);
  assert.equal(axisLabel[4], "10px Segoe UI, sans-serif");
});

// Vérifie que le symbole solaire se place sur la courbe à l'heure actuelle.
test("le symbole solaire se place à l'heure actuelle sur la courbe", (t) => {
  // Given
  const currentSolarHour = 9;
  const plotTop = 12;
  const plotBottom = DEFAULT_CANVAS_HEIGHT - 26;
  const expectedSunSymbol = "☀";
  const expectedSunFont = "34px Segoe UI Symbol, sans-serif";
  const expectedSunX = 38 + currentSolarHour / 24 * (DEFAULT_CANVAS_WIDTH - 9 - 38);
  const altitude = solarAltitude(currentSolarHour, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION);
  const expectedSunY = plotTop + (90 - altitude) / 180 * (plotBottom - plotTop);
  const expectedSunPosition = [expectedSunX, expectedSunY, expectedSunFont, CHART_SUN_COLOR];
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD, currentSolarHour);

  // Then
  const sunMarker = canvas.calls.find(([name, text]) => name === "fillText" && text === expectedSunSymbol);
  assert.deepEqual(sunMarker.slice(2), expectedSunPosition);
});

// Vérifie que la verticale de l'heure actuelle rejoint la ligne d'altitude zéro.
test("la verticale de l'heure actuelle rejoint la ligne zéro", (t) => {
  // Given
  const currentSolarHour = 9;
  const plotTop = 12;
  const plotBottom = DEFAULT_CANVAS_HEIGHT - 26;
  const expectedX = 38 + currentSolarHour / 24 * (DEFAULT_CANVAS_WIDTH - 9 - 38);
  const altitude = solarAltitude(currentSolarHour, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION);
  const expectedStartY = plotTop + (90 - altitude) / 180 * (plotBottom - plotTop);
  const expectedEndY = plotTop + (90 - 0) / 180 * (plotBottom - plotTop);
  const expectedStartWasDrawn = true;
  const expectedEndWasDrawn = true;
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD, currentSolarHour);

  // Then
  const startWasDrawn = canvas.calls.some(([name, x, y]) => name === "moveTo" && x === expectedX && y === expectedStartY);
  const endWasDrawn = canvas.calls.some(([name, x, y]) => name === "lineTo" && x === expectedX && y === expectedEndY);
  assert.equal(startWasDrawn, expectedStartWasDrawn);
  assert.equal(endWasDrawn, expectedEndWasDrawn);
});

// Vérifie que la verticale du maximum et son repère S sont à midi solaire.
test("le maximum solaire est repéré à midi sur la ligne zéro", (t) => {
  // Given
  const maximumSolarHour = 12;
  const plotTop = 12;
  const plotBottom = DEFAULT_CANVAS_HEIGHT - 26;
  const expectedMaximumX = 38 + maximumSolarHour / 24 * (DEFAULT_CANVAS_WIDTH - 9 - 38);
  const maximumAltitude = solarAltitude(maximumSolarHour, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION);
  const expectedMaximumY = plotTop + (90 - maximumAltitude) / 180 * (plotBottom - plotTop);
  const expectedZeroAltitudeY = plotTop + (90 - 0) / 180 * (plotBottom - plotTop);
  const expectedLabel = "S";
  const expectedLabelY = expectedZeroAltitudeY + 12;
  const expectedLabelFont = "bold 12px Segoe UI, sans-serif";
  const expectedLabelOutlineColor = CHART_NIGHT_COLOR;
  const expectedLabelFillColor = CHART_SUN_COLOR;
  const expectedMaximumLineColors = [CHART_NIGHT_COLOR, CHART_SUN_COLOR];
  const expectedMaximumLineWidths = [6, 3];
  const expectedMaximumStartWasDrawn = true;
  const expectedMaximumEndWasDrawn = true;
  const expectedLabelWasDrawn = true;
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD);

  // Then
  const maximumStartWasDrawn = canvas.calls.some(([name, x, y]) => name === "moveTo" && x === expectedMaximumX && y === expectedMaximumY);
  const maximumEndWasDrawn = canvas.calls.some(([name, x, y]) => name === "lineTo" && x === expectedMaximumX && y === expectedZeroAltitudeY);
  const label = canvas.calls.find(([name, text]) => name === "fillText" && text === expectedLabel);
  const outlinedLabel = canvas.calls.find(([name, text]) => name === "strokeText" && text === expectedLabel);
  const maximumLineStartIndex = canvas.calls.findIndex(([name, x, y]) => name === "moveTo" && x === expectedMaximumX && y === expectedMaximumY);
  const maximumLineColors = canvas.calls
    .slice(maximumLineStartIndex + 3, maximumLineStartIndex + 5)
    .map(([name, color]) => name === "stroke" ? color : null);
  const maximumLineWidths = canvas.calls
    .slice(maximumLineStartIndex + 3, maximumLineStartIndex + 5)
    .map(([name, , lineWidth]) => name === "stroke" ? lineWidth : null);
  assert.equal(maximumStartWasDrawn, expectedMaximumStartWasDrawn);
  assert.equal(maximumEndWasDrawn, expectedMaximumEndWasDrawn);
  assert.equal(label[2], expectedMaximumX);
  assert.equal(label[3], expectedLabelY);
  assert.equal(label[4], expectedLabelFont);
  assert.equal(label.at(-1), expectedLabelFillColor);
  assert.equal(outlinedLabel.at(-1), expectedLabelOutlineColor);
  assert.deepEqual(maximumLineColors, expectedMaximumLineColors);
  assert.deepEqual(maximumLineWidths, expectedMaximumLineWidths);
  assert.equal(Boolean(label), expectedLabelWasDrawn);
});

// Vérifie que le midi solaire se place à son heure légale quand l'axe est décalé.
test("le maximum solaire suit l'heure légale du midi solaire", (t) => {
  // Given
  const solarNoonHour = 13.5;
  const expectedMaximumX = 38 + solarNoonHour / 24 * (DEFAULT_CANVAS_WIDTH - 9 - 38);
  const expectedLabel = "S";
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD, null, solarNoonHour);

  // Then
  const label = canvas.calls.find(([name, text]) => name === "fillText" && text === expectedLabel);
  assert.equal(label[2], expectedMaximumX);
});

// Vérifie que le libellé accessible décrit les heures solaires de l'axe.
test("le libellé accessible du graphique précise l'heure solaire", (t) => {
  // Given
  const expectedTimeReference = /heure solaire/;
  const unexpectedTimeReference = /heure locale/;
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD);
  const accessibleLabel = canvas.attributes.get("aria-label");

  // Then
  assert.match(accessibleLabel, expectedTimeReference);
  assert.doesNotMatch(accessibleLabel, unexpectedTimeReference);
});

// Vérifie que le libellé accessible indique une latitude sud.
test("le libellé accessible du graphique indique la latitude sud", (t) => {
  // Given
  const latitude = -33.8688;
  const expectedAccessibleLabel = /33,8688° S/;
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, latitude, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD);
  const accessibleLabel = canvas.attributes.get("aria-label");

  // Then
  assert.match(accessibleLabel, expectedAccessibleLabel);
});

// Vérifie que le libellé accessible reprend le seuil choisi.
test("le libellé accessible du graphique indique le seuil choisi", (t) => {
  // Given
  const latitude = DEFAULT_CHART_LATITUDE;
  const threshold = -6.5;
  const expectedAccessibleLabel = /seuil -6\.500 degrés/;
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, latitude, DEFAULT_CHART_DECLINATION, threshold);
  const accessibleLabel = canvas.attributes.get("aria-label");

  // Then
  assert.match(accessibleLabel, expectedAccessibleLabel);
});

// Vérifie que le graphique utilise une échelle par défaut sans ratio d'écran.
test("le graphique utilise une échelle de un sans ratio de pixels disponible", (t) => {
  // Given
  const unavailableDevicePixelRatio = undefined;
  const expectedScale = ["scale", DEFAULT_DEVICE_PIXEL_RATIO, DEFAULT_DEVICE_PIXEL_RATIO];
  installWindow(t, unavailableDevicePixelRatio);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, DEFAULT_CHART_LATITUDE, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD);
  const scaleCall = canvas.calls.find(([name]) => name === "scale");

  // Then
  assert.deepEqual(scaleCall, expectedScale);
});

// Vérifie que le libellé accessible indique une latitude nord.
test("le libellé accessible du graphique indique la latitude nord", (t) => {
  // Given
  const latitude = 48.8566;
  const expectedAccessibleLabel = /48,8566° N/;
  installWindow(t, DEFAULT_DEVICE_PIXEL_RATIO);
  const canvas = createCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);

  // When
  drawSolarChart(canvas, latitude, DEFAULT_CHART_DECLINATION, DEFAULT_CHART_THRESHOLD);
  const accessibleLabel = canvas.attributes.get("aria-label");

  // Then
  assert.match(accessibleLabel, expectedAccessibleLabel);
});