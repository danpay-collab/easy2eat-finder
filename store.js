const KEY = "e2e_places_v1";

const firebaseConfig = {
  apiKey: "AIzaSyBvv5dDAMT-5rexTzTx6TwsYjfQnC9LrPM",
  authDomain: "easy2eat-pizzamap.firebaseapp.com",
  projectId: "easy2eat-pizzamap",
  storageBucket: "easy2eat-pizzamap.firebasestorage.app",
  messagingSenderId: "717161944352",
  appId: "1:717161944352:web:0ae6c052d6496ce71bb345",
  measurementId: "G-TXXPR45WFF",
};

let cache = null;
let fbDoc = null;

function localSeed() {
  return (window.E2E_SEED || []).map((p) => ({ ...p }));
}

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function writeLocal(list) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {}
}

function loadPlaces() {
  if (cache) return cache;
  const local = readLocal();
  if (local) {
    cache = local;
    return cache;
  }
  cache = localSeed();
  return cache;
}

function savePlaces(list) {
  writeLocal(list);
  if (fbDoc) {
    fbDoc.set({ items: list, updatedAt: Date.now() }).catch((err) => {
      console.warn("Firebase gem fejlede", err);
    });
  }
  return list;
}

async function initStore() {
  cache = readLocal() || localSeed();
  if (typeof firebase === "undefined" || !firebase.firestore) return cache;
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    fbDoc = db.collection("data").doc("places");
    let snap = null;
    try {
      snap = await Promise.race([
        fbDoc.get(),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 4000); })
      ]);
    } catch (e) {
      snap = null;
    }
    if (snap && snap.exists && Array.isArray(snap.data().items) && snap.data().items.length) {
      cache = snap.data().items;
      writeLocal(cache);
    } else if (cache && cache.length) {
      fbDoc.set({ items: cache, updatedAt: Date.now() }).catch(function () {});
    }
    fbDoc.onSnapshot(function (s) {
      if (!s.exists) return;
      const items = s.data().items;
      if (!Array.isArray(items) || !items.length) return;
      cache = items;
      writeLocal(cache);
      if (typeof render === "function") render();
      if (typeof drawTable === "function") drawTable();
      if (typeof drawDistricts === "function") drawDistricts();
    });
  } catch (err) {
    console.warn("Firebase startede ikke", err);
  }
  return cache;
}

function activePlaces() {
  return loadPlaces().filter((p) => p.active !== false);
}

function upsertPlace(place) {
  const list = loadPlaces().slice();
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
  const seed = localSeed();
  savePlaces(seed);
  return seed;
}

function guessRegion(p) {
  if (p.region) return p.region;
  const lat = Number(p.lat),
    lng = Number(p.lng);
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
