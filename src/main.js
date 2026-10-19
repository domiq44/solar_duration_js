import { findCity } from "./cities.js";
import { createCityPicker } from "./city-picker.js";
import { drawSolarChart } from "./chart.js";
import { calculateSolarDay } from "./calculation.js";
import { dateStringInTimezone, formatClockTime, formatDuration } from "./formatting.js";
import {
  parseDate
} from "./solar.js";
import { clearSettings, loadSettings, saveSettings } from "./settings.js";

const elements = Object.fromEntries([
  "date-input", "today-button", "city-input", "city-suggestions", "latitude-input",
  "latitude-range", "longitude-input", "location-button", "model-select", "timezone-select",
  "threshold-input", "threshold-reset", "status-message", "result-date", "duration-value",
  "sunrise-value", "sunset-value", "declination-value", "model-chip", "latitude-display",
  "settings-reset", "solar-chart"
].map((id) => [id, document.getElementById(id)]));

const validationMessages = {
  date: "Choisissez une date comprise entre 1900 et 3000.",
  latitude: "La latitude doit être comprise entre −90° et 90°.",
  longitude: "La longitude doit être comprise entre −180° et 180°.",
  threshold: "Le seuil doit être compris entre −90° et 90°.",
  timezone: "Choisissez un fuseau horaire valide."
};

let chosenCityName = "";

function setStatus(message, error = false) {
  elements["status-message"].textContent = message;
  elements["status-message"].classList.toggle("error", error);
}

function ensureTimezoneOption(timezone) {
  const timezoneSelect = elements["timezone-select"];
  if ([...timezoneSelect.options].some((option) => option.value === timezone)) return true;
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return false;
  }
  const option = document.createElement("option");
  option.value = timezone;
  option.textContent = timezone;
  timezoneSelect.append(option);
  return true;
}

function timezoneLabel(timezone) {
  return timezone === "Europe/Paris" ? "CET/CEST" : timezone;
}

function persistSettings() {
  const settings = {
    date: elements["date-input"].value,
    city: chosenCityName,
    latitude: elements["latitude-input"].value,
    longitude: elements["longitude-input"].value,
    model: elements["model-select"].value,
    timezone: elements["timezone-select"].value,
    threshold: elements["threshold-input"].value
  };
  if (!saveSettings(settings)) {
    setStatus("Le navigateur ne permet pas de mémoriser les réglages.", true);
  }
}

function clearResults() {
  elements["result-date"].textContent = "";
  elements["duration-value"].textContent = "— h — min";
  elements["sunrise-value"].textContent = "—";
  elements["sunset-value"].textContent = "—";
  elements["declination-value"].textContent = "—";
  elements["model-chip"].textContent = "—";
  elements["latitude-display"].textContent = "";
  elements["solar-chart"].width = elements["solar-chart"].width;
  elements["solar-chart"].setAttribute("aria-label", "Graphique indisponible tant que les paramètres ne sont pas valides.");
}

function restoreSettings(cityPicker) {
  const settings = loadSettings();
  if (!settings) return;

  const savedDate = parseDate(settings.date);
  if (savedDate && savedDate.year >= 1900 && savedDate.year <= 3000) {
    elements["date-input"].value = settings.date;
  }
  if (Number.isFinite(Number(settings.latitude)) && Number(settings.latitude) >= -90 && Number(settings.latitude) <= 90) {
    elements["latitude-input"].value = String(settings.latitude);
    elements["latitude-range"].value = String(settings.latitude);
  }
  if (Number.isFinite(Number(settings.longitude)) && Number(settings.longitude) >= -180 && Number(settings.longitude) <= 180) {
    elements["longitude-input"].value = String(settings.longitude);
  }
  if (["meeus", "spencer", "sinusoidal"].includes(settings.model)) {
    elements["model-select"].value = settings.model;
  }
  if (typeof settings.timezone === "string" && ensureTimezoneOption(settings.timezone)) {
    elements["timezone-select"].value = settings.timezone;
  }
  if (Number.isFinite(Number(settings.threshold)) && Number(settings.threshold) >= -90 && Number(settings.threshold) <= 90) {
    elements["threshold-input"].value = String(settings.threshold);
  }
  const city = findCity(settings.city);
  if (city) {
    chosenCityName = city.name;
    cityPicker.setValue(city.name);
  }
}

function resetSettings(cityPicker) {
  const cleared = clearSettings();
  chosenCityName = "";
  cityPicker.clear();
  elements["latitude-input"].value = "47.2967";
  elements["latitude-range"].value = "47.3";
  elements["longitude-input"].value = "0";
  elements["model-select"].value = "meeus";
  elements["timezone-select"].value = "Europe/Paris";
  elements["date-input"].value = dateStringInTimezone(new Date(), elements["timezone-select"].value);
  elements["threshold-input"].value = "-0.833";
  update();
  if (!cleared) setStatus("Le navigateur ne permet pas de supprimer les réglages mémorisés.", true);
}

