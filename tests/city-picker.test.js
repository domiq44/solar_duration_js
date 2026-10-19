import assert from "node:assert/strict";
import test from "node:test";
import { createCityPicker } from "../src/city-picker.js";

const MAX_VISIBLE_CITY_SUGGESTIONS = 8;
const FIRST_CITY_SUGGESTION_INDEX = 0;
const CITY_OPTION_ID_PREFIX = "city-option-";
const PARIS_CITY_NAME = "Paris";
const LYON_CITY_NAME = "Lyon";
const UNKNOWN_CITY_QUERY = "not a city";
const ARIA_EXPANDED_VALUE = "aria-expanded";
const ARIA_ACTIVE_DESCENDANT = "aria-activedescendant";
const EXPECTED_EXPANDED_VALUE = "false";
const EXPECTED_SUGGESTIONS_HIDDEN = true;
const EXPECTED_EVENT_PREVENTED = true;
const EXPECTED_NO_SELECTED_CITY = null;

class FakeElement {
  // Initialise l'état d'un élément DOM simulé.
  constructor() {
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.hidden = false;
    this.value = "";
  }

  // Enregistre un gestionnaire pour un événement simulé.
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  // Déclenche les gestionnaires associés à un événement.
  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  // Définit un attribut sur l'élément simulé.
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  // Renvoie la valeur d'un attribut simulé.
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  // Supprime un attribut de l'élément simulé.
  removeAttribute(name) {
    this.attributes.delete(name);
  }

  // Supprime les enfants de l'élément simulé.
  replaceChildren() {
    this.children = [];
  }

  // Ajoute un enfant et conserve son parent simulé.
  append(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  // Recherche un parent correspondant au sélecteur de rôle demandé.
  closest(selector) {
    if (selector !== '[role="option"]') return null;
    for (let element = this; element; element = element.parentElement) {
      if (element.getAttribute("role") === "option") return element;
    }
    return null;
  }
}

// Prépare le sélecteur avec un document DOM et des éléments simulés.
function givenCityPicker(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => new FakeElement() }
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "document", original);
    else delete globalThis.document;
  });

  const input = new FakeElement();
  const list = new FakeElement();
  const state = { changeCount: 0, selectedCity: null };
  const picker = createCityPicker(input, list, {
    // Compte les changements du champ de recherche.
    onChange() { state.changeCount += 1; },
    // Mémorise la ville sélectionnée par le sélecteur.
    onSelect(city) { state.selectedCity = city; }
  });
  return { input, list, picker, state };
}

// Vérifie que la flèche bas active la première suggestion.
test("la flèche bas active la première suggestion", (t) => {
  // Given
  const { input } = givenCityPicker(t);
  const expectedActiveDescendant = `${CITY_OPTION_ID_PREFIX}${FIRST_CITY_SUGGESTION_INDEX}`;
  input.dispatch("focus");

  // When
  input.dispatch("keydown", { key: "ArrowDown", preventDefault() {} });
  const activeDescendant = input.getAttribute(ARIA_ACTIVE_DESCENDANT);

  // Then
  assert.equal(activeDescendant, expectedActiveDescendant);
});

// Vérifie qu'une nouvelle saisie retire la suggestion active précédente.
test("une nouvelle saisie retire la suggestion active précédente", (t) => {
  // Given
  const { input } = givenCityPicker(t);
  const expectedActiveDescendant = EXPECTED_NO_SELECTED_CITY;
  input.value = PARIS_CITY_NAME;
  input.dispatch("input");
  input.dispatch("keydown", { key: "ArrowDown", preventDefault() {} });

  // When
  input.value = LYON_CITY_NAME;
  input.dispatch("input");
  const activeDescendant = input.getAttribute(ARIA_ACTIVE_DESCENDANT);

  // Then
  assert.equal(activeDescendant, expectedActiveDescendant);
});

// Vérifie que la flèche bas revient à la première suggestion en fin de liste.
test("la flèche bas revient à la première suggestion en fin de liste", (t) => {
  // Given
  const { input } = givenCityPicker(t);
  input.dispatch("focus");
  const expectedActiveDescendant = `${CITY_OPTION_ID_PREFIX}${FIRST_CITY_SUGGESTION_INDEX}`;
  for (let index = 0; index < MAX_VISIBLE_CITY_SUGGESTIONS; index += 1) {
    input.dispatch("keydown", { key: "ArrowDown", preventDefault() {} });
  }

  // When
  input.dispatch("keydown", { key: "ArrowDown", preventDefault() {} });
  const activeDescendant = input.getAttribute(ARIA_ACTIVE_DESCENDANT);

  // Then
  assert.equal(activeDescendant, expectedActiveDescendant);
});

