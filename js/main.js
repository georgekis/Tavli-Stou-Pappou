// Εκκίνηση εφαρμογής.
import { S, showNotice } from "./state.js";
import { loadAll, onDataChange, subscribe } from "./data.js";
import { render } from "./render.js";
import { initDialogs } from "./dialogs.js";
import { initAuth } from "./auth.js";
import { initTournaments } from "./tournaments.js";

const TABS = ["agones", "vathmologia", "pliromes", "paiktes"];

function setTab(tab) {
  S.tab = TABS.includes(tab) ? tab : "agones";
  document.querySelectorAll("nav button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === S.tab));
  render();
}

function initTabs() {
  document.querySelectorAll("nav button").forEach((b) => (b.onclick = () => {
    history.replaceState(null, "", "#" + b.dataset.tab);
    setTab(b.dataset.tab);
  }));
  window.addEventListener("hashchange", () => setTab(location.hash.slice(1)));
  setTab(location.hash.slice(1));
}

onDataChange(render);
initDialogs();
initTournaments();
initAuth();
initTabs();

const slow = setTimeout(() => { if (!S.loaded) showNotice("Τα δεδομένα αργούν να φορτώσουν…"); }, 10000);
loadAll().then(() => clearTimeout(slow));
subscribe();
document.addEventListener("visibilitychange", () => { if (!document.hidden) loadAll(); });
