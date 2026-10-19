export const cities = [
  { name: "Ajaccio", latitude: 41.9192, longitude: 8.7386, timezone: "Europe/Paris" },
  { name: "Aix-en-Provence", latitude: 43.5297, longitude: 5.4474, timezone: "Europe/Paris" },
  { name: "Amiens", latitude: 49.8941, longitude: 2.2958, timezone: "Europe/Paris" },
  { name: "Amsterdam", latitude: 52.3676, longitude: 4.9041, timezone: "Europe/Amsterdam" },
  { name: "Angers", latitude: 47.4784, longitude: -0.5632, timezone: "Europe/Paris" },
  { name: "Annecy", latitude: 45.8992, longitude: 6.1294, timezone: "Europe/Paris" },
  { name: "Berlin", latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin" },
  { name: "Bordeaux", latitude: 44.8378, longitude: -0.5792, timezone: "Europe/Paris" },
  { name: "Brest", latitude: 48.3904, longitude: -4.4861, timezone: "Europe/Paris" },
  { name: "Bruxelles", latitude: 50.8503, longitude: 4.3517, timezone: "Europe/Paris" },
  { name: "Clermont-Ferrand", latitude: 45.7772, longitude: 3.087, timezone: "Europe/Paris" },
  { name: "Dijon", latitude: 47.322, longitude: 5.0415, timezone: "Europe/Paris" },
  { name: "Genève", latitude: 46.2044, longitude: 6.1432, timezone: "Europe/Paris" },
  { name: "Grenoble", latitude: 45.1885, longitude: 5.7245, timezone: "Europe/Paris" },
  { name: "La Rochelle", latitude: 46.1603, longitude: -1.1511, timezone: "Europe/Paris" },
  { name: "Lille", latitude: 50.6292, longitude: 3.0573, timezone: "Europe/Paris" },
  { name: "Limoges", latitude: 45.8336, longitude: 1.2611, timezone: "Europe/Paris" },
  { name: "Lisbonne", latitude: 38.7223, longitude: -9.1393, timezone: "Europe/Lisbon" },
  { name: "Lyon", latitude: 45.764, longitude: 4.8357, timezone: "Europe/Paris" },
  { name: "Madrid", latitude: 40.4168, longitude: -3.7038, timezone: "Europe/Madrid" },
  { name: "Marseille", latitude: 43.2965, longitude: 5.3698, timezone: "Europe/Paris" },
  { name: "Metz", latitude: 49.1193, longitude: 6.1757, timezone: "Europe/Paris" },
  { name: "Milan", latitude: 45.4642, longitude: 9.19, timezone: "Europe/Rome" },
  { name: "Montpellier", latitude: 43.6108, longitude: 3.8767, timezone: "Europe/Paris" },
  { name: "Nancy", latitude: 48.6921, longitude: 6.1844, timezone: "Europe/Paris" },
  { name: "Nantes", latitude: 47.2184, longitude: -1.5536, timezone: "Europe/Paris" },
  { name: "Nice", latitude: 43.7102, longitude: 7.262, timezone: "Europe/Paris" },
  { name: "Oslo", latitude: 59.9139, longitude: 10.7522, timezone: "Europe/Oslo" },
  { name: "Paris", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { name: "Prague", latitude: 50.0755, longitude: 14.4378, timezone: "Europe/Prague" },
  { name: "Reims", latitude: 49.2583, longitude: 4.0317, timezone: "Europe/Paris" },
  { name: "Rennes", latitude: 48.1173, longitude: -1.6778, timezone: "Europe/Paris" },
  { name: "Rome", latitude: 41.9028, longitude: 12.4964, timezone: "Europe/Rome" },
  { name: "Rouen", latitude: 49.4431, longitude: 1.0993, timezone: "Europe/Paris" },
  { name: "Strasbourg", latitude: 48.5734, longitude: 7.7521, timezone: "Europe/Paris" },
  { name: "Stockholm", latitude: 59.3293, longitude: 18.0686, timezone: "Europe/Stockholm" },
  { name: "Toulouse", latitude: 43.6047, longitude: 1.4442, timezone: "Europe/Paris" },
  { name: "Londres", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  { name: "Vienne", latitude: 48.2082, longitude: 16.3738, timezone: "Europe/Vienna" },
  { name: "Varsovie", latitude: 52.2297, longitude: 21.0122, timezone: "Europe/Warsaw" },
  { name: "Zurich", latitude: 47.3769, longitude: 8.5417, timezone: "Europe/Zurich" },
  { name: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { name: "Los Angeles", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { name: "Tokyo", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { name: "Sydney", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" }
];

function normalizeText(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

export function searchCities(query) {
  const normalizedQuery = normalizeText(query.trim());
  return cities.filter((city) => normalizeText(city.name).includes(normalizedQuery)).slice(0, 8);
}

export function findCity(name) {
  return cities.find((city) => city.name === name) ?? null;
}