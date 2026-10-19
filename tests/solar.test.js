import assert from "node:assert/strict";
import test from "node:test";
import { dateStringInTimezone, formatClockTime, formatDuration, localDateString } from "../src/formatting.js";
import {
  declinationFor,
  durationHours,
  estimateSolarEvents,
  parseDate,
  solarAltitude
} from "../src/solar.js";

const REFERENCE_DATE = "2026-10-18";
const MEEUS_MODEL = "meeus";
const SPENCER_MODEL = "spencer";
const SINUSOIDAL_MODEL = "sinusoidal";
const MAX_SOLAR_DECLINATION_DEGREES = 24;
const EQUATORIAL_LATITUDE = 0;
const NORTH_POLE_LATITUDE = 90;
const SOUTH_POLE_LATITUDE = -90;
const ARCTIC_CIRCLE_TEST_LATITUDE = 80;
const ZERO_DEGREES = 0;
const NORTH_SUMMER_DECLINATION = 23;
const SOUTH_SUMMER_DECLINATION = -23;
const MAX_DAYLIGHT_HOURS = 24;
const NO_DAYLIGHT_HOURS = 0;
const ALTITUDE_TOLERANCE_DEGREES = 1e-10;
const EXPECTED_TRUE = true;

// Vérifie que l'analyse accepte un jour bissextile valide.
test("parseDate accepte un jour bissextile valide", () => {
  // Given
  const value = "2024-02-29";
  const expectedOrdinal = 60;

  // When
  const result = parseDate(value);

  // Then
  assert.equal(result.ordinal, expectedOrdinal);
});

// Vérifie qu'une année séculaire non divisible par 400 n'est pas bissextile.
test("parseDate rejette le 29 février 1900", () => {
  // Given
  const value = "1900-02-29";
  const expectedDate = null;

  // When
  const result = parseDate(value);

  // Then
  assert.equal(result, expectedDate);
});

// Vérifie qu'une année séculaire divisible par 400 est bissextile.
test("parseDate accepte le 29 février 2000", () => {
  // Given
  const value = "2000-02-29";
  const expectedOrdinal = 60;

  // When
  const result = parseDate(value);

  // Then
  assert.equal(result.ordinal, expectedOrdinal);
});

// Vérifie que l'analyse rejette une date impossible.
test("parseDate rejette une date calendaire impossible", () => {
  // Given
  const value = "2023-02-29";
  const expectedDate = null;

  // When
  const result = parseDate(value);

  // Then
  assert.equal(result, expectedDate);
});

// Vérifie que l'analyse rejette une date mal formée.
test("parseDate rejette une date mal formée", () => {
  // Given
  const value = "not-a-date";
  const expectedDate = null;

  // When
  const result = parseDate(value);

  // Then
  assert.equal(result, expectedDate);
});

// Vérifie que l'analyse rejette un mois hors calendrier.
test("parseDate rejette un mois hors calendrier", () => {
  // Given
  const value = "2024-13-01";
  const expectedDate = null;

  // When
  const result = parseDate(value);

  // Then
  assert.equal(result, expectedDate);
});

// Vérifie que le modèle de Meeus renvoie une déclinaison finie.
test("le modèle de Meeus renvoie une déclinaison solaire finie", () => {
  // Given
  const date = parseDate(REFERENCE_DATE);
  const model = MEEUS_MODEL;
  const maximumDeclination = MAX_SOLAR_DECLINATION_DEGREES;
  const expectedFiniteResult = EXPECTED_TRUE;

  // When
  const declination = declinationFor(date, model);
  const declinationIsFinite = Number.isFinite(declination);
  const declinationIsWithinRange = Math.abs(declination) <= maximumDeclination;

  // Then
  assert.equal(declinationIsFinite, expectedFiniteResult);
  assert.equal(declinationIsWithinRange, expectedFiniteResult);
});

