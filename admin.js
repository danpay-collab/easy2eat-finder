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
  document.getElementById("address").value = p.address || "";
  document.getElementById("city").value = p.city || "";
  document.getElementById("region").value = p.region || guessRegion(p) || "";
  document.getElementById("phone").value = p.phone || "";
  document.getElementById("website").value = p.website || "";
  document.getElementById("hoursOpen").value = p.hoursOpen || "15:00";
  document.getElementById("hoursClose").value = p.hoursClose || "21:00";
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
  document.getElementById("hoursOpen").value = "15:00";
  document.getElementById("hoursClose").value = "21:00";
}

function delPlace(id) {
  if (!confirm("Slet dette sted helt?")) return;
  removePlace(id);
  drawTable();
}

async function geocode(address) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(address + ", Danmark");
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

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const region = document.getElementById("region").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const hoursOpen = document.getElementById("hoursOpen").value || "15:00";
  const hoursClose = document.getElementById("hoursClose").value || "21:00";
  const editId = document.getElementById("editId").value;
  const status = document.getElementById("status");
  status.textContent = "Gemmer…";
  try {
    const existing = editId ? loadPlaces().find((x) => x.id === editId) : null;
    let lat = existing && existing.lat;
    let lng = existing && existing.lng;
    if (!existing || existing.address !== address) {
      const g = await geocode(address);
      lat = g.lat;
      lng = g.lng;
    }
    upsertPlace({
      ...(existing || {}),
      id: editId || uid(),
      name,
      address,
      city,
      region,
      phone,
      website,
      hoursOpen,
      hoursClose,
      delivery: existing ? !!existing.delivery : false,
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
drawTable();
