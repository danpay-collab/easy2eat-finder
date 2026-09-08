const DISTRICTS = [
  "Alle",
  "Nordjylland",
  "Midtjylland",
  "Sønderjylland",
  "Fyn",
  "Sjælland",
  "Nordsjælland",
  "Lolland-Falster",
  "Bornholm",
];

let currentDistrict = "Alle";

const WEEKDAYS = [
  { k: "1", n: "Man" },
  { k: "2", n: "Tir" },
  { k: "3", n: "Ons" },
  { k: "4", n: "Tor" },
  { k: "5", n: "Fre" },
  { k: "6", n: "Lør" },
  { k: "0", n: "Søn" },
];

function defaultWeek() {
  const w = {};
  WEEKDAYS.forEach(({ k }) => {
    w[k] = { open: true, from: "15:00", to: "21:00", delivery: false, dfrom: "16:00", dto: "21:00" };
  });
  return w;
}

function drawWeek(week) {
  const w = week || defaultWeek();
  const el = document.getElementById("weekHours");
  if (!el) return;
  el.innerHTML =
    `<table><thead><tr><th></th><th>Åben</th><th>Fra</th><th>Til</th><th>Udbr.</th><th>Fra</th><th>Til</th></tr></thead><tbody>` +
    WEEKDAYS.map(({ k, n }) => {
      const d = w[k] || defaultWeek()[k];
      return `<tr>
        <td>${n}</td>
        <td><input type="checkbox" data-w="${k}" data-f="open" ${d.open ? "checked" : ""}></td>
        <td><input type="time" data-w="${k}" data-f="from" value="${d.from || "15:00"}"></td>
        <td><input type="time" data-w="${k}" data-f="to" value="${d.to || "21:00"}"></td>
        <td><input type="checkbox" data-w="${k}" data-f="delivery" ${d.delivery ? "checked" : ""}></td>
        <td><input type="time" data-w="${k}" data-f="dfrom" value="${d.dfrom || "16:00"}"></td>
        <td><input type="time" data-w="${k}" data-f="dto" value="${d.dto || "21:00"}"></td>
      </tr>`;
    }).join("") +
    `</tbody></table>`;
}

function readWeek() {
  const w = defaultWeek();
  document.querySelectorAll("#weekHours [data-w]").forEach((inp) => {
    const k = inp.getAttribute("data-w");
    const f = inp.getAttribute("data-f");
    if (inp.type === "checkbox") w[k][f] = inp.checked;
    else w[k][f] = inp.value;
  });
  return w;
}

function uid() {
  return "p-" + Math.random().toString(36).slice(2, 9);
}

function filtered() {
  const q = (document.getElementById("q").value || "").trim().toLowerCase();
  return loadPlaces().filter((p) => {
    const region = guessRegion(p);
    if (currentDistrict !== "Alle" && region !== currentDistrict) return false;
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.city || "").toLowerCase().includes(q) ||
      (p.address || "").toLowerCase().includes(q) ||
      region.toLowerCase().includes(q)
    );
  });
}

function drawDistricts() {
  const box = document.getElementById("districts");
  box.innerHTML = DISTRICTS.map((d) => {
    const on = d === currentDistrict ? "on" : "";
    return `<button type="button" class="${on}" data-d="${d}">${d}</button>`;
  }).join("");
  box.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      currentDistrict = b.getAttribute("data-d");
      drawDistricts();
      drawTable();
    };
  });
}

function drawTable() {
  const list = filtered();
  document.getElementById("count").textContent =
    list.length + " steder" + (currentDistrict !== "Alle" ? " i " + currentDistrict : "");
  document.getElementById("rows").innerHTML = list
    .map((p) => {
      const region = guessRegion(p);
      return `<tr>
      <td><strong>${p.name}</strong><div class="meta">${p.address}</div></td>
      <td>${region || "–"}</td>
      <td>${p.active === false ? "skjult" : "aktiv"}</td>
      <td>
        <button onclick="editPlace('${p.id}')">Rediger</button>
        <button onclick="toggleActive('${p.id}')">${p.active === false ? "Aktivér" : "Skjul"}</button>
        <button onclick="delPlace('${p.id}')">Slet</button>
      </td>
    </tr>`;
    })
    .join("");
}

function toggleActive(id) {
  const list = loadPlaces();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  p.active = p.active === false;
  savePlaces(list);
  drawTable();
}

