import assert from "node:assert/strict";
import test from "node:test";
import { calculateSolarDay } from "../src/calculation.js";

const DEFAULT_INPUT = Object.freeze({
  dateValue: "2026-10-18",
  latitudeValue: "48.8566",
  longitudeValue: "2.3522",
  thresholdValue: "-0.833",
  model: "meeus",
  timezone: "Europe/Paris"
});
const EXPECTED_VALIDITY = true;
const EXPECTED_INVALIDITY = false;
const EXPECTED_YEAR = 2026;
const MINIMUM_DAYLIGHT_HOURS = 0;
const MAXIMUM_DAYLIGHT_HOURS = 24;
const NO_DAYLIGHT_HOURS = 0;
const POLAR_DAYLIGHT_HOURS = 24;
const EXPECTED_NO_SOLAR_EVENTS = null;
const EXPECTED_INVALID_TIMEZONE_FIELD = "timezone";
const INDEPENDENT_REFERENCE_CASES = [
  {
    name: "Paris au solstice de décembre",
    input: { dateValue: "2024-12-21", latitudeValue: "48.8566", longitudeValue: "2.3522", timezone: "Europe/Paris" },
    sunrise: 8 + 42 / 60,
    sunset: 16 + 56 / 60
  },
  {
    name: "Quito à l'équinoxe de mars",
    input: { dateValue: "2024-03-20", latitudeValue: "-0.1807", longitudeValue: "-78.4678", timezone: "America/Guayaquil" },
    sunrise: 6 + 18 / 60,
    sunset: 18 + 24 / 60
  },
  {
    name: "Tokyo au solstice de juin",
    input: { dateValue: "2024-06-21", latitudeValue: "35.6762", longitudeValue: "139.6503", timezone: "Asia/Tokyo" },
    sunrise: 4 + 26 / 60,
    sunset: 19 + 1 / 60
  },
  {
    name: "New York au passage à l'heure d'été",
    input: { dateValue: "2024-03-10", latitudeValue: "40.7128", longitudeValue: "-74.006", timezone: "America/New_York" },
    sunrise: 7 + 15 / 60,
    sunset: 18 + 58 / 60
  },
  {
    name: "Sydney au solstice de décembre",
    input: { dateValue: "2024-12-21", latitudeValue: "-33.8688", longitudeValue: "151.2093", timezone: "Australia/Sydney" },
    sunrise: 5 + 41 / 60,
    sunset: 20 + 6 / 60
  }
];

// Crée les paramètres d'un scénario en remplaçant les valeurs par défaut nécessaires.
function givenInput(overrides = {}) {
  return { ...DEFAULT_INPUT, ...overrides };
}

// Vérifie que le calculateur accepte des paramètres valides.
test("un jeu de paramètres valide est accepté", () => {
  // Given
  const input = givenInput();
  const expectedValidity = EXPECTED_VALIDITY;

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
});

// Vérifie que le résultat conserve l'année de la date demandée.
test("le résultat conserve l'année de la date choisie", () => {
  // Given
  const input = givenInput();
  const expectedYear = EXPECTED_YEAR;

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.date.year, expectedYear);
});

// Vérifie que le calcul renvoie une déclinaison finie.
test("le calcul renvoie une déclinaison solaire finie", () => {
  // Given
  const input = givenInput();
  const expectedFiniteResult = EXPECTED_VALIDITY;

  // When
  const result = calculateSolarDay(input);
  const declinationIsFinite = Number.isFinite(result.declination);

  // Then
  assert.equal(declinationIsFinite, expectedFiniteResult);
});

// Vérifie que la durée calculée reste entre zéro et vingt-quatre heures.
test("la durée calculée reste dans l'intervalle d'une journée", () => {
  // Given
  const input = givenInput();
  const minimumDaylightHours = MINIMUM_DAYLIGHT_HOURS;
  const maximumDaylightHours = MAXIMUM_DAYLIGHT_HOURS;
  const expectedDurationWithinRange = EXPECTED_VALIDITY;

  // When
  const result = calculateSolarDay(input);
  const durationIsWithinRange = result.duration > minimumDaylightHours && result.duration < maximumDaylightHours;

  // Then
  assert.equal(durationIsWithinRange, expectedDurationWithinRange);
});

// Vérifie que le calcul fournit des heures de lever et de coucher estimées.
test("un jour non polaire renvoie des heures de lever et de coucher finies", () => {
  // Given
  const input = givenInput();
  const expectedFiniteEvents = EXPECTED_VALIDITY;

  // When
  const result = calculateSolarDay(input);
  const eventsAreFinite = Number.isFinite(result.events.sunrise) && Number.isFinite(result.events.sunset);

  // Then
  assert.equal(eventsAreFinite, expectedFiniteEvents);
});

// Vérifie les heures de lever et de coucher pour un solstice de référence à Paris.
test("les événements solaires du solstice de juin restent proches des horaires de référence", () => {
  // Given
  const input = givenInput({
    dateValue: "2024-06-21",
    latitudeValue: "48.8566",
    longitudeValue: "2.3522",
    timezone: "Europe/Paris"
  });
  const expectedSunrise = 5 + 47 / 60;
  const expectedSunset = 21 + 58 / 60;
  const eventTimeToleranceHours = 1 / 60;

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.ok(Math.abs(result.events.sunrise - expectedSunrise) < eventTimeToleranceHours);
  assert.ok(Math.abs(result.events.sunset - expectedSunset) < eventTimeToleranceHours);
});

