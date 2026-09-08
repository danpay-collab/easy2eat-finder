let map, markersLayer, myMarker;
let myPos = null;
let currentDistrict = "Alle";

const DISTRICTS = [
  "Alle",
  "Nordjylland",
  "Midtjylland",
  "Sønderjylland",
  "Fyn",
  "Sjælland",
  "Nordsjælland",
  "Lolland-Falster",
];

const DEFAULT_HOURS = { open: "15:00", close: "21:00" };
const NEW_MS = 30 * 24 * 60 * 60 * 1000;

function isNewPlace(p) {
  const t0 = Number(p.createdAt);
  return t0 && Date.now() - t0 < NEW_MS;
}

function nowInDk() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const map = { Sun: "0", Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6" };
  return { hhmm: get("hour") + ":" + get("minute"), dayKey: map[get("weekday")] || "1" };
}

function todaySlot(p) {
  const { dayKey } = nowInDk();
  if (p.week && p.week[dayKey]) return p.week[dayKey];
  return {
    open: true,
    from: p.hoursOpen || DEFAULT_HOURS.open,
    to: p.hoursClose || DEFAULT_HOURS.close,
    delivery: !!p.delivery,
  };
}

function placeHours(p) {
  const d = todaySlot(p);
  if (!d.open) return { open: "–", close: "–", closedDay: true };
  return { open: d.from || DEFAULT_HOURS.open, close: d.to || DEFAULT_HOURS.close, closedDay: false };
}

function isOpenNow(p) {
  const d = todaySlot(p);
  if (!d.open) return false;
  const { hhmm } = nowInDk();
  const from = d.from || DEFAULT_HOURS.open;
  const to = d.to || DEFAULT_HOURS.close;
  if (from < to) return hhmm >= from && hhmm < to;
  return hhmm >= from || hhmm < to;
}

function usedDistricts() {
  const have = new Set(activePlaces().map((p) => guessRegion(p)).filter(Boolean));
  const list = DISTRICTS.filter((d) => d === "Alle" || have.has(d));
  if (currentDistrict !== "Alle" && !have.has(currentDistrict)) currentDistrict = "Alle";
  return list;
}

function drawDistricts() {
  const box = document.getElementById("districts");
  if (!box) return;
  box.innerHTML = usedDistricts()
    .map((d) => {
      const on = d === currentDistrict ? "on" : "";
      return `<button type="button" class="${on}" data-d="${d}">${d}</button>`;
    })
    .join("");
  box.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      currentDistrict = b.getAttribute("data-d");
      drawDistricts();
      render();
    };
  });
}

function initMap() {
  map = L.map("map").setView([56.26, 9.5], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  drawDistricts();
  render();
}

function render() {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const radius = Number(document.getElementById("radius").value);
  let list = activePlaces();
  list = list.map((p) => ({
    ...p,
    region: guessRegion(p),
    openNow: isOpenNow(p),
    hours: placeHours(p),
    canOrder: isOpenNow(p) || !!todaySlot(p).delivery,
  }));
  if (currentDistrict !== "Alle") {
    list = list.filter((p) => p.region === currentDistrict);
  }
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q) ||
        (p.region || "").toLowerCase().includes(q)
    );
  }
  if (myPos && radius > 0) {
    list = list
      .map((p) => ({
        ...p,
        km: haversineKm(myPos.lat, myPos.lng, p.lat, p.lng),
      }))
      .filter((p) => p.km <= radius)
      .sort((a, b) => a.km - b.km);
  }

  markersLayer.clearLayers();
  list.forEach((p) => {
    const color = p.openNow ? "#16a34a" : todaySlot(p).delivery ? "#f59e0b" : "#e11d48";
    const fresh = isNewPlace(p);
    const m = fresh
      ? L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="leaflet-ny"><span class="ny-badge">${t("ny")}</span><span class="dot" style="background:${color}"></span></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 18],
          }),
        }).addTo(markersLayer)
      : L.circleMarker([p.lat, p.lng], {
          radius: 8,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.95,
        }).addTo(markersLayer);
    const status = p.openNow ? t("nowOpen") : t("nowClosed");
    m.bindTooltip(`${p.name} · ${status}`, {
      direction: "top",
      offset: [0, -8],
      sticky: true,
    });
    m.bindPopup(popupHtml(p));
  });
  drawList(list);
}

function popupHtml(p) {
  const km = p.km != null ? `<div>${p.km.toFixed(1)} km</div>` : "";
  const tel = p.phone ? `<a href="tel:${p.phone}">${t("call")} ${p.phone}</a>` : "";
  const status = p.openNow ? t("nowOpen") : t("nowClosed");
  const ny = isNewPlace(p) ? ` <span class="ny-badge">${t("ny")}</span>` : "";
  return `<strong>${p.name}</strong>${ny}<br>${p.address}<br>
    ${t("hoursToday")} ${p.hours.open}–${p.hours.close} · ${status}<br>${km}${tel}<br>
    <a href="${p.website}" target="_blank" rel="noopener">${t("open")}</a>`;
}

function drawList(list) {
  const el = document.getElementById("list");
  if (!list.length) {
    el.innerHTML = `<p class="hint">${t("empty")}</p>`;
    return;
  }
  el.innerHTML = list
    .map((p) => {
      const km = p.km != null ? `<span class="badge">${p.km.toFixed(1)} km</span>` : "";
      const cls = p.openNow ? "open" : "closed";
      const btn = p.canOrder ? "open-btn" : "closed-btn";
      const delToday = !!todaySlot(p).delivery;
      const label = p.openNow ? t("orderOpen") : delToday ? t("preorder") : t("orderClosed");
      const status = p.openNow
        ? t("nowOpen")
        : delToday
        ? t("nowClosed") + " · " + t("preorder")
        : t("nowClosed");
      const line1 = p.street || p.address || "";
      const line2 = [p.zip, p.city].filter(Boolean).join(" ");
      return `<article class="card">
        <h3>${p.name} ${isNewPlace(p) ? `<span class="ny-badge">${t("ny")}</span>` : ""} ${km}</h3>
        <div class="meta">${line1}${line2 ? "<br>" + line2 : ""}</div>
        <div class="meta hours ${cls}">${t("hoursToday")} ${p.hours.open}–${p.hours.close} · ${status}</div>
        <div class="actions">
          <button class="${btn}" onclick="openSite('${p.website}')">${label}</button>
          ${p.phone ? `<button onclick="callNow('${p.phone}')">${t("call")}</button>` : ""}
          <button class="ghost" onclick="focusPlace(${p.lat}, ${p.lng})">${t("show")}</button>
        </div>
      </article>`;
    })
    .join("");
}

function openSite(url) {
  window.open(url, "_blank", "noopener");
}
function callNow(phone) {
  window.location.href = "tel:" + phone;
}
function focusPlace(lat, lng) {
  map.setView([lat, lng], 15);
}

function locateMe() {
  if (!navigator.geolocation) {
    alert("GPS findes ikke i denne browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (myMarker) map.removeLayer(myMarker);
      myMarker = L.circleMarker([myPos.lat, myPos.lng], {
        radius: 9,
        color: "#2563eb",
        weight: 3,
        fillColor: "#3b82f6",
        fillOpacity: 0.95,
      }).addTo(map);
      const region = guessRegion(myPos);
      if (region && DISTRICTS.includes(region)) {
        currentDistrict = region;
        drawDistricts();
      }
      const rad = document.getElementById("radius");
      if (rad && rad.value === "0") rad.value = "25";
      map.setView([myPos.lat, myPos.lng], 11);
      render();
    },
    () => alert("Kunne ikke hente position. Tillad placering i Safari/Chrome."),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  );
}

document.getElementById("q").addEventListener("input", render);
document.getElementById("radius").addEventListener("change", render);
document.getElementById("locate").addEventListener("click", locateMe);

initMap();
setInterval(render, 60000);

(function () {
  const list = document.getElementById("list");
  const app = document.getElementById("app");
  if (!list || !app) return;
  list.addEventListener(
    "scroll",
    () => {
      app.classList.toggle("collapsed", list.scrollTop > 24);
      if (window.map) setTimeout(() => map.invalidateSize(), 220);
    },
    { passive: true }
  );
})();

