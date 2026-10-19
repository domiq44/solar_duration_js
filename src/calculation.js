import { declinationFor, durationHours, estimateSolarEvents, parseDate } from "./solar.js";

export function calculateSolarDay({ dateValue, latitudeValue, longitudeValue, thresholdValue, model, timezone }) {
  const date = parseDate(dateValue);
  if (!date || date.year < 1900 || date.year > 3000) return { valid: false, field: "date" };

  const latitudeText = latitudeValue.trim();
  const latitude = Number(latitudeText);
  if (!latitudeText || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { valid: false, field: "latitude" };
  }

  const longitudeText = longitudeValue.trim();
  const longitude = Number(longitudeText);
  if (!longitudeText || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { valid: false, field: "longitude" };
  }

  const thresholdText = thresholdValue.trim();
  const threshold = Number(thresholdText);
  if (!thresholdText || !Number.isFinite(threshold) || threshold < -90 || threshold > 90) {
    return { valid: false, field: "threshold" };
  }

  if (typeof timezone !== "string" || !timezone.trim()) {
    return { valid: false, field: "timezone" };
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return { valid: false, field: "timezone" };
  }

  const declination = declinationFor(date, model);
  const duration = durationHours(latitude, declination, threshold);
  const events = duration === 0 || duration === 24
    ? null
    : estimateSolarEvents(date, latitude, longitude, declination, threshold, timezone);

  return { valid: true, date, latitude, longitude, threshold, model, timezone, declination, duration, events };
}