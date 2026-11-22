// Κοινή κατάσταση της εφαρμογής και μικρά βοηθητικά.

export const S = {
  // Όλα τα δεδομένα της βάσης
  tournaments: [],   // όλα τα τουρνουά, το νεότερο πρώτο
  players: {},       // όλοι οι παίκτες (κοινοί για όλα τα τουρνουά)
  allMatches: [],
  allRounds: [],

  // Το τουρνουά που βλέπουμε
  tid: null,
  matches: [],
  rounds: {},
  fee: 2,
  winPts: 1,        // βαθμοί για νίκη
  shutoutPts: 2,    // βαθμοί για νίκη με τον αντίπαλο στο 0
  legs: 2,
  roundsPerLeg: 7,

  loaded: false,
  canEdit: false,
  email: null,
  filter: "all",
  tab: "agones",
};

export const $ = (id) => document.getElementById(id);

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const played = (m) => Number.isFinite(m.sa) && Number.isFinite(m.sb);
export const pname = (id) => S.players[id]?.name || id || "—";
export const current = () => S.tournaments.find((t) => t.id === S.tid) || null;

export function fmtDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

const byName = (a, b) => pname(a).localeCompare(pname(b), "el");

/** Όλοι οι παίκτες (για επιλογή σε φόρμες). */
export const playerIds = () => Object.keys(S.players).sort(byName);

/** Οι παίκτες του τρέχοντος τουρνουά (όσοι έχουν αγώνα ή ρεπό σε αυτό). */
export function participantIds() {
  const ids = new Set();
  S.matches.forEach((m) => { ids.add(m.a); ids.add(m.b); });
  Object.values(S.rounds).forEach((r) => r.bye && ids.add(r.bye));
  return [...ids].filter((id) => S.players[id]).sort(byName);
}

export const roundNums = () =>
  [...new Set([...Object.keys(S.rounds).map(Number), ...S.matches.map((m) => m.r)])].sort((a, b) => a - b);

/** Αγώνες ενός παίκτη σε όλα τα τουρνουά (για τον έλεγχο διαγραφής). */
export const matchCount = (id) => S.allMatches.filter((m) => m.a === id || m.b === id).length;

export function showNotice(text) {
  const el = $("notice");
  el.textContent = text;
  el.hidden = !text;
}

/* Θυμάται ποιο τουρνουά είδε τελευταία φορά ο επισκέπτης (μόνο σε αυτή τη συσκευή). */
const KEY = "tavli-tournament";
export const savedTid = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const saveTid = (id) => { try { localStorage.setItem(KEY, id); } catch { /* χωρίς αποθήκευση */ } };
