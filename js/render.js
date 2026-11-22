// Σχεδίαση των καρτελών.
import { sb } from "./supabase.js";
import { FEE } from "./config.js";
import { write } from "./data.js";
import { standings, payments, winnerPoints } from "./stats.js";
import { openMatch, openRound, openPlayer, togglePay } from "./dialogs.js";
import { S, $, esc, played, pname, fmtDate, playerIds, roundNums, matchCount, showNotice } from "./state.js";

const view = () => $("view");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function render() {
  if (!S.loaded) { view().innerHTML = '<div class="empty">Φόρτωση…</div>'; return; }
  if (S.tab === "vathmologia") return renderStandings();
  if (S.tab === "pliromes") return renderPayments();
  if (S.tab === "paiktes") return renderPlayers();
  renderMatches();
}

/* ---------- Αγώνες ---------- */
function payChip(m, side) {
  const paid = side === "a" ? m.pa : m.pb;
  const label = paid ? "✓ 2 €" : "2 € εκκρεμεί";
  return S.canEdit
    ? `<button class="pay ${paid ? "y" : "n"}" data-pay="${esc(m.id)}" data-side="${side}" title="Αλλαγή πληρωμής">${label}</button>`
    : `<span class="pay ${paid ? "y" : "n"}">${label}</span>`;
}

function matchRow(m) {
  const p = played(m), wa = p && m.sa > m.sb, wb = p && m.sb > m.sa;
  const cls = (won) => (p ? (won ? "win" : "lose") : "");
  const score = p ? `${m.sa} – ${m.sb}` : "εκκρεμεί";
  const bonus = p && winnerPoints(m) !== S.winPts ? `<span class="date">+${winnerPoints(m)} βαθμοί</span>` : "";
  return `<div class="match ${S.canEdit ? "editable" : ""}" data-id="${esc(m.id)}">
    <div class="pl"><span class="name ${cls(wa)}">${esc(pname(m.a))}</span>${payChip(m, "a")}</div>
    <div class="mid"><span class="score ${p ? "" : "pending"}">${score}</span>${bonus}${m.date ? `<span class="date">${fmtDate(m.date)}</span>` : ""}</div>
    <div class="pl r"><span class="name ${cls(wb)}">${esc(pname(m.b))}</span>${payChip(m, "b")}</div>
  </div>`;
}

function renderMatches() {
  const total = S.matches.length, done = S.matches.filter(played).length;
  const paidCount = S.matches.reduce((s, m) => s + (m.pa ? 1 : 0) + (m.pb ? 1 : 0), 0);
  const filters = [["all", "Όλοι"], ["done", "Παίχτηκαν"], ["todo", "Εκκρεμούν"]];

  let h = `<div class="stats">
      <div class="stat"><b>${done}/${total}</b><span>αγώνες παίχτηκαν</span></div>
      <div class="stat"><b>${total - done}</b><span>απομένουν</span></div>
      <div class="stat"><b>${paidCount * FEE} €</b><span>στο ταμείο</span></div>
    </div>
    <div class="filters">${filters.map(([k, l]) => `<button data-f="${k}" class="${S.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
  if (S.canEdit) h += `<div class="toolbar"><span class="note" style="margin:0;margin-right:auto">Πάτα σε αγώνα για σκορ, ημερομηνία και πληρωμές.</span><button class="btn" id="addMatch">+ Αγώνας</button></div>`;

  const byRound = {};
  S.matches.forEach((m) => (byRound[m.r] ||= []).push(m));
  let lastPhase = "";

  roundNums().forEach((r) => {
    let ms = (byRound[r] || []).sort((a, b) => (a.n || 0) - (b.n || 0));
    if (S.filter === "done") ms = ms.filter(played);
    if (S.filter === "todo") ms = ms.filter((m) => !played(m));
    if (!ms.length && !(S.canEdit && S.filter === "all")) return;

    const R = S.rounds[r] || {};
    const phase = r <= 7 ? "Α΄ Γύρος" : "Β΄ Γύρος";
    if (phase !== lastPhase) { h += `<div class="phase">${phase}</div>`; lastPhase = phase; }

    h += `<div class="round"><h2><span>${r}η Αγωνιστική</span><small>${esc(R.dates || "")}</small></h2>`;
    h += ms.map(matchRow).join("");
    if (R.bye || S.canEdit) {
      h += `<div class="bye"><span>${R.bye ? "Ρεπό: " + esc(pname(R.bye)) : ""}</span>${S.canEdit ? `<button class="link" data-round="${r}">Επεξεργασία αγωνιστικής</button>` : ""}</div>`;
    }
    h += `</div>`;
  });

  view().innerHTML = h;
  view().querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { S.filter = b.dataset.f; render(); }));
  if (!S.canEdit) return;
  view().querySelectorAll(".match").forEach((el) => (el.onclick = (e) => { if (!e.target.closest("[data-pay]")) openMatch(el.dataset.id); }));
  view().querySelectorAll("[data-pay]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); togglePay(b.dataset.pay, b.dataset.side, b); }));
  view().querySelectorAll("[data-round]").forEach((b) => (b.onclick = () => openRound(Number(b.dataset.round))));
  $("addMatch").onclick = () => openMatch(null);
}

