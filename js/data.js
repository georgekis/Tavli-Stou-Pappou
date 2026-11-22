// Φόρτωση και αποθήκευση δεδομένων στη βάση.
import { sb } from "./supabase.js";
import { S, showNotice, savedTid, saveTid } from "./state.js";

let onChange = () => {};
/** Ορίζει τι τρέχει κάθε φορά που αλλάζουν τα δεδομένα (συνήθως: ξανασχεδίασε τη σελίδα). */
export const onDataChange = (fn) => { onChange = fn; };

/** Κρατά μόνο τα δεδομένα του επιλεγμένου τουρνουά. */
function applyTournament() {
  const ids = S.tournaments.map((t) => t.id);
  if (!ids.includes(S.tid)) S.tid = ids.includes(savedTid()) ? savedTid() : (ids[0] ?? null);
  const t = S.tournaments.find((x) => x.id === S.tid);

  S.matches = S.allMatches.filter((m) => m.tournament_id === S.tid);
  S.rounds = Object.fromEntries(S.allRounds.filter((r) => r.tournament_id === S.tid).map((r) => [r.r, r]));
  S.fee = t?.fee ?? 2;
  S.winPts = t?.win_pts ?? 1;
  S.shutoutPts = t?.shutout_pts ?? 2;
  S.legs = t?.legs ?? 2;
  S.roundsPerLeg = t?.rounds_per_leg ?? 7;
}

/** Αλλαγή τουρνουά από τη λίστα. */
export function selectTournament(id) {
  S.tid = id;
  saveTid(id);
  applyTournament();
  onChange();
}

export async function loadAll() {
  const [t, p, r, m] = await Promise.all([
    sb.from("tournaments").select("*").order("created_at", { ascending: false }),
    sb.from("players").select("*"),
    sb.from("rounds").select("*"),
    sb.from("matches").select("*").order("r").order("n"),
  ]);

  if (t.error || p.error || r.error || m.error) {
    showNotice("Δεν ήταν δυνατή η φόρτωση των δεδομένων. Δοκίμασε ανανέωση της σελίδας.");
    S.loaded = true;
    onChange();
    return;
  }

  S.tournaments = t.data;
  S.players = Object.fromEntries(p.data.map((x) => [x.id, x]));
  S.allRounds = r.data;
  S.allMatches = m.data;
  applyTournament();
  S.loaded = true;
  showNotice("");
  onChange();
}

let reloadTimer = null;
export function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(loadAll, 250);
}

/** Ζωντανή ενημέρωση: όταν αλλάζει κάτι στη βάση, ξαναφορτώνει. */
export function subscribe() {
  sb.channel("tavli")
    .on("postgres_changes", { event: "*", schema: "public" }, scheduleReload)
    .subscribe();
}

/**
 * Εκτελεί μια αλλαγή και ελέγχει ότι πέρασε.
 * Χωρίς δικαίωμα, η βάση δεν βγάζει σφάλμα αλλά δεν επιστρέφει γραμμές.
 */
export async function write(query) {
  const { data, error } = await query.select();
  if (error) {
    if (error.code === "23503") throw new Error("Ο παίκτης έχει αγώνες, οπότε δεν μπορεί να διαγραφεί.");
    if (error.code === "23505") throw new Error("Υπάρχει ήδη παίκτης με αυτό το όνομα.");
    throw new Error("Η αποθήκευση απέτυχε. Δοκίμασε ξανά.");
  }
  if (!data || !data.length) throw new Error("Δεν έχεις δικαίωμα αλλαγών. Συνδέσου ως γραμματεία.");
  scheduleReload();
  return data;
}
