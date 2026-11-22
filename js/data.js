// Φόρτωση και αποθήκευση δεδομένων στη βάση.
import { sb } from "./supabase.js";
import { S, showNotice } from "./state.js";

let onChange = () => {};
/** Ορίζει τι τρέχει κάθε φορά που αλλάζουν τα δεδομένα (συνήθως: ξανασχεδίασε τη σελίδα). */
export const onDataChange = (fn) => { onChange = fn; };

export async function loadAll() {
  const [p, r, m, s] = await Promise.all([
    sb.from("players").select("*"),
    sb.from("rounds").select("*"),
    sb.from("matches").select("*").order("r").order("n"),
    sb.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (p.error || r.error || m.error || s.error) {
    showNotice("Δεν ήταν δυνατή η φόρτωση των δεδομένων. Δοκίμασε ανανέωση της σελίδας.");
    S.loaded = true;
    onChange();
    return;
  }

  S.players = Object.fromEntries(p.data.map((x) => [x.id, x]));
  S.rounds = Object.fromEntries(r.data.map((x) => [x.r, x]));
  S.matches = m.data;
  S.winPts = s.data?.win_pts ?? 1;
  S.shutoutPts = s.data?.shutout_pts ?? 2;
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
    if (error.code === "23503") throw new Error("Ο παίκτης έχει αγώνες στο πρόγραμμα, οπότε δεν μπορεί να διαγραφεί.");
    if (error.code === "23505") throw new Error("Υπάρχει ήδη παίκτης με αυτό το όνομα.");
    throw new Error("Η αποθήκευση απέτυχε. Δοκίμασε ξανά.");
  }
  if (!data || !data.length) throw new Error("Δεν έχεις δικαίωμα αλλαγών. Συνδέσου ως γραμματεία.");
  scheduleReload();
  return data;
}
