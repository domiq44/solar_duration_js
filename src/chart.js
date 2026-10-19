import { solarAltitude } from "./solar.js";

const CHART_COLORS = {
  night: "#081b37",
  day: "#38bdf8",
  sun: "#ffe45c",
  grid: "rgba(224, 242, 254, 0.28)",
  threshold: "#ffffff"
};
const DAYLIGHT_STEPS = 144;

function formatLatitude(latitude) {
  const hemisphere = latitude < 0 ? "S" : "N";
  const absolute = Math.abs(latitude).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return `${absolute}° ${hemisphere}`;
}

function findDaylightIntervals(altitudeAt, threshold) {
  const intervals = [];
  let previousHour = 0;
  let previousIsDay = altitudeAt(previousHour) >= threshold;
  let intervalStart = previousIsDay ? previousHour : null;

  for (let step = 1; step <= DAYLIGHT_STEPS; step += 1) {
    const hour = step / 6;
    const isDay = altitudeAt(hour) >= threshold;
    if (isDay !== previousIsDay) {
      let low = previousHour;
      let high = hour;
      for (let iteration = 0; iteration < 16; iteration += 1) {
        const midpoint = (low + high) / 2;
        const midpointIsDay = altitudeAt(midpoint) >= threshold;
        if (midpointIsDay === previousIsDay) low = midpoint;
        else high = midpoint;
      }
      const crossing = (low + high) / 2;
      if (isDay) intervalStart = crossing;
      else {
        intervals.push([intervalStart, crossing]);
        intervalStart = null;
      }
    }
    previousHour = hour;
    previousIsDay = isDay;
  }

  if (intervalStart !== null) intervals.push([intervalStart, 24]);
  return intervals;
}

function prepareCanvas(canvas, bounds) {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  return context;
}

function readAxisColor(canvas) {
  const styles = typeof getComputedStyle === "function" ? getComputedStyle(canvas) : null;
  return styles?.getPropertyValue("--chart-axis").trim() || "#56645b";
}

function createProjection(width, height) {
  const plot = { left: 38, right: width - 9, top: 12, bottom: height - 26 };
  const x = (hour) => plot.left + hour / 24 * (plot.right - plot.left);
  const y = (altitude) => plot.top + (90 - altitude) / 180 * (plot.bottom - plot.top);
  return { plot, x, y };
}

function drawBackground(context, { plot, x }, intervals, width, height) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = CHART_COLORS.night;
  context.fillRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  context.fillStyle = CHART_COLORS.day;
  for (const [start, end] of intervals) {
    context.fillRect(x(start), plot.top, x(end) - x(start), plot.bottom - plot.top);
  }
}

function drawAltitudeGrid(context, { plot, y }, axisColor) {
  context.font = "10px Segoe UI, sans-serif";
  context.textBaseline = "middle";
  context.fillStyle = axisColor;
  context.strokeStyle = CHART_COLORS.grid;
  context.lineWidth = 1;
  for (const altitude of [-60, 0, 60]) {
    const position = y(altitude);
    context.beginPath();
    context.moveTo(plot.left, position);
    context.lineTo(plot.right, position);
    context.stroke();
    context.textAlign = "right";
    context.fillText(`${altitude}°`, plot.left - 8, position);
  }
}

function drawThresholdLine(context, { plot, y }, threshold) {
  context.setLineDash([5, 5]);
  context.beginPath();
  context.moveTo(plot.left, y(threshold));
  context.lineTo(plot.right, y(threshold));
  context.strokeStyle = CHART_COLORS.night;
  context.lineWidth = 3;
  context.stroke();
  context.beginPath();
  context.moveTo(plot.left, y(threshold));
  context.lineTo(plot.right, y(threshold));
  context.strokeStyle = CHART_COLORS.threshold;
  context.lineWidth = 1.25;
  context.stroke();
  context.setLineDash([]);
}