// Vérifie que la flèche haut revient à la dernière suggestion en début de liste.
test("la flèche haut revient à la dernière suggestion en début de liste", (t) => {
  // Given
  const { input } = givenCityPicker(t);
  input.dispatch("focus");
  input.dispatch("keydown", { key: "ArrowDown", preventDefault() {} });
  const expectedActiveDescendant = `${CITY_OPTION_ID_PREFIX}${MAX_VISIBLE_CITY_SUGGESTIONS - 1}`;

  // When
  input.dispatch("keydown", { key: "ArrowUp", preventDefault() {} });
  const activeDescendant = input.getAttribute(ARIA_ACTIVE_DESCENDANT);

  // Then
  assert.equal(activeDescendant, expectedActiveDescendant);
});

// Vérifie que la flèche haut sans sélection active la dernière suggestion.
test("la flèche haut sans sélection active la dernière suggestion", (t) => {
  // Given
  const { input } = givenCityPicker(t);
  const lastCitySuggestionIndex = MAX_VISIBLE_CITY_SUGGESTIONS - 1;
  const expectedActiveDescendant = `${CITY_OPTION_ID_PREFIX}${lastCitySuggestionIndex}`;
  input.dispatch("focus");

  // When
  input.dispatch("keydown", { key: "ArrowUp", preventDefault() {} });
  const activeDescendant = input.getAttribute(ARIA_ACTIVE_DESCENDANT);

  // Then
  assert.equal(activeDescendant, expectedActiveDescendant);
});

// Vérifie que la touche Entrée sélectionne la suggestion active.
test("la touche Entrée sélectionne la suggestion active", (t) => {
  // Given
  const { input, list, state } = givenCityPicker(t);
  const expectedCityName = PARIS_CITY_NAME;
  const expectedPreventedResult = EXPECTED_EVENT_PREVENTED;
  const expectedSuggestionsHidden = EXPECTED_SUGGESTIONS_HIDDEN;
  input.value = expectedCityName;
  input.dispatch("input");
  input.dispatch("keydown", { key: "ArrowDown", preventDefault() {} });

  // When
  let wasDefaultPrevented = !expectedPreventedResult;
  input.dispatch("keydown", { key: "Enter", preventDefault() { wasDefaultPrevented = expectedPreventedResult; } });

  // Then
  assert.equal(wasDefaultPrevented, expectedPreventedResult);
  assert.equal(state.selectedCity.name, expectedCityName);
  assert.equal(input.value, expectedCityName);
  assert.equal(list.hidden, expectedSuggestionsHidden);
});

// Vérifie que la touche Entrée sélectionne la première suggestion par défaut.
test("la touche Entrée sélectionne la première suggestion par défaut", (t) => {
  // Given
  const { input, state } = givenCityPicker(t);
  const expectedCityName = PARIS_CITY_NAME;
  input.value = expectedCityName;
  input.dispatch("input");

  // When
  input.dispatch("keydown", { key: "Enter", preventDefault() {} });

  // Then
  assert.equal(state.selectedCity.name, expectedCityName);
});

// Vérifie que la touche Échap ferme la liste des suggestions.
test("la touche Échap ferme la liste des suggestions", (t) => {
  // Given
  const { input, list } = givenCityPicker(t);
  const expectedSuggestionsHidden = EXPECTED_SUGGESTIONS_HIDDEN;
  const expectedExpandedValue = EXPECTED_EXPANDED_VALUE;
  const expectedActiveDescendant = EXPECTED_NO_SELECTED_CITY;
  input.dispatch("focus");
  input.dispatch("keydown", { key: "ArrowDown", preventDefault() {} });

  // When
  input.dispatch("keydown", { key: "Escape" });

  // Then
  assert.equal(list.hidden, expectedSuggestionsHidden);
  assert.equal(input.getAttribute(ARIA_EXPANDED_VALUE), expectedExpandedValue);
  assert.equal(input.getAttribute(ARIA_ACTIVE_DESCENDANT), expectedActiveDescendant);
});

// Vérifie que la méthode close masque la liste des suggestions.
test("la méthode close masque les suggestions", (t) => {
  // Given
  const { input, list, picker } = givenCityPicker(t);
  const expectedSuggestionsHidden = EXPECTED_SUGGESTIONS_HIDDEN;
  const expectedExpandedValue = EXPECTED_EXPANDED_VALUE;
  input.dispatch("focus");

  // When
  picker.close();

  // Then
  assert.equal(list.hidden, expectedSuggestionsHidden);
  assert.equal(input.getAttribute(ARIA_EXPANDED_VALUE), expectedExpandedValue);
});

// Vérifie qu'un appui sur une suggestion conserve le focus dans le champ.
test("un appui sur une suggestion conserve le focus dans le champ", (t) => {
  // Given
  const { list } = givenCityPicker(t);
  const expectedPreventedResult = EXPECTED_EVENT_PREVENTED;
  let wasDefaultPrevented = !expectedPreventedResult;

  // When
  list.dispatch("pointerdown", { preventDefault() { wasDefaultPrevented = expectedPreventedResult; } });

  // Then
  assert.equal(wasDefaultPrevented, expectedPreventedResult);
});

// Vérifie qu'un clic sélectionne la ville correspondante.
test("un clic sélectionne la ville correspondante", (t) => {
  // Given
  const { input, list, state } = givenCityPicker(t);
  const expectedCityName = LYON_CITY_NAME;
  const expectedSuggestionsHidden = EXPECTED_SUGGESTIONS_HIDDEN;
  input.value = expectedCityName;
  input.dispatch("input");

  // When
  list.dispatch("click", { target: list.children[0] });

  // Then
  assert.equal(state.selectedCity.name, expectedCityName);
  assert.equal(input.value, expectedCityName);
  assert.equal(list.hidden, expectedSuggestionsHidden);
});

// Vérifie qu'une recherche inconnue ne propose aucune ville.
test("une recherche inconnue ne propose aucune ville sélectionnable", (t) => {
  // Given
  const { input, list, state } = givenCityPicker(t);
  const query = UNKNOWN_CITY_QUERY;
  const expectedSuggestionsHidden = EXPECTED_SUGGESTIONS_HIDDEN;
  const expectedSelectedCity = EXPECTED_NO_SELECTED_CITY;
  input.value = query;

  // When
  input.dispatch("input");
  input.dispatch("keydown", { key: "Enter", preventDefault() {} });

  // Then
  assert.equal(list.hidden, expectedSuggestionsHidden);
  assert.equal(state.selectedCity, expectedSelectedCity);
});

// Vérifie que setValue renseigne le champ et ferme la liste.
test("setValue renseigne le champ et ferme la liste", (t) => {
  // Given
  const { input, list, picker } = givenCityPicker(t);
  const expectedCityName = PARIS_CITY_NAME;
  const expectedSuggestionsHidden = EXPECTED_SUGGESTIONS_HIDDEN;
  const expectedExpandedValue = EXPECTED_EXPANDED_VALUE;
  input.dispatch("focus");

  // When
  picker.setValue(expectedCityName);

  // Then
  assert.equal(input.value, expectedCityName);
  assert.equal(list.hidden, expectedSuggestionsHidden);
  assert.equal(input.getAttribute(ARIA_EXPANDED_VALUE), expectedExpandedValue);
});

// Vérifie que clear vide le champ et ferme la liste.
test("clear vide le champ et ferme la liste", (t) => {
  // Given
  const { input, list, picker } = givenCityPicker(t);
  const initialCityName = PARIS_CITY_NAME;
  const expectedClearedValue = "";
  const expectedSuggestionsHidden = EXPECTED_SUGGESTIONS_HIDDEN;
  const expectedExpandedValue = EXPECTED_EXPANDED_VALUE;
  input.value = initialCityName;
  input.dispatch("focus");

  // When
  picker.clear();

  // Then
  assert.equal(input.value, expectedClearedValue);
  assert.equal(list.hidden, expectedSuggestionsHidden);
  assert.equal(input.getAttribute(ARIA_EXPANDED_VALUE), expectedExpandedValue);
});