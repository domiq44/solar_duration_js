const SETTINGS_STORAGE_KEY = "solar-duration-settings-v1";

export function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY));
    return settings && typeof settings === "object" ? settings : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function clearSettings() {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}