function drawSunCurve(context, { x, y }, altitudeAt) {
  context.beginPath();
  for (let step = 0; step <= DAYLIGHT_STEPS; step += 1) {
    const hour = step / 6;
    const pointX = x(hour);
    const pointY = y(altitudeAt(hour));
    if (step === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.strokeStyle = CHART_COLORS.night;
  context.lineWidth = 5.5;
  context.lineJoin = "round";
  context.stroke();
  context.strokeStyle = CHART_COLORS.sun;
  context.lineWidth = 2.5;
  context.stroke();
}

function drawNoonMarker(context, { x, y }, altitudeAt, solarNoonHour) {
  const maximumX = x(solarNoonHour);
  const zeroAltitudeY = y(0);
  context.beginPath();
  context.moveTo(maximumX, y(altitudeAt(solarNoonHour)));
  context.lineTo(maximumX, zeroAltitudeY);
  context.setLineDash([]);
  context.lineCap = "round";
  context.strokeStyle = CHART_COLORS.night;
  context.lineWidth = 6;
  context.stroke();
  context.strokeStyle = CHART_COLORS.sun;
  context.lineWidth = 3;
  context.stroke();
  context.lineCap = "butt";
  context.font = "bold 12px Segoe UI, sans-serif";
  context.strokeStyle = CHART_COLORS.night;
  context.lineWidth = 4;
  context.textAlign = "center";
  context.strokeText("S", maximumX, zeroAltitudeY + 12);
  context.fillStyle = CHART_COLORS.sun;
  context.fillText("S", maximumX, zeroAltitudeY + 12);
}

function drawCurrentSunMarker(context, { x, y }, altitudeAt, currentHour) {
  const markerY = y(altitudeAt(currentHour));
  context.beginPath();
  context.moveTo(x(currentHour), markerY);
  context.lineTo(x(currentHour), y(0));
  context.strokeStyle = CHART_COLORS.night;
  context.lineWidth = 4;
  context.stroke();
  context.strokeStyle = CHART_COLORS.sun;
  context.lineWidth = 1.5;
  context.stroke();
  context.font = "34px Segoe UI Symbol, sans-serif";
  context.strokeStyle = CHART_COLORS.night;
  context.lineWidth = 2;
  context.textAlign = "center";
  context.strokeText("☀", x(currentHour), markerY);
  context.fillStyle = CHART_COLORS.sun;
  context.fillText("☀", x(currentHour), markerY);
}

function drawHourAxis(context, { x }, axisColor, height) {
  context.font = "10px Segoe UI, sans-serif";
  context.fillStyle = axisColor;
  context.textAlign = "center";
  for (const hour of [0, 6, 12, 18, 24]) context.fillText(`${String(hour).padStart(2, "0")} h`, x(hour), height - 10);
}

function describeChart(canvas, { latitude, declination, threshold, usesSolarTime, showsCurrentTime }) {
  const timeReference = usesSolarTime ? "heure solaire" : "heure légale";
  const currentTimeLabel = showsCurrentTime ? " Le soleil indique l'heure actuelle." : "";
  canvas.setAttribute("aria-label", `Hauteur solaire en ${timeReference}. Latitude ${formatLatitude(latitude)}, déclinaison ${declination.toFixed(2)} degrés, seuil ${threshold.toFixed(3)} degrés.${currentTimeLabel}`);
}

// solarNoonHour: heure légale du midi solaire (12 = axe en heure solaire).
export function drawSolarChart(canvas, latitude, declination, threshold, currentSolarHour = null, solarNoonHour = 12) {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const shift = solarNoonHour - 12;
  const altitudeAt = (hour) => solarAltitude(hour - shift, latitude, declination);
  const currentHour = currentSolarHour === null ? null : ((currentSolarHour + shift) % 24 + 24) % 24;
  const context = prepareCanvas(canvas, bounds);
  const axisColor = readAxisColor(canvas);
  const projection = createProjection(bounds.width, bounds.height);

  drawBackground(context, projection, findDaylightIntervals(altitudeAt, threshold), bounds.width, bounds.height);
  drawAltitudeGrid(context, projection, axisColor);
  drawThresholdLine(context, projection, threshold);
  drawSunCurve(context, projection, altitudeAt);
  drawNoonMarker(context, projection, altitudeAt, solarNoonHour);
  if (currentHour !== null) drawCurrentSunMarker(context, projection, altitudeAt, currentHour);
  drawHourAxis(context, projection, axisColor, bounds.height);
  describeChart(canvas, {
    latitude,
    declination,
    threshold,
    usesSolarTime: shift === 0,
    showsCurrentTime: currentHour !== null
  });
}
