// Κοινή κατάσταση της εφαρμογής και μικρά βοηθητικά.

export const S = {
  matches: [],
  rounds: {},
  players: {},
  winPts: 1,       // βαθμοί για νίκη
  shutoutPts: 2,   // βαθμοί για νίκη με τον αντίπαλο στο 0
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

export function fmtDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export const playerIds = () =>
  Object.keys(S.players).sort((a, b) => pname(a).localeCompare(pname(b), "el"));

export const roundNums = () =>
  [...new Set([...Object.keys(S.rounds).map(Number), ...S.matches.map((m) => m.r)])].sort((a, b) => a - b);

export const matchCount = (id) => S.matches.filter((m) => m.a === id || m.b === id).length;

export function showNotice(text) {
  const el = $("notice");
  el.textContent = text;
  el.hidden = !text;
}
