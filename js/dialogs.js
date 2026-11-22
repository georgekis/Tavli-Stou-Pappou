// Παράθυρα επεξεργασίας: αγώνας, αγωνιστική, παίκτης.
import { sb } from "./supabase.js";
import { write } from "./data.js";
import { S, $, esc, played, pname, playerIds, roundNums, matchCount, showNotice } from "./state.js";

const options = (ids, selected, emptyLabel) =>
  (emptyLabel ? `<option value="">${emptyLabel}</option>` : "") +
  ids.map((id) => `<option value="${esc(id)}" ${id === selected ? "selected" : ""}>${esc(pname(id))}</option>`).join("");

const nextN = (r) => Math.max(0, ...S.matches.filter((m) => m.r === r).map((m) => m.n || 0)) + 1;

/** Κουμπί διαγραφής σε δύο βήματα (πρώτο πάτημα: «Σίγουρα;»). */
function armDelete(btn, label, action) {
  btn.textContent = label;
  btn.dataset.armed = "";
  btn.onclick = async () => {
    if (btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = "Σίγουρα; Πάτα ξανά"; return; }
    btn.disabled = true;
    try { await action(); } finally { btn.disabled = false; }
  };
}

/* ---------- Αγώνας ---------- */
let editM = null;

export function openMatch(id) {
  const m = id ? S.matches.find((x) => x.id === id) : null;
  editM = m;
  const ids = playerIds(), rounds = roundNums();
  const r = m ? m.r : (rounds[rounds.length - 1] || 1);
  const maxR = Math.max(S.legs * S.roundsPerLeg, ...rounds) + 1;

  $("mTitle").textContent = m ? `${pname(m.a)} – ${pname(m.b)}` : "Νέος αγώνας";
  $("mRound").innerHTML = Array.from({ length: maxR }, (_, i) => i + 1)
    .map((n) => `<option value="${n}" ${n === r ? "selected" : ""}>${n}η Αγωνιστική</option>`).join("");
  $("mA").innerHTML = options(ids, m?.a, "— επίλεξε —");
  $("mB").innerHTML = options(ids, m?.b, "— επίλεξε —");
  $("mSA").value = m && played(m) ? m.sa : "";
  $("mSB").value = m && played(m) ? m.sb : "";
  $("mPA").checked = !!m?.pa;
  $("mPB").checked = !!m?.pb;
  $("mDate").value = m?.date || "";
  $("mErr").textContent = "";
  $("mDel").hidden = !m;
  $("mClear").hidden = !m || !played(m);

  if (m) armDelete($("mDel"), "Διαγραφή αγώνα", async () => {
    try { await write(sb.from("matches").delete().eq("id", m.id)); $("dMatch").close(); }
    catch (e) { $("mErr").textContent = e.message; }
  });
  $("dMatch").showModal();
}

async function saveMatch(e) {
  e.preventDefault();
  const err = $("mErr");
  const a = $("mA").value, b = $("mB").value, r = Number($("mRound").value);
  if (!a || !b) { err.textContent = "Επίλεξε και τους δύο παίκτες."; return; }
  if (a === b) { err.textContent = "Ο παίκτης δεν μπορεί να παίξει με τον εαυτό του."; return; }

  const vA = $("mSA").value.trim(), vB = $("mSB").value.trim();
  let sa = null, sb_ = null;
  if (vA !== "" || vB !== "") {
    sa = Number(vA); sb_ = Number(vB);
    const ok = vA !== "" && vB !== "" && [sa, sb_].every((x) => Number.isInteger(x) && x >= 0 && x <= 99);
    if (!ok) { err.textContent = "Συμπλήρωσε και τα δύο σκορ με ακέραιους αριθμούς."; return; }
    if (sa === sb_) { err.textContent = "Στο τάβλι δεν υπάρχει ισοπαλία — έλεγξε το σκορ."; return; }
  }

  const body = { r, a, b, sa, sb: sb_, pa: $("mPA").checked, pb: $("mPB").checked, date: $("mDate").value || null };
  try {
    if (editM) {
      if (editM.r !== r) body.n = nextN(r);
      await write(sb.from("matches").update(body).eq("id", editM.id));
    } else {
      await write(sb.from("matches").insert({ ...body, n: nextN(r), tournament_id: S.tid }));
    }
    $("dMatch").close();
  } catch (x) { err.textContent = x.message; }
}

export async function togglePay(id, side, btn) {
  const m = S.matches.find((x) => x.id === id);
  if (!m) return;
  btn.disabled = true;
  const key = side === "a" ? "pa" : "pb";
  try { await write(sb.from("matches").update({ [key]: !m[key] }).eq("id", id)); }
  catch (x) { showNotice(x.message); btn.disabled = false; }
}

/* ---------- Αγωνιστική ---------- */
let editR = null;

export function openRound(r) {
  editR = r;
  const R = S.rounds[r] || {};
  $("rTitle").textContent = `${r}η Αγωνιστική`;
  $("rDates").value = R.dates || "";
  $("rBye").innerHTML = options(playerIds(), R.bye, "— κανένας —");
  $("rErr").textContent = "";
  $("dRound").showModal();
}

async function saveRound(e) {
  e.preventDefault();
  try {
    await write(sb.from("rounds").upsert({ tournament_id: S.tid, r: editR, dates: $("rDates").value.trim(), bye: $("rBye").value || null }));
    $("dRound").close();
  } catch (x) { $("rErr").textContent = x.message; }
}

/* ---------- Παίκτης ---------- */
let editP = null;

export function openPlayer(id) {
  editP = id;
  const n = id ? matchCount(id) : 0;
  $("pTitle").textContent = id ? "Επεξεργασία παίκτη" : "Νέος παίκτης";
  $("pName").value = id ? pname(id) : "";
  $("pErr").textContent = "";
  $("pDel").hidden = !id;
  $("pNote").textContent = id && n ? `Έχει ${n} ${n === 1 ? "αγώνα" : "αγώνες"} σε τουρνουά, οπότε δεν μπορεί να διαγραφεί.` : "";

  if (id) {
    armDelete($("pDel"), "Διαγραφή παίκτη", async () => {
      try { await write(sb.from("players").delete().eq("id", id)); $("dPlayer").close(); }
      catch (x) { $("pErr").textContent = x.message; }
    });
    $("pDel").disabled = n > 0;
  }
  $("dPlayer").showModal();
}

async function savePlayer(e) {
  e.preventDefault();
  const name = $("pName").value.trim();
  if (!name) { $("pErr").textContent = "Γράψε όνομα."; return; }
  const taken = playerIds().some((id) => id !== editP && pname(id).toLocaleLowerCase("el") === name.toLocaleLowerCase("el"));
  if (taken) { $("pErr").textContent = "Υπάρχει ήδη παίκτης με αυτό το όνομα."; return; }
  try {
    if (editP) await write(sb.from("players").update({ name }).eq("id", editP));
    else await write(sb.from("players").insert({ name }));
    $("dPlayer").close();
  } catch (x) { $("pErr").textContent = x.message; }
}

/* ---------- Σύνδεση φορμών ---------- */
export function initDialogs() {
  document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => b.closest("dialog").close()));
  $("mClear").onclick = () => { $("mSA").value = ""; $("mSB").value = ""; $("mClear").hidden = true; };
  $("fMatch").onsubmit = saveMatch;
  $("fRound").onsubmit = saveRound;
  $("fPlayer").onsubmit = savePlayer;
}
