import assert from "node:assert/strict";
import test from "node:test";
import { drawSolarChart } from "../src/chart.js";

const DEFAULT_CHART_LATITUDE = 48;
const DEFAULT_CHART_DECLINATION = -9.72;
const CHART_DECLINATION_FOR_HIDDEN_CANVAS = 10;
const DEFAULT_CHART_THRESHOLD = -0.833;
const DEFAULT_DEVICE_PIXEL_RATIO = 1;
const DEFAULT_CANVAS_WIDTH = 400;
const DEFAULT_CANVAS_HEIGHT = 200;

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
    "beginPath", "clearRect", "clip", "closePath", "fill", "fillText", "lineTo",
    "moveTo", "rect", "restore", "save", "scale", "setLineDash", "stroke"
  ].map((name) => [name, (...args) => calls.push([name, ...args])]));
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