function editPlace(id) {
  const p = loadPlaces().find((x) => x.id === id);
  if (!p) return;
  document.getElementById("editId").value = p.id;
  document.getElementById("name").value = p.name || "";
  let street = p.street || "";
  let zip = p.zip || "";
  let city = p.city || "";
  if (!zip || !street) {
    const a = p.address || "";
    const m = a.match(/^(.*?),\s*(\d{4})\s+(.+)$/) || a.match(/^(.*?)\s+(\d{4})\s+(.+)$/);
    if (m) {
      street = street || m[1].trim();
      zip = zip || m[2];
      city = city || m[3].trim();
    }
  }
  document.getElementById("address").value = street;
  document.getElementById("zip").value = zip;
  document.getElementById("city").value = city;
  document.getElementById("region").value = p.region || guessRegion(p) || "";
  document.getElementById("phone").value = p.phone || "";
  document.getElementById("website").value = p.website || "";
  let week = p.week;
  if (!week) {
    week = defaultWeek();
    const ho = p.hoursOpen || "15:00";
    const hc = p.hoursClose || "21:00";
    Object.keys(week).forEach((k) => {
      week[k].from = ho;
      week[k].to = hc;
      week[k].delivery = !!p.delivery;
      if (p.delivery) {
        week[k].dfrom = ho;
        week[k].dto = hc;
      }
    });
  }
  drawWeek(week);
  const stillNew = p.createdAt && Date.now() - Number(p.createdAt) < 30 * 24 * 60 * 60 * 1000;
  document.getElementById("markNew").checked = !!stillNew;
  document.getElementById("saveBtn").textContent = "Gem ændringer";
  document.getElementById("cancelEdit").style.display = "";
  document.getElementById("status").textContent = "Retter: " + p.name;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearEdit() {
  document.getElementById("editId").value = "";
  document.getElementById("saveBtn").textContent = "Gem nyt sted";
  document.getElementById("cancelEdit").style.display = "none";
  document.getElementById("form").reset();
  document.getElementById("markNew").checked = true;
  drawWeek();
}

function delPlace(id) {
  if (!confirm("Slet dette sted helt?")) return;
  removePlace(id);
  drawTable();
}

async function geocode(address) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(address + ", Danmark"); // patched below
  const res = await fetch(url, { headers: { "Accept-Language": "da" } });
  const data = await res.json();
  if (!data[0]) throw new Error("Adresse ikke fundet");
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseWorkbook(wb) {
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "kunder") || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return raw.map((r) => {
    const o = {};
    Object.keys(r).forEach((k) => {
      o[String(k).trim().toLowerCase()] = String(r[k] ?? "").trim();
    });
    return o;
  });
}

async function loadHtml(url) {
  const tries = [
    url,
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(url),
    "https://corsproxy.io/?" + encodeURIComponent(url),
  ];
  for (const u of tries) {
    try {
      const res = await fetch(u);
      if (res.ok) {
        const html = await res.text();
        if (html && html.length > 200) return html;
      }
    } catch (err) {}
  }
  throw new Error("kunne ikke hente");
}

function parseServiceInfo(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body ? doc.body.innerText : html;
  const phoneM = text.match(/tlf\.?\s*:?\s*([0-9][0-9 \/]{7,20})/i);
  const phone = phoneM ? phoneM[1].replace(/[^\d]/g, "").slice(0, 8) : "";
  const addrM = text.match(/([A-ZÆØÅ][A-Za-zÆØÅæøå.\- ]+\s+\d+[A-Za-z]?)\s+(\d{4})\s+([A-ZÆØÅa-zæøå.\- ]{2,30})/);
  const street = addrM ? addrM[1].trim() : "";
  const zip = addrM ? addrM[2] : "";
  const city = addrM ? addrM[3].trim() : "";
  const week = defaultWeek();
  const dayNames = {
    mandag: "1",
    tirsdag: "2",
    onsdag: "3",
    torsdag: "4",
    fredag: "5",
    lørdag: "6",
    søndag: "0",
  };
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  let section = "";
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase();
    if (low.includes("åbningstid")) section = "open";
    if (low.includes("udbringningstid") || low === "udbringning") section = "del";
    const day = Object.keys(dayNames).find((d) => low === d || low.startsWith(d + " "));
    if (!day) continue;
    const nxt = (lines[i + 1] || "") + " " + lines[i];
    const k = dayNames[day];
    if (/lukket/i.test(nxt) && !/\d{1,2}:\d{2}/.test(nxt)) {
      if (section === "del") week[k].delivery = false;
      else week[k].open = false;
      continue;
    }
    const times = nxt.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (!times) continue;
    const a = times[1].padStart(5, "0");
    const b = times[2].padStart(5, "0");
    if (section === "del") {
      week[k].delivery = true;
      week[k].dfrom = a;
      week[k].dto = b;
    } else {
      week[k].open = true;
      week[k].from = a;
      week[k].to = b;
    }
  }
  if (!/udbringningstid/i.test(text)) {
    Object.values(week).forEach((d) => (d.delivery = false));
  }
  return { phone, street, zip, city, week, hasDel: /udbringningstid/i.test(text) };
}