// Vérifie que le modèle de Spencer renvoie une déclinaison finie.
test("le modèle de Spencer renvoie une déclinaison solaire finie", () => {
  // Given
  const date = parseDate(REFERENCE_DATE);
  const model = SPENCER_MODEL;
  const maximumDeclination = MAX_SOLAR_DECLINATION_DEGREES;
  const expectedFiniteResult = EXPECTED_TRUE;

  // When
  const declination = declinationFor(date, model);
  const declinationIsFinite = Number.isFinite(declination);
  const declinationIsWithinRange = Math.abs(declination) <= maximumDeclination;

  // Then
  assert.equal(declinationIsFinite, expectedFiniteResult);
  assert.equal(declinationIsWithinRange, expectedFiniteResult);
});

// Vérifie que le modèle sinusoïdal renvoie une déclinaison finie.
test("le modèle sinusoïdal renvoie une déclinaison solaire finie", () => {
  // Given
  const date = parseDate(REFERENCE_DATE);
  const model = SINUSOIDAL_MODEL;
  const maximumDeclination = MAX_SOLAR_DECLINATION_DEGREES;
  const expectedFiniteResult = EXPECTED_TRUE;

  // When
  const declination = declinationFor(date, model);
  const declinationIsFinite = Number.isFinite(declination);
  const declinationIsWithinRange = Math.abs(declination) <= maximumDeclination;

  // Then
  assert.equal(declinationIsFinite, expectedFiniteResult);
  assert.equal(declinationIsWithinRange, expectedFiniteResult);
});

// Vérifie que le modèle de Meeus place la déclinaison près de zéro à l'équinoxe.
test("le modèle de Meeus estime une déclinaison proche de zéro à l'équinoxe de mars", () => {
  // Given
  const date = parseDate("2024-03-20");
  const model = MEEUS_MODEL;
  const expectedDeclination = 0.15;
  const declinationTolerance = 0.1;

  // When
  const declination = declinationFor(date, model);

  // Then
  assert.ok(Math.abs(declination - expectedDeclination) < declinationTolerance);
});

// Vérifie que le modèle de Meeus estime une déclinaison boréale au solstice de juin.
test("le modèle de Meeus estime environ 23,44 degrés au solstice de juin", () => {
  // Given
  const date = parseDate("2024-06-21");
  const model = MEEUS_MODEL;
  const expectedDeclination = 23.44;
  const declinationTolerance = 0.1;

  // When
  const declination = declinationFor(date, model);

  // Then
  assert.ok(Math.abs(declination - expectedDeclination) < declinationTolerance);
});

// Vérifie que le modèle de Meeus estime une déclinaison australe au solstice de décembre.
test("le modèle de Meeus estime environ moins 23,44 degrés au solstice de décembre", () => {
  // Given
  const date = parseDate("2024-12-21");
  const model = MEEUS_MODEL;
  const expectedDeclination = -23.44;
  const declinationTolerance = 0.1;

  // When
  const declination = declinationFor(date, model);

  // Then
  assert.ok(Math.abs(declination - expectedDeclination) < declinationTolerance);
});

// Vérifie la durée du jour à l'équateur lors de l'équinoxe.
test("le jour dure environ douze heures à l'équateur lors de l'équinoxe", () => {
  // Given
  const equinox = parseDate("2024-03-20");
  const equinoxDeclination = declinationFor(equinox, MEEUS_MODEL);
  const latitude = EQUATORIAL_LATITUDE;
  const threshold = ZERO_DEGREES;
  const expectedDuration = 12;
  const durationTolerance = 0.1;

  // When
  const duration = durationHours(latitude, equinoxDeclination, threshold);

  // Then
  assert.ok(Math.abs(duration - expectedDuration) < durationTolerance);
});

// Vérifie le jour polaire au pôle Nord lorsque le Soleil dépasse le seuil.
test("le pôle Nord connaît un jour polaire lorsque le Soleil dépasse le seuil", () => {
  // Given
  const latitude = NORTH_POLE_LATITUDE;
  const declination = NORTH_SUMMER_DECLINATION;
  const threshold = ZERO_DEGREES;
  const expectedDuration = MAX_DAYLIGHT_HOURS;

  // When
  const duration = durationHours(latitude, declination, threshold);

  // Then
  assert.equal(duration, expectedDuration);
});