// Vérifie les horaires de référence dans plusieurs régions et fuseaux horaires.
test("les événements solaires correspondent aux références indépendantes", () => {
  // Given
  const referenceCases = INDEPENDENT_REFERENCE_CASES;
  const eventTimeToleranceHours = 1 / 60;

  // When
  const results = referenceCases.map((scenario) => ({
    name: scenario.name,
    expectedSunrise: scenario.sunrise,
    expectedSunset: scenario.sunset,
    result: calculateSolarDay(givenInput(scenario.input))
  }));

  // Then
  for (const { name, expectedSunrise, expectedSunset, result } of results) {
    assert.equal(result.valid, EXPECTED_VALIDITY, `${name}: paramètres valides`);
    assert.ok(Math.abs(result.events.sunrise - expectedSunrise) < eventTimeToleranceHours, `${name}: lever`);
    assert.ok(Math.abs(result.events.sunset - expectedSunset) < eventTimeToleranceHours, `${name}: coucher`);
  }
});

// Vérifie qu'une date hors de l'intervalle autorisé est signalée.
test("une date hors limites est rejetée par le calculateur", () => {
  // Given
  const input = givenInput({ dateValue: "1899-12-31" });
  const expectedValidity = EXPECTED_INVALIDITY;
  const expectedInvalidField = "date";

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.field, expectedInvalidField);
});

// Vérifie qu'une date après l'intervalle autorisé est signalée.
test("une date après 3000 est rejetée par le calculateur", () => {
  // Given
  const input = givenInput({ dateValue: "3001-01-01" });
  const expectedValidity = EXPECTED_INVALIDITY;
  const expectedInvalidField = "date";

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.field, expectedInvalidField);
});

// Vérifie qu'une latitude hors limites est signalée.
test("une latitude hors limites est rejetée par le calculateur", () => {
  // Given
  const input = givenInput({ latitudeValue: "91" });
  const expectedValidity = EXPECTED_INVALIDITY;
  const expectedInvalidField = "latitude";

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.field, expectedInvalidField);
});

// Vérifie qu'une latitude vide est rejetée par le calculateur.
test("une latitude vide est rejetée par le calculateur", () => {
  // Given
  const input = givenInput({ latitudeValue: "" });
  const expectedValidity = EXPECTED_INVALIDITY;
  const expectedInvalidField = "latitude";

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.field, expectedInvalidField);
});

// Vérifie qu'une longitude hors limites est signalée.
test("une longitude hors limites est rejetée par le calculateur", () => {
  // Given
  const input = givenInput({ longitudeValue: "181" });
  const expectedValidity = EXPECTED_INVALIDITY;
  const expectedInvalidField = "longitude";

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.field, expectedInvalidField);
});

// Vérifie qu'un seuil hors limites est signalé.
test("un seuil hors limites est rejeté par le calculateur", () => {
  // Given
  const input = givenInput({ thresholdValue: "91" });
  const expectedValidity = EXPECTED_INVALIDITY;
  const expectedInvalidField = "threshold";

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.field, expectedInvalidField);
});

// Vérifie qu'un fuseau horaire invalide est signalé sans lever d'exception.
test("un fuseau horaire invalide est rejeté par le calculateur", () => {
  // Given
  const input = givenInput({ timezone: "Invalid/Zone" });
  const expectedValidity = EXPECTED_INVALIDITY;
  const expectedInvalidField = EXPECTED_INVALID_TIMEZONE_FIELD;

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.field, expectedInvalidField);
});

// Vérifie qu'un fuseau horaire vide est rejeté par le calculateur.
test("un fuseau horaire vide est rejeté par le calculateur", () => {
  // Given
  const input = givenInput({ timezone: " " });
  const expectedValidity = EXPECTED_INVALIDITY;
  const expectedInvalidField = EXPECTED_INVALID_TIMEZONE_FIELD;

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.field, expectedInvalidField);
});

// Vérifie que les événements sont absents lors d'un jour polaire.
test("un jour polaire n'expose pas d'heures de lever ou de coucher", () => {
  // Given
  const input = givenInput({ dateValue: "2024-06-21", latitudeValue: "90", longitudeValue: "0", timezone: "UTC" });
  const expectedValidity = EXPECTED_VALIDITY;
  const expectedDuration = POLAR_DAYLIGHT_HOURS;
  const expectedEvents = EXPECTED_NO_SOLAR_EVENTS;

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.duration, expectedDuration);
  assert.equal(result.events, expectedEvents);
});

// Vérifie que la nuit polaire ne produit pas d'heures d'événement.
test("une nuit polaire n'expose pas d'heures de lever ou de coucher", () => {
  // Given
  const input = givenInput({ dateValue: "2024-12-21", latitudeValue: "90", longitudeValue: "0", timezone: "UTC" });
  const expectedValidity = EXPECTED_VALIDITY;
  const expectedDuration = NO_DAYLIGHT_HOURS;
  const expectedEvents = EXPECTED_NO_SOLAR_EVENTS;

  // When
  const result = calculateSolarDay(input);

  // Then
  assert.equal(result.valid, expectedValidity);
  assert.equal(result.duration, expectedDuration);
  assert.equal(result.events, expectedEvents);
});