/* ---------- Βαθμολογία ---------- */
function renderStandings() {
  const rows = standings();
  let h = "";
  if (S.canEdit) {
    h += `<div class="toolbar">
      <label class="inline">Νίκη <input id="wp" type="number" min="0" max="10" value="${S.winPts}"></label>
      <label class="inline">Νίκη με αντίπαλο στο 0 <input id="sp" type="number" min="0" max="10" value="${S.shutoutPts}"></label>
    </div>`;
  }
  h += `<table><thead><tr>
      <th></th><th class="n">Παίκτης</th><th title="Αγώνες">Αγ</th><th title="Νίκες">Ν</th><th title="Ήττες">Η</th>
      <th title="Νίκες με τον αντίπαλο στο 0">Λ</th><th title="Πόντοι υπέρ">+</th><th title="Πόντοι κατά">−</th><th title="Διαφορά">Δ</th><th title="Βαθμοί">Β</th>
    </tr></thead><tbody>`;
  rows.forEach((r, i) => {
    const d = r.pf - r.pa;
    h += `<tr class="${i === 0 && r.pl ? "first" : ""}">
      <td class="pos">${i + 1}</td><td class="n"><b>${esc(pname(r.p))}</b></td>
      <td>${r.pl}</td><td>${r.w}</td><td>${r.l}</td><td>${r.sh}</td><td>${r.pf}</td><td>${r.pa}</td>
      <td>${d > 0 ? "+" : ""}${d}</td><td class="pts">${r.pts}</td></tr>`;
  });
  h += `</tbody></table>
    <p class="note">Νίκη: ${plural(S.winPts, "βαθμός", "βαθμοί")}. Νίκη με τον αντίπαλο στο 0 (Λ): ${plural(S.shutoutPts, "βαθμός", "βαθμοί")}.
    Σε ισοβαθμία μετράει η διαφορά πόντων (Δ) και μετά οι πόντοι υπέρ (+).</p>`;
  view().innerHTML = h;

  if (!S.canEdit) return;
  const bind = (id, column, current) => ($(id).onchange = async (e) => {
    const v = Number(e.target.value);
    if (!Number.isInteger(v) || v < 0 || v > 10) { e.target.value = current; return; }
    try { await write(sb.from("settings").update({ [column]: v }).eq("id", 1)); }
    catch (x) { showNotice(x.message); }
  });
  bind("wp", "win_pts", S.winPts);
  bind("sp", "shutout_pts", S.shutoutPts);
}

/* ---------- Πληρωμές ---------- */
function renderPayments() {
  const rows = payments();
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const owed = rows.reduce((s, r) => s + r.owed, 0);
  let h = `<div class="stats">
      <div class="stat"><b>${paid * FEE} €</b><span>συγκεντρώθηκαν</span></div>
      <div class="stat"><b>${owed * FEE} €</b><span>οφειλές από αγώνες που παίχτηκαν</span></div>
      <div class="stat"><b>${S.matches.length * 2 * FEE} €</b><span>σύνολο πρωταθλήματος</span></div>
    </div>
    <table><thead><tr><th class="n">Παίκτης</th><th>Παίχτηκαν</th><th>Πλήρωσε</th><th>Χρωστάει</th></tr></thead><tbody>`;
  rows.forEach((r) => {
    const owes = r.owed ? `<span class="owe">${r.owed * FEE} €</span>` : `<span class="zero">—</span>`;
    h += `<tr><td class="n"><b>${esc(pname(r.p))}</b></td><td>${r.played}</td><td>${r.paid * FEE} €</td><td>${owes}</td></tr>`;
  });
  h += `</tbody></table><p class="note">«Χρωστάει» = αγώνες που έχουν παιχτεί χωρίς να έχει πληρωθεί η συμμετοχή. Προπληρωμές μετράνε στο «Πλήρωσε».</p>`;
  view().innerHTML = h;
}

/* ---------- Παίκτες ---------- */
function renderPlayers() {
  const ids = playerIds();
  let h = S.canEdit ? `<div class="toolbar"><button class="btn primary" id="addPlayer">+ Νέος παίκτης</button></div>` : "";
  h += ids.length
    ? `<div class="plist">${ids.map((id) => `<div class="prow">
        <span><b>${esc(pname(id))}</b> <small>· ${plural(matchCount(id), "αγώνας", "αγώνες")}</small></span>
        ${S.canEdit ? `<button class="link" data-player="${esc(id)}">Επεξεργασία</button>` : ""}
      </div>`).join("")}</div>`
    : `<div class="empty">Δεν υπάρχουν παίκτες.</div>`;
  if (S.canEdit) h += `<p class="note">Νέος παίκτης δεν μπαίνει αυτόματα στο πρόγραμμα: πρόσθεσε τους αγώνες του από την καρτέλα «Αγώνες». Παίκτης με αγώνες δεν διαγράφεται· σβήσε πρώτα τους αγώνες του ή άλλαξε τον αντίπαλο.</p>`;
  view().innerHTML = h;

  if (!S.canEdit) return;
  $("addPlayer").onclick = () => openPlayer(null);
  view().querySelectorAll("[data-player]").forEach((b) => (b.onclick = () => openPlayer(b.dataset.player)));
}