// Vérifie la nuit polaire au pôle Sud lorsque le Soleil reste sous le seuil.
test("le pôle Sud connaît une nuit polaire lorsque le Soleil reste sous le seuil", () => {
  // Given
  const latitude = SOUTH_POLE_LATITUDE;
  const declination = NORTH_SUMMER_DECLINATION;
  const threshold = ZERO_DEGREES;
  const expectedDuration = NO_DAYLIGHT_HOURS;

  // When
  const duration = durationHours(latitude, declination, threshold);

  // Then
  assert.equal(duration, expectedDuration);
});

// Vérifie le formatage d'une heure négative.
test("une heure négative est ramenée au jour précédent", () => {
  // Given
  const hour = -0.5;
  const expectedClockTime = "23:30";

  // When
  const clockTime = formatClockTime(hour);

  // Then
  assert.equal(clockTime, expectedClockTime);
});

// Vérifie le formatage d'une heure supérieure à vingt-quatre heures.
test("une heure supérieure à vingt-quatre heures est ramenée au jour suivant", () => {
  // Given
  const hour = 24.25;
  const expectedClockTime = "00:15";

  // When
  const clockTime = formatClockTime(hour);

  // Then
  assert.equal(clockTime, expectedClockTime);
});

// Vérifie que la date est formatée à partir du calendrier local.
test("localDateString formate la date selon le calendrier local", () => {
  // Given
  const date = new Date(2024, 0, 9, 12);
  const expectedDateString = "2024-01-09";

  // When
  const dateString = localDateString(date);

  // Then
  assert.equal(dateString, expectedDateString);
});

// Vérifie que la date du jour dépend du fuseau du lieu choisi.
test("dateStringInTimezone renvoie la date du fuseau demandé", () => {
  // Given
  const instant = new Date("2024-01-01T00:30:00Z");
  const losAngelesTimezone = "America/Los_Angeles";
  const tokyoTimezone = "Asia/Tokyo";
  const expectedLosAngelesDate = "2023-12-31";
  const expectedTokyoDate = "2024-01-01";

  // When
  const losAngelesDate = dateStringInTimezone(instant, losAngelesTimezone);
  const tokyoDate = dateStringInTimezone(instant, tokyoTimezone);

  // Then
  assert.equal(losAngelesDate, expectedLosAngelesDate);
  assert.equal(tokyoDate, expectedTokyoDate);
});

// Vérifie le formatage des heures fractionnaires en heures et minutes.
test("formatDuration convertit les heures fractionnaires en minutes", () => {
  // Given
  const duration = 5.5;
  const expectedFormattedDuration = "5 h 30 min";

  // When
  const formattedDuration = formatDuration(duration);

  // Then
  assert.equal(formattedDuration, expectedFormattedDuration);
});

// Vérifie que l'arrondi des minutes peut faire passer à l'heure suivante.
test("formatDuration reporte les minutes arrondies sur l'heure suivante", () => {
  // Given
  const duration = 5 + 59.6 / 60;
  const expectedFormattedDuration = "6 h 00 min";

  // When
  const formattedDuration = formatDuration(duration);

  // Then
  assert.equal(formattedDuration, expectedFormattedDuration);
});

// Vérifie la hauteur du Soleil à midi à l'équateur.
test("la hauteur solaire atteint quatre-vingt-dix degrés à midi à l'équateur", () => {
  // Given
  const [hour, latitude, declination] = [12, EQUATORIAL_LATITUDE, ZERO_DEGREES];
  const expectedAltitude = 90;
  const altitudeTolerance = ALTITUDE_TOLERANCE_DEGREES;

  // When
  const altitude = solarAltitude(hour, latitude, declination);

  // Then
  assert.ok(Math.abs(altitude - expectedAltitude) < altitudeTolerance);
});