function update() {
  const result = calculateSolarDay({
    dateValue: elements["date-input"].value,
    latitudeValue: elements["latitude-input"].value,
    longitudeValue: elements["longitude-input"].value,
    thresholdValue: elements["threshold-input"].value,
    model: elements["model-select"].value,
    timezone: elements["timezone-select"].value
  });
  for (const id of ["date-input", "latitude-input", "longitude-input", "threshold-input", "timezone-select"]) {
    elements[id].removeAttribute("aria-invalid");
  }
  if (!result.valid) {
    clearResults();
    const invalidElementId = result.field === "timezone" ? "timezone-select" : `${result.field}-input`;
    elements[invalidElementId].setAttribute("aria-invalid", "true");
    setStatus(validationMessages[result.field], true);
    return;
  }

  const dateLabel = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(result.date.date);
  elements["result-date"].textContent = dateLabel;
  elements["duration-value"].textContent = formatDuration(result.duration);
  elements["declination-value"].textContent = `${result.declination >= 0 ? "+" : "−"}${Math.abs(result.declination).toFixed(2)}°`;
  elements["model-chip"].textContent = result.model === "meeus" ? "MEEUS" : result.model === "spencer" ? "SPENCER" : "SINUSOÏDAL";
  elements["latitude-display"].textContent = `${chosenCityName || "Position personnalisée"} · ${timezoneLabel(result.timezone)}`;
  elements["sunrise-value"].textContent = result.duration === 0 ? "Nuit polaire" : result.duration === 24 ? "Jour polaire" : formatClockTime(result.events.sunrise);
  elements["sunset-value"].textContent = result.duration === 0 ? "Nuit polaire" : result.duration === 24 ? "Jour polaire" : formatClockTime(result.events.sunset);
  setStatus("");
  persistSettings();
  drawSolarChart(elements["solar-chart"], result.latitude, result.declination, result.threshold);
}

function selectCity(city) {
  chosenCityName = city.name;
  elements["latitude-input"].value = city.latitude.toFixed(4);
  elements["latitude-range"].value = String(city.latitude);
  elements["longitude-input"].value = city.longitude.toFixed(4);
  ensureTimezoneOption(city.timezone);
  elements["timezone-select"].value = city.timezone;
  update();
}

function onCitySearchChange() {
  chosenCityName = "";
  update();
}

function switchToCustomLocation() {
  chosenCityName = "";
  cityPicker.clear();
}

const cityPicker = createCityPicker(elements["city-input"], elements["city-suggestions"], {
  onChange: onCitySearchChange,
  onSelect: selectCity
});

elements["date-input"].value = dateStringInTimezone(new Date(), elements["timezone-select"].value);
restoreSettings(cityPicker);
update();

elements["today-button"].addEventListener("click", () => {
  elements["date-input"].value = dateStringInTimezone(new Date(), elements["timezone-select"].value);
  update();
});
elements["date-input"].addEventListener("input", update);
elements["settings-reset"].addEventListener("click", () => resetSettings(cityPicker));
elements["model-select"].addEventListener("change", update);
elements["timezone-select"].addEventListener("change", update);
elements["threshold-input"].addEventListener("input", update);
elements["threshold-reset"].addEventListener("click", () => {
  elements["threshold-input"].value = "-0.833";
  update();
});
elements["latitude-input"].addEventListener("input", () => {
  switchToCustomLocation();
  const text = elements["latitude-input"].value.trim();
  const latitude = Number(text);
  if (text && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90) {
    elements["latitude-range"].value = String(latitude);
  }
  update();
});
elements["longitude-input"].addEventListener("input", () => {
  switchToCustomLocation();
  update();
});
elements["latitude-range"].addEventListener("input", () => {
  switchToCustomLocation();
  elements["latitude-input"].value = Number(elements["latitude-range"].value).toFixed(2);
  update();
});
elements["location-button"].addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("La géolocalisation n’est pas disponible dans ce navigateur.", true);
    return;
  }
  setStatus("Recherche de la position…");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      switchToCustomLocation();
      elements["latitude-input"].value = latitude.toFixed(4);
      elements["latitude-range"].value = String(Math.max(-90, Math.min(90, latitude)));
      elements["longitude-input"].value = position.coords.longitude.toFixed(4);
      const hasDeviceTimezone = ensureTimezoneOption(deviceTimezone);
      if (hasDeviceTimezone) elements["timezone-select"].value = deviceTimezone;
      update();
      setStatus(hasDeviceTimezone
        ? `Position obtenue. Fuseau de l’appareil : ${deviceTimezone}. Vérifiez qu’il correspond au lieu.`
        : "Position obtenue. Vérifiez le fuseau horaire sélectionné pour ce lieu.");
    },
    () => setStatus("Position indisponible. Saisissez la latitude ou réglez le curseur.", true),
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
});

new ResizeObserver(update).observe(elements["solar-chart"]);