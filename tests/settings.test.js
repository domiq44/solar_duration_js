import assert from "node:assert/strict";
import test from "node:test";
import { clearSettings, loadSettings, saveSettings } from "../src/settings.js";

const LOCAL_STORAGE_PROPERTY = "localStorage";
const SETTINGS_STORAGE_KEY = "solar-duration-settings-v1";
const SAMPLE_SETTINGS = { date: "2026-10-18", latitude: "48.85" };
const STORAGE_ERROR_MESSAGE = "blocked";
const EXPECTED_OPERATION_SUCCESS = true;
const EXPECTED_OPERATION_FAILURE = false;
const EXPECTED_EMPTY_RESULT = null;

// Remplace temporairement le stockage global et le restaure après le test.
function installStorage(t, storage) {
  const original = Object.getOwnPropertyDescriptor(globalThis, LOCAL_STORAGE_PROPERTY);
  Object.defineProperty(globalThis, LOCAL_STORAGE_PROPERTY, { configurable: true, value: storage });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, LOCAL_STORAGE_PROPERTY, original);
    else delete globalThis[LOCAL_STORAGE_PROPERTY];
  });
}

// Prépare un stockage mémoire avec les valeurs initiales fournies.
function givenMemoryStorage(t, entries = []) {
  const values = new Map(entries);
  installStorage(t, {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  });
  return values;
}

// Vérifie que saveSettings sérialise les réglages dans le stockage local.
test("saveSettings sérialise les réglages dans le stockage local", (t) => {
  // Given
  const values = givenMemoryStorage(t);
  const settings = SAMPLE_SETTINGS;
  const expectedSaveResult = EXPECTED_OPERATION_SUCCESS;

  // When
  const saved = saveSettings(settings);
  const storedValue = values.get(SETTINGS_STORAGE_KEY);

  // Then
  assert.equal(saved, expectedSaveResult);
  assert.deepEqual(JSON.parse(storedValue), settings);
});

// Vérifie que loadSettings lit et analyse les réglages enregistrés.
test("loadSettings analyse les réglages enregistrés", (t) => {
  // Given
  const expectedSettings = SAMPLE_SETTINGS;
  givenMemoryStorage(t, [[SETTINGS_STORAGE_KEY, JSON.stringify(expectedSettings)]]);

  // When
  const loadedSettings = loadSettings();

  // Then
  assert.deepEqual(loadedSettings, expectedSettings);
});

// Vérifie que loadSettings renvoie null en l'absence de réglages.
test("loadSettings renvoie null en l'absence de réglages", (t) => {
  // Given
  givenMemoryStorage(t);
  const expectedSettings = EXPECTED_EMPTY_RESULT;

  // When
  const loaded = loadSettings();

  // Then
  assert.equal(loaded, expectedSettings);
});

// Vérifie que clearSettings supprime les réglages enregistrés.
test("clearSettings supprime les réglages enregistrés", (t) => {
  // Given
  const values = givenMemoryStorage(t, [[SETTINGS_STORAGE_KEY, "{}"]]);
  const expectedClearResult = EXPECTED_OPERATION_SUCCESS;
  const expectedKeyPresenceAfterClear = EXPECTED_OPERATION_FAILURE;

  // When
  const cleared = clearSettings();

  // Then
  assert.equal(cleared, expectedClearResult);
  assert.equal(values.has(SETTINGS_STORAGE_KEY), expectedKeyPresenceAfterClear);
});

// Vérifie que loadSettings ignore un JSON mal formé.
test("loadSettings ignore un JSON mal formé", (t) => {
  // Given
  givenMemoryStorage(t, [[SETTINGS_STORAGE_KEY, "{"]]);
  const expectedSettings = EXPECTED_EMPTY_RESULT;

  // When
  const loadedSettings = loadSettings();

  // Then
  assert.equal(loadedSettings, expectedSettings);
});

// Vérifie que loadSettings ignore une valeur qui n'est pas un objet.
test("loadSettings ignore une valeur enregistrée qui n'est pas un objet", (t) => {
  // Given
  givenMemoryStorage(t, [[SETTINGS_STORAGE_KEY, "false"]]);
  const expectedSettings = EXPECTED_EMPTY_RESULT;

  // When
  const loadedSettings = loadSettings();

  // Then
  assert.equal(loadedSettings, expectedSettings);
});

// Vérifie que loadSettings gère les erreurs de lecture du stockage.
test("loadSettings gère les erreurs de lecture du stockage", (t) => {
  // Given
  const expectedSettings = EXPECTED_EMPTY_RESULT;
  installStorage(t, { getItem() { throw new Error(STORAGE_ERROR_MESSAGE); } });

  // When
  const loaded = loadSettings();

  // Then
  assert.equal(loaded, expectedSettings);
});

// Vérifie que saveSettings gère les erreurs d'écriture du stockage.
test("saveSettings gère les erreurs d'écriture du stockage", (t) => {
  // Given
  const expectedSaveResult = EXPECTED_OPERATION_FAILURE;
  installStorage(t, { setItem() { throw new Error(STORAGE_ERROR_MESSAGE); } });

  // When
  const saved = saveSettings({});

  // Then
  assert.equal(saved, expectedSaveResult);
});

// Vérifie que clearSettings gère les erreurs de suppression du stockage.
test("clearSettings gère les erreurs de suppression du stockage", (t) => {
  // Given
  const expectedClearResult = EXPECTED_OPERATION_FAILURE;
  installStorage(t, { removeItem() { throw new Error(STORAGE_ERROR_MESSAGE); } });

  // When
  const cleared = clearSettings();

  // Then
  assert.equal(cleared, expectedClearResult);
});