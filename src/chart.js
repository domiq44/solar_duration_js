import { solarAltitude } from "./solar.js";

function formatLatitude(latitude) {
  const hemisphere = latitude < 0 ? "S" : "N";
  const absolute = Math.abs(latitude).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return `${absolute}° ${hemisphere}`;
}

export function drawSolarChart(canvas, latitude, declination, threshold, currentSolarHour = null) {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  const context = canvas.getContext("2d");
  const styles = typeof getComputedStyle === "function" ? getComputedStyle(canvas) : null;
  const chartColor = (property, fallback) => styles?.getPropertyValue(property).trim() || fallback;
  context.scale(scale, scale);
  const width = bounds.width;
  const height = bounds.height;
  const plot = { left: 38, right: width - 9, top: 12, bottom: height - 26 };
  const x = (hour) => plot.left + hour / 24 * (plot.right - plot.left);
  const y = (altitude) => plot.top + (90 - altitude) / 180 * (plot.bottom - plot.top);

  context.clearRect(0, 0, width, height);
  context.font = "10px Segoe UI, sans-serif";
  context.textBaseline = "middle";
  context.fillStyle = chartColor("--chart-axis", "#56645b");
  context.strokeStyle = chartColor("--chart-grid", "#dce4dd");
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

  context.setLineDash([4, 4]);
  context.strokeStyle = chartColor("--chart-threshold", "#a13e2a");
  context.save();
  context.beginPath();
  context.rect(plot.left, plot.top, plot.right - plot.left, y(threshold) - plot.top);
  context.clip();
  context.beginPath();
  context.moveTo(plot.left, y(threshold));
  context.lineTo(plot.right, y(threshold));
  context.stroke();
  context.setLineDash([]);

  context.beginPath();
  for (let step = 0; step <= 144; step += 1) {
    const hour = step / 6;
    const pointX = x(hour);
    const pointY = y(solarAltitude(hour, latitude, declination));
    if (step === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.lineTo(plot.right, y(-90));
  context.lineTo(plot.left, y(-90));
  context.closePath();
  context.fillStyle = chartColor("--chart-sun-fill", "rgba(138, 85, 0, 0.12)");
  context.fill();
  context.restore();
  context.setLineDash([]);

  context.beginPath();
  for (let step = 0; step <= 144; step += 1) {
    const hour = step / 6;
    const pointX = x(hour);
    const pointY = y(solarAltitude(hour, latitude, declination));
    if (step === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.strokeStyle = chartColor("--chart-sun", "#8a5500");
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.stroke();
  const maximumHour = 12;
  const maximumX = x(maximumHour);
  const zeroAltitudeY = y(0);
  context.beginPath();
  context.moveTo(maximumX, y(solarAltitude(maximumHour, latitude, declination)));
  context.lineTo(maximumX, zeroAltitudeY);
  context.setLineDash([]);
  context.strokeStyle = chartColor("--chart-current-axis", "rgba(86, 100, 91, 0.7)");
  context.lineWidth = 1;
  context.stroke();
  context.font = "10px Segoe UI, sans-serif";
  context.fillStyle = chartColor("--chart-axis", "#56645b");
  context.textAlign = "center";
  context.fillText("S", maximumX, zeroAltitudeY + 12);
  if (currentSolarHour !== null) {
    const altitude = solarAltitude(currentSolarHour, latitude, declination);
    const markerY = y(altitude);
    context.beginPath();
    context.moveTo(x(currentSolarHour), markerY);
    context.lineTo(x(currentSolarHour), y(0));
    context.strokeStyle = chartColor("--chart-current-sun", "rgba(138, 85, 0, 0.65)");
    context.lineWidth = 1;
    context.stroke();
    context.font = "34px Segoe UI Symbol, sans-serif";
    context.fillStyle = chartColor("--chart-sun", "#8a5500");
    context.textAlign = "center";
    context.fillText("☀", x(currentSolarHour), markerY);
  }
  context.font = "10px Segoe UI, sans-serif";
  context.fillStyle = chartColor("--chart-axis", "#56645b");
  context.textAlign = "center";
  for (const hour of [0, 6, 12, 18, 24]) context.fillText(`${String(hour).padStart(2, "0")} h`, x(hour), height - 10);
  const currentTimeLabel = currentSolarHour === null ? "" : " Le soleil indique l'heure actuelle.";
  canvas.setAttribute("aria-label", `Hauteur solaire en heure solaire. Latitude ${formatLatitude(latitude)}, déclinaison ${declination.toFixed(2)} degrés, seuil ${threshold.toFixed(3)} degrés.${currentTimeLabel}`);
}