// Vérifie que la hauteur solaire est nulle à l'horizon équatorial.
test("la hauteur solaire est nulle à l'horizon équatorial", () => {
  // Given
  const [hour, latitude, declination] = [6, EQUATORIAL_LATITUDE, ZERO_DEGREES];
  const expectedAltitude = ZERO_DEGREES;
  const altitudeTolerance = ALTITUDE_TOLERANCE_DEGREES;

  // When
  const altitude = solarAltitude(hour, latitude, declination);

  // Then
  assert.ok(Math.abs(altitude - expectedAltitude) < altitudeTolerance);
});

// Vérifie le cas limite où le Soleil atteint juste le seuil au pôle.
test("la durée du jour est nulle quand le Soleil atteint juste le seuil au pôle", () => {
  // Given
  const [latitude, declination, threshold] = [NORTH_POLE_LATITUDE, NORTH_SUMMER_DECLINATION, 23];
  const expectedDuration = NO_DAYLIGHT_HOURS;

  // When
  const duration = durationHours(latitude, declination, threshold);

  // Then
  assert.equal(duration, expectedDuration);
});

// Vérifie le jour polaire au pôle Sud pendant l'été austral.
test("la durée du jour atteint vingt-quatre heures au pôle Sud en été austral", () => {
  // Given
  const [latitude, declination, threshold] = [SOUTH_POLE_LATITUDE, SOUTH_SUMMER_DECLINATION, ZERO_DEGREES];
  const expectedDuration = MAX_DAYLIGHT_HOURS;

  // When
  const duration = durationHours(latitude, declination, threshold);

  // Then
  assert.equal(duration, expectedDuration);
});

// Vérifie le jour polaire au-delà du cercle arctique en été.
test("la durée du jour atteint vingt-quatre heures au-delà du cercle arctique en été", () => {
  // Given
  const [latitude, declination, threshold] = [ARCTIC_CIRCLE_TEST_LATITUDE, NORTH_SUMMER_DECLINATION, ZERO_DEGREES];
  const expectedDuration = MAX_DAYLIGHT_HOURS;

  // When
  const duration = durationHours(latitude, declination, threshold);

  // Then
  assert.equal(duration, expectedDuration);
});

// Vérifie la nuit polaire au-delà du cercle arctique en hiver.
test("la durée du jour est nulle au-delà du cercle arctique en hiver", () => {
  // Given
  const [latitude, declination, threshold] = [ARCTIC_CIRCLE_TEST_LATITUDE, SOUTH_SUMMER_DECLINATION, ZERO_DEGREES];
  const expectedDuration = NO_DAYLIGHT_HOURS;

  // When
  const duration = durationHours(latitude, declination, threshold);

  // Then
  assert.equal(duration, expectedDuration);
});

// Vérifie que les événements solaires utilisent le fuseau horaire demandé.
test("les événements solaires utilisent le fuseau horaire demandé", () => {
  // Given
  const date = parseDate(REFERENCE_DATE);
  const declination = declinationFor(date, MEEUS_MODEL);
  const latitude = 52.52;
  const longitude = 13.405;
  const timezone = "Europe/Berlin";
  const threshold = -0.833;
  const expectedSunriseRange = [6, 9];
  const expectedSunsetRange = [16, 20];
  const expectedEventsAreWithinRange = EXPECTED_TRUE;

  // When
  const events = estimateSolarEvents(date, latitude, longitude, declination, threshold, timezone);
  const sunriseIsInRange = events.sunrise > expectedSunriseRange[0] && events.sunrise < expectedSunriseRange[1];
  const sunsetIsInRange = events.sunset > expectedSunsetRange[0] && events.sunset < expectedSunsetRange[1];

  // Then
  assert.equal(sunriseIsInRange, expectedEventsAreWithinRange);
  assert.equal(sunsetIsInRange, expectedEventsAreWithinRange);
});