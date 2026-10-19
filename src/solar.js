const radians = Math.PI / 180;
const degrees = 180 / Math.PI;

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function dayOfYear(year, month, day) {
  const monthLengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return monthLengths.slice(0, month - 1).reduce((total, days) => total + days, day);
}

export function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month, day, ordinal: dayOfYear(year, month, day), date };
}

function sinusoidalDeclination({ year, ordinal }) {
  const yearLength = isLeapYear(year) ? 366 : 365;
  const phase = (ordinal / yearLength - 81 / yearLength) * 2 * Math.PI;
  return 23.45 * Math.sin(phase);
}

function spencerDeclination({ ordinal }) {
  const phase = (ordinal - 1) * 2 * Math.PI / 365;
  const delta = 0.006918 - 0.399912 * Math.cos(phase) + 0.070257 * Math.sin(phase)
    - 0.006758 * Math.cos(2 * phase) + 0.000907 * Math.sin(2 * phase)
    - 0.002697 * Math.cos(3 * phase) + 0.00148 * Math.sin(3 * phase);
  return delta * degrees;
}

function julianDay({ year, month, day }) {
  let adjustedYear = year;
  let adjustedMonth = month;
  if (adjustedMonth <= 2) {
    adjustedYear -= 1;
    adjustedMonth += 12;
  }
  const century = Math.trunc(adjustedYear / 100);
  const correction = 2 - century + Math.trunc(century / 4);
  return Math.floor(365.25 * (adjustedYear + 4716))
    + Math.floor(30.6001 * (adjustedMonth + 1)) + day + correction - 1524.5 + 0.5;
}

function meeusDeclination(date) {
  const julianDate = julianDay({ year: date.year, month: 1, day: 1 }) + date.ordinal - 1;
  const centuries = (julianDate - 2451545) / 36525;
  const meanLongitude = (280.46646 + 36000.76983 * centuries + 0.0003032 * centuries ** 2) % 360;
  const meanAnomaly = ((357.52911 + 35999.05029 * centuries - 0.0001537 * centuries ** 2) % 360) * radians;
  const equationOfCenter = (1.914602 - 0.004817 * centuries - 0.000014 * centuries ** 2) * Math.sin(meanAnomaly)
    + (0.019993 - 0.000101 * centuries) * Math.sin(2 * meanAnomaly)
    + 0.000289 * Math.sin(3 * meanAnomaly);
  const trueLongitude = meanLongitude + equationOfCenter;
  const omega = (125.04 - 1934.136 * centuries) * radians;
  const apparentLongitude = (trueLongitude - 0.00569 - 0.00478 * Math.sin(omega)) * radians;
  const meanObliquity = 23.43929111 - 0.013004167 * centuries - 0.000000164 * centuries ** 2 + 0.000000504 * centuries ** 3;
  const obliquity = (meanObliquity + 0.00256 * Math.cos(omega)) * radians;
  return Math.asin(Math.sin(obliquity) * Math.sin(apparentLongitude)) * degrees;
}

function equationOfTimeMinutes(date) {
  const centuries = (julianDay(date) - 2451545) / 36525;
  const meanLongitude = (280.46646 + 36000.76983 * centuries + 0.0003032 * centuries ** 2) * radians;
  const meanAnomaly = (357.52911 + 35999.05029 * centuries - 0.0001537 * centuries ** 2) * radians;
  const eccentricity = 0.016708634 - 0.000042037 * centuries - 0.0000001267 * centuries ** 2;
  const omega = (125.04 - 1934.136 * centuries) * radians;
  const obliquity = (23.43929111 - 0.013004167 * centuries - 0.000000164 * centuries ** 2
    + 0.000000504 * centuries ** 3 + 0.00256 * Math.cos(omega)) * radians;
  const y = Math.tan(obliquity / 2) ** 2;
  const equation = y * Math.sin(2 * meanLongitude) - 2 * eccentricity * Math.sin(meanAnomaly)
    + 4 * eccentricity * y * Math.sin(meanAnomaly) * Math.cos(2 * meanLongitude)
    - 0.5 * y ** 2 * Math.sin(4 * meanLongitude)
    - 1.25 * eccentricity ** 2 * Math.sin(2 * meanAnomaly);
  return equation * degrees * 4;
}

function timezoneOffsetMinutes(date, timezone) {
  const instant = new Date(Date.UTC(date.year, date.month - 1, date.day, 12));
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(instant).reduce((values, part) => {
    if (part.type !== "literal") values[part.type] = Number(part.value);
    return values;
  }, {});
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (localAsUtc - instant.getTime()) / 60000;
}

export function declinationFor(date, model) {
  if (model === "spencer") return spencerDeclination(date);
  if (model === "sinusoidal") return sinusoidalDeclination(date);
  return meeusDeclination(date);
}

export function durationHours(latitude, declination, threshold) {
  if (Math.abs(latitude) === 90) {
    const altitudeAtPole = latitude > 0 ? declination : -declination;
    return altitudeAtPole > threshold ? 24 : 0;
  }
  const phi = latitude * radians;
  const delta = declination * radians;
  const altitude = threshold * radians;
  const cosHourAngle = (Math.sin(altitude) - Math.sin(phi) * Math.sin(delta))
    / (Math.cos(phi) * Math.cos(delta));
  const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle)));
  return 2 * hourAngle * 12 / Math.PI;
}

export function solarAltitude(hour, latitude, declination) {
  const hourAngle = (hour - 12) * 15 * radians;
  const sineAltitude = Math.sin(latitude * radians) * Math.sin(declination * radians)
    + Math.cos(latitude * radians) * Math.cos(declination * radians) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sineAltitude))) * degrees;
}

export function solarHourAt(instant, longitude, date) {
  const utcMinutes = instant.getUTCHours() * 60 + instant.getUTCMinutes()
    + instant.getUTCSeconds() / 60 + instant.getUTCMilliseconds() / 60000;
  const hour = (utcMinutes + 4 * longitude + equationOfTimeMinutes(date)) / 60;
  return ((hour % 24) + 24) % 24;
}

export function estimateSolarEvents(date, latitude, longitude, declination, threshold, timezone) {
  const phi = latitude * radians;
  const delta = declination * radians;
  const altitude = threshold * radians;
  const cosHourAngle = (Math.sin(altitude) - Math.sin(phi) * Math.sin(delta))
    / (Math.cos(phi) * Math.cos(delta));
  const hourAngleDegrees = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) * degrees;
  const civilSolarNoonMinutes = 720 - equationOfTimeMinutes(date) - 4 * longitude
    + timezoneOffsetMinutes(date, timezone);
  return {
    sunrise: (civilSolarNoonMinutes - 4 * hourAngleDegrees) / 60,
    sunset: (civilSolarNoonMinutes + 4 * hourAngleDegrees) / 60
  };
}