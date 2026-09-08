const I18N = {
  da: {
    title: "Easy2Eat Finder",
    intro:
      "Find pizzerier der kører på Easy2Eat. Søg en by, eller brug din position. Tryk Åbn / bestil for at gå direkte til hjemmesiden.",
    search: "Søg by eller navn, f.eks. Aalborg",
    country: "Hele landet",
    locate: "Min position",
    addHome: "Læg på startskærm",
    iosHint: "iPhone: tryk Del og vælg Føj til hjemmeskærm.",
    admin: "Admin",
    open: "Åbn / bestil",
    orderOpen: "Bestil – åben",
    orderClosed: "Lukket",
    preorder: "Mulighed for forudbestilling",
    hoursToday: "I dag",
    nowOpen: "Åben",
    nowClosed: "Lukket",
    call: "Ring",
    show: "Vis på kort",
    empty: "Ingen steder matcher. Prøv et andet distrikt eller en anden by.",
    km: "km",
    ny: "NY",
  },
  en: {
    title: "Easy2Eat Finder",
    intro:
      "Find restaurants running on Easy2Eat. Search a town or use your location. Tap Open / order to go to the website.",
    search: "Search town or name, e.g. Aalborg",
    country: "All of Denmark",
    locate: "My location",
    addHome: "Add to home screen",
    iosHint: "iPhone: tap Share, then Add to Home Screen.",
    admin: "Admin",
    open: "Open / order",
    orderOpen: "Order – open",
    orderClosed: "Closed",
    preorder: "Pre-order available",
    hoursToday: "Today",
    nowOpen: "Open",
    nowClosed: "Closed",
    call: "Call",
    show: "Show on map",
    empty: "No places match. Try another area or town.",
    km: "km",
    ny: "NEW",
  },
  de: {
    title: "Easy2Eat Finder",
    intro:
      "Finde Restaurants, die Easy2Eat nutzen. Suche eine Stadt oder nutze deinen Standort. Öffnen / bestellen führt zur Website.",
    search: "Stadt oder Name suchen, z. B. Aalborg",
    country: "Ganz Dänemark",
    locate: "Mein Standort",
    addHome: "Zum Startbildschirm",
    iosHint: "iPhone: Teilen tippen, dann Zum Home-Bildschirm.",
    admin: "Admin",
    open: "Öffnen / bestellen",
    orderOpen: "Bestellen – geöffnet",
    orderClosed: "Geschlossen",
    preorder: "Vorbestellung möglich",
    hoursToday: "Heute",
    nowOpen: "Geöffnet",
    nowClosed: "Geschlossen",
    call: "Anrufen",
    show: "Auf Karte zeigen",
    empty: "Keine Treffer. Anderen Bereich oder andere Stadt versuchen.",
    km: "km",
    ny: "NEU",
  },
};

function currentLang() {
  return localStorage.getItem("e2e_lang") || "da";
}

function setLang(code) {
  localStorage.setItem("e2e_lang", code);
  applyLang();
  if (typeof render === "function") render();
}

function t(key) {
  const lang = currentLang();
  return (I18N[lang] && I18N[lang][key]) || I18N.da[key] || key;
}

function applyLang() {
  const lang = currentLang();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  const country = document.querySelector('#radius option[value="0"]');
  if (country) country.textContent = t("country");
  document.querySelectorAll(".lang-btn").forEach((b) => {
    b.classList.toggle("on", b.getAttribute("data-lang") === lang);
  });
  document.documentElement.lang = lang === "da" ? "da" : lang;
}
