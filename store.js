const KEY = "e2e_places_v1";

function loadPlaces() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const seed = (window.E2E_SEED || []).map((p) => ({ ...p }));
  savePlaces(seed);
  return seed;
}

function savePlaces(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function activePlaces() {
  return loadPlaces().filter((p) => p.active !== false);
}

function upsertPlace(place) {
  const list = loadPlaces();
  const i = list.findIndex((p) => p.id === place.id);
  if (i >= 0) list[i] = place;
  else list.push(place);
  savePlaces(list);
  return list;
}

function removePlace(id) {
  const list = loadPlaces().filter((p) => p.id !== id);
  savePlaces(list);
  return list;
}

function resetSeed() {
  localStorage.removeItem(KEY);
  return loadPlaces();
}

function guessRegion(p) {
  if (p.region) return p.region;
  const lat = Number(p.lat), lng = Number(p.lng);
  if (!lat || !lng) return "";
  if (lng > 14) return "Bornholm";
  if (lat < 55.05 && lng > 10.7 && lng < 12.45) return "Lolland-Falster";
  if (lng >= 10.95) {
    if (lat >= 55.78) return "Nordsjælland";
    return "Sjælland";
  }
  if (lng >= 9.65 && lng <= 10.95 && lat >= 55.0 && lat <= 55.62) return "Fyn";
  if (lat < 55.42 && lng < 9.95) return "Sønderjylland";
  if (lat >= 56.55) return "Nordjylland";
  return "Midtjylland";
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