document.getElementById("fetchInfo").addEventListener("click", async () => {
  const website = document.getElementById("website").value.trim();
  const status = document.getElementById("status");
  if (!website) {
    status.textContent = "Skriv hjemmesiden først.";
    return;
  }
  status.textContent = "Henter infosiden…";
  try {
    const base = website.replace(/\/$/, "");
    let html = "";
    try {
      html = await loadHtml(base + "/restaurant-service-info");
    } catch (err) {
      html = await loadHtml(base);
    }
    const info = parseServiceInfo(html);
    if (info.street) document.getElementById("address").value = info.street;
    if (info.zip) document.getElementById("zip").value = info.zip;
    if (info.city) document.getElementById("city").value = info.city;
    if (info.phone) document.getElementById("phone").value = info.phone;
    drawWeek(info.week);
    status.textContent = info.hasDel
      ? "Hentet. Der er udbringning – tjek tiderne og gem."
      : "Hentet. Ingen udbringning fundet – tjek tiderne og gem.";
  } catch (err) {
    status.textContent = "Kunne ikke læse siden (blokering eller lukket side). Udfyld selv.";
  }
});

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const street = document.getElementById("address").value.trim();
  const zip = document.getElementById("zip").value.trim();
  const city = document.getElementById("city").value.trim();
  const address = street + ", " + zip + " " + city;
  const region = document.getElementById("region").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const week = readWeek();
  const anyDel = Object.values(week).some((d) => d.delivery);
  const editId = document.getElementById("editId").value;
  const status = document.getElementById("status");
  status.textContent = "Gemmer…";
  try {
    const existing = editId ? loadPlaces().find((x) => x.id === editId) : null;
    let lat = existing && existing.lat;
    let lng = existing && existing.lng;
    if (!existing || existing.address !== address) {
      const g = await geocode(street + " " + zip + " " + city);
      lat = g.lat;
      lng = g.lng;
    }
    upsertPlace({
      ...(existing || {}),
      id: editId || uid(),
      name,
      street,
      zip,
      address,
      city,
      region,
      phone,
      website,
      week,
      delivery: anyDel,
      createdAt: document.getElementById("markNew").checked
        ? existing && existing.createdAt && Date.now() - Number(existing.createdAt) < 30 * 24 * 60 * 60 * 1000
          ? existing.createdAt
          : Date.now()
        : undefined,
      lat,
      lng,
      active: existing ? existing.active !== false : true,
    });
    status.textContent = "Gemt.";
    clearEdit();
    drawTable();
  } catch (err) {
    status.textContent = "Kunne ikke finde adressen. Tjek stavning.";
  }
});

document.getElementById("cancelEdit").addEventListener("click", () => {
  clearEdit();
  document.getElementById("status").textContent = "";
});

document.getElementById("xlsx").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const status = document.getElementById("csvStatus");
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) {
    status.textContent = "Kun Excel-filer (.xlsx).";
    e.target.value = "";
    return;
  }
  if (typeof XLSX === "undefined") {
    status.textContent = "Excel-læseren mangler (xlsx.full.min.js).";
    return;
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const rows = parseWorkbook(wb);
  if (!rows.length) {
    status.textContent = "Tom fil eller mangler overskrift.";
    return;
  }
  status.textContent = "Importerer " + rows.length + " rækker…";
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    const name = r.navn || r.name || "";
    const address = r.adresse || r.address || "";
    const city = r.by || r.city || "";
    const website = r.hjemmeside || r.website || r.url || "";
    if (!name || !address || /^skriv nyt navn/i.test(name)) {
      fail++;
      continue;
    }
    let lat = Number(r.lat || r.latitude || 0);
    let lng = Number(r.lng || r.lon || r.longitude || 0);
    if (!lat || !lng) {
      try {
        const g = await geocode(address);
        lat = g.lat;
        lng = g.lng;
        await sleep(1100);
      } catch (err) {
        fail++;
        continue;
      }
    }
    upsertPlace({
      id: uid(),
      name,
      address,
      city,
      region: r.region || r.distrikt || "",
      phone: r.telefon || r.phone || "",
      website,
      lat,
      lng,
      createdAt: Date.now(),
      active: true,
    });
    ok++;
    status.textContent = "Importeret " + ok + " / " + rows.length + "…";
  }
  status.textContent = "Færdig. Tilføjet " + ok + ". Sprunget over " + fail + ".";
  e.target.value = "";
  drawTable();
});

document.getElementById("reset").addEventListener("click", () => {
  if (!confirm("Nulstil til startlisten?")) return;
  resetSeed();
  drawTable();
});

document.getElementById("q").addEventListener("input", drawTable);

drawDistricts();
drawWeek();
drawTable();
