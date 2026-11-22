// Τουρνουά: επιλογή, δημιουργία, ρυθμίσεις.
import { sb } from "./supabase.js";
import { write, selectTournament, loadAll } from "./data.js";
import { roundRobin } from "./schedule.js";
import { S, $, esc, played, pname, playerIds, participantIds, current } from "./state.js";

/* ---------- Μπάρα επιλογής στην κεφαλίδα ---------- */
export function renderTournamentBar() {
  const t = current();
  $("subtitle").textContent = t
    ? `${t.name} · ${t.fee} € συμμετοχή ανά παίκτη σε κάθε αγώνα`
    : "Δεν υπάρχει ακόμα τουρνουά";

  const bar = $("tbar");
  const select = S.tournaments.length > 1
    ? `<select id="tSel" aria-label="Τουρνουά">${S.tournaments.map((x) =>
        `<option value="${esc(x.id)}" ${x.id === S.tid ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`
    : "";
  const admin = S.canEdit
    ? `<button id="tNew">+ Νέο τουρνουά</button>${t ? `<button id="tEdit">Ρυθμίσεις τουρνουά</button>` : ""}`
    : "";
  bar.innerHTML = select + admin;
  bar.hidden = !select && !admin;

  if (select) $("tSel").onchange = (e) => selectTournament(e.target.value);
  if (S.canEdit) {
    $("tNew").onclick = openNewTournament;
    if (t) $("tEdit").onclick = openEditTournament;
  }
}

/* ---------- Νέο τουρνουά ---------- */
function selectedPlayers() {
  return [...document.querySelectorAll("#ntPlayers input:checked")].map((i) => i.value);
}

function updateSummary() {
  const n = selectedPlayers().length;
  const legs = Number($("ntLegs").value);
  if (n < 2) { $("ntSummary").textContent = "Διάλεξε τουλάχιστον 2 παίκτες."; return; }
  const per = n % 2 ? n : n - 1;
  const matches = (n * (n - 1) / 2) * legs;
  const bye = n % 2 ? " Με μονό αριθμό παικτών, σε κάθε αγωνιστική ένας έχει ρεπό." : "";
  $("ntSummary").textContent = `${n} παίκτες → ${per * legs} αγωνιστικές, ${matches} αγώνες.${bye} Οι αντίπαλοι κάθε αγωνιστικής βγαίνουν με κλήρωση.`;
}

function openNewTournament() {
  const pre = new Set(participantIds()); // προεπιλογή: οι παίκτες του τρέχοντος τουρνουά
  $("ntName").value = "";
  $("ntErr").textContent = "";
  $("ntPlayers").innerHTML = playerIds().map((id) =>
    `<label><input type="checkbox" value="${esc(id)}" ${pre.has(id) || !pre.size ? "checked" : ""}>${esc(pname(id))}</label>`).join("")
    || `<span class="note">Δεν υπάρχουν παίκτες. Πρόσθεσέ τους πρώτα από την καρτέλα «Παίκτες».</span>`;
  $("ntPlayers").onchange = updateSummary;
  $("ntLegs").onchange = updateSummary;
  updateSummary();
  $("dNewT").showModal();
}

async function createTournament(e) {
  e.preventDefault();
  const err = $("ntErr");
  const name = $("ntName").value.trim();
  const fee = Number($("ntFee").value), win = Number($("ntWin").value), shut = Number($("ntShut").value);
  const legs = Number($("ntLegs").value);
  const ids = selectedPlayers();

  if (!name) { err.textContent = "Γράψε όνομα."; return; }
  if (S.tournaments.some((t) => t.name.toLocaleLowerCase("el") === name.toLocaleLowerCase("el"))) { err.textContent = "Υπάρχει ήδη τουρνουά με αυτό το όνομα."; return; }
  if (ids.length < 2) { err.textContent = "Διάλεξε τουλάχιστον 2 παίκτες."; return; }

  const plan = roundRobin(ids, legs);
  $("ntSave").disabled = true;
  const { data, error } = await sb.rpc("create_tournament", {
    p_name: name, p_fee: fee, p_win: win, p_shutout: shut, p_legs: legs, p_rounds_per_leg: plan.roundsPerLeg,
    p_rounds: plan.rounds, p_matches: plan.matches,
  });
  $("ntSave").disabled = false;
  if (error) {
    err.textContent = error.code === "42501" ? "Δεν έχεις δικαίωμα. Συνδέσου ως γραμματεία." : "Η δημιουργία απέτυχε. Δοκίμασε ξανά.";
    return;
  }
  $("dNewT").close();
  await loadAll();
  selectTournament(data);
}

/* ---------- Ρυθμίσεις τουρνουά ---------- */
function openEditTournament() {
  const t = current();
  if (!t) return;
  $("etName").value = t.name;
  $("etFee").value = t.fee;
  $("etWin").value = t.win_pts;
  $("etShut").value = t.shutout_pts;
  $("etErr").textContent = "";

  const hasResults = S.matches.some((m) => played(m) || m.pa || m.pb);
  $("etNote").textContent = hasResults
    ? "Το τουρνουά έχει αποτελέσματα ή πληρωμές, οπότε δεν μπορεί να διαγραφεί."
    : "Η διαγραφή σβήνει το τουρνουά και όλο το πρόγραμμά του.";
  const del = $("etDel");
  del.textContent = "Διαγραφή τουρνουά";
  del.dataset.armed = "";
  del.disabled = hasResults;
  del.onclick = async () => {
    if (del.dataset.armed !== "1") { del.dataset.armed = "1"; del.textContent = "Σίγουρα; Πάτα ξανά"; return; }
    del.disabled = true;
    try {
      await write(sb.from("tournaments").delete().eq("id", t.id));
      S.tid = null;
      $("dEditT").close();
    } catch (x) { $("etErr").textContent = x.message; del.disabled = false; }
  };
  $("dEditT").showModal();
}

async function saveTournament(e) {
  e.preventDefault();
  const t = current();
  const body = {
    name: $("etName").value.trim(),
    fee: Number($("etFee").value),
    win_pts: Number($("etWin").value),
    shutout_pts: Number($("etShut").value),
  };
  if (!body.name) { $("etErr").textContent = "Γράψε όνομα."; return; }
  try { await write(sb.from("tournaments").update(body).eq("id", t.id)); $("dEditT").close(); }
  catch (x) { $("etErr").textContent = x.message; }
}

export function initTournaments() {
  $("fNewT").onsubmit = createTournament;
  $("fEditT").onsubmit = saveTournament;
}
