import assert from "node:assert/strict";
import test from "node:test";
import { cities, findCity, searchCities } from "../src/cities.js";

const SEARCH_QUERY_WITHOUT_ACCENTS = "geneve";
const EXPECTED_ACCENT_SEARCH_CITY = "Genève";
const SEARCH_QUERY_UPPERCASE = "LISBONNE";
const EXPECTED_CASE_INSENSITIVE_CITY = "Lisbonne";
const EMPTY_SEARCH_QUERY = "";
const MAX_SUGGESTION_COUNT = 8;
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const TIMEZONE_VALIDATION_LOCALE = "en";
const EXPECTED_VALIDATION_RESULT = true;
const KNOWN_CITY_NAME = "Rouen";
const EXPECTED_KNOWN_CITY_LONGITUDE = 1.0993;
const UNKNOWN_CITY_NAME = "Unknown";
const EXPECTED_UNKNOWN_CITY = null;

// Vérifie que la recherche ignore les accents.
test("la recherche de villes ignore les accents", () => {
  // Given
  const query = SEARCH_QUERY_WITHOUT_ACCENTS;
  const expectedCityName = EXPECTED_ACCENT_SEARCH_CITY;

  // When
  const results = searchCities(query);

  // Then
  assert.equal(results[0].name, expectedCityName);
});

// Vérifie que la recherche ignore la casse.
test("la recherche de villes ignore la casse", () => {
  // Given
  const query = SEARCH_QUERY_UPPERCASE;
  const expectedCityName = EXPECTED_CASE_INSENSITIVE_CITY;

  // When
  const results = searchCities(query);

  // Then
  assert.equal(results[0].name, expectedCityName);
});

// Vérifie que la recherche limite les suggestions à huit résultats.
test("la recherche limite les suggestions à huit villes", () => {
  // Given
  const query = EMPTY_SEARCH_QUERY;
  const expectedSuggestionCount = MAX_SUGGESTION_COUNT;

  // When
  const results = searchCities(query);

  // Then
  assert.equal(results.length, expectedSuggestionCount);
});

// Vérifie que les coordonnées de chaque ville sont valides.
test("toutes les villes ont des coordonnées valides", () => {
  // Given
  const expectedCityCount = cities.length;
  const expectedValidationResult = EXPECTED_VALIDATION_RESULT;

  // When
  const coordinateValidations = cities.map((city) => ({
    name: city.name,
    latitudeIsValid: city.latitude >= MIN_LATITUDE && city.latitude <= MAX_LATITUDE,
    longitudeIsValid: city.longitude >= MIN_LONGITUDE && city.longitude <= MAX_LONGITUDE
  }));

  // Then
  assert.equal(coordinateValidations.length, expectedCityCount);
  for (const validation of coordinateValidations) {
    assert.equal(validation.latitudeIsValid, expectedValidationResult, validation.name);
    assert.equal(validation.longitudeIsValid, expectedValidationResult, validation.name);
  }
});

// Vérifie que le fuseau horaire de chaque ville est valide.
test("toutes les villes ont un fuseau horaire IANA valide", () => {
  // Given
  const expectedCityCount = cities.length;
  const expectedValidationResult = EXPECTED_VALIDATION_RESULT;

  // When
  const timezoneValidations = cities.map((city) => ({
    name: city.name,
    isValid: (() => {
      try {
        new Intl.DateTimeFormat(TIMEZONE_VALIDATION_LOCALE, { timeZone: city.timezone });
        return true;
      } catch {
        return false;
      }
    })()
  }));

  // Then
  assert.equal(timezoneValidations.length, expectedCityCount);
  for (const validation of timezoneValidations) {
    assert.equal(validation.isValid, expectedValidationResult, validation.name);
  }
});

// Vérifie qu'une recherche exacte renvoie la ville correspondante.
test("la recherche exacte renvoie la ville correspondante", () => {
  // Given
  const knownName = KNOWN_CITY_NAME;
  const expectedLongitude = EXPECTED_KNOWN_CITY_LONGITUDE;

  // When
  const knownCity = findCity(knownName);

  // Then
  assert.equal(knownCity.longitude, expectedLongitude);
});

// Vérifie qu'une ville inconnue ne renvoie aucun résultat.
test("une ville inconnue ne renvoie aucun résultat", () => {
  // Given
  const unknownName = UNKNOWN_CITY_NAME;
  const expectedCity = EXPECTED_UNKNOWN_CITY;

  // When
  const unknownCity = findCity(unknownName);

  // Then
  assert.equal(unknownCity, expectedCity);
});