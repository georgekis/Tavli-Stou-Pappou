// Σύνδεση γραμματείας.
// Πρώτη φορά: σύνδεσμος στο email και ορισμός κωδικού.
// Μετά: email + κωδικός, χωρίς email. Η σύνδεση μένει ενεργή στη συσκευή.
import { sb } from "./supabase.js";
import { S, $ } from "./state.js";
import { render } from "./render.js";

// Ο σύνδεσμος του email επιστρέφει με «type=magiclink» ή «type=signup» στη διεύθυνση.
// Το κρατάμε εδώ, πριν το καθαρίσει η βάση, για να ζητήσουμε κωδικό την πρώτη φορά.
const cameFromEmailLink = /type=(magiclink|signup)/.test(location.hash);

function setMsg(id, text, ok = false) {
  const el = $(id);
  el.style.color = ok ? "var(--ok)" : "";
  el.textContent = text;
}

async function refreshAuth(session) {
  S.email = session?.user?.email || null;
  S.canEdit = false;
  if (S.email) {
    const { data } = await sb.rpc("is_admin");
    S.canEdit = data === true;
  }
  renderAuth();
  render();
}

function renderAuth() {
  const el = $("auth");
  if (S.email) {
    el.innerHTML = `<span>${S.canEdit ? "Γραμματεία" : "Χωρίς δικαίωμα αλλαγών"}</span>`
      + (S.canEdit ? `<button id="setPass">Κωδικός</button> ` : "")
      + `<button id="logout">Αποσύνδεση</button>`;
    $("logout").onclick = () => sb.auth.signOut();
    if (S.canEdit) $("setPass").onclick = openSetPassword;
  } else {
    el.innerHTML = `<button id="login">Σύνδεση</button>`;
    $("login").onclick = () => {
      setMsg("lErr", "");
      $("lSend").disabled = false;
      $("lLink").disabled = false;
      $("dLogin").showModal();
    };
  }
}

/* ---------- Σύνδεση με κωδικό ---------- */
async function loginWithPassword(e) {
  e.preventDefault();
  const email = $("lEmail").value.trim();
  const password = $("lPass").value;
  if (!password) { setMsg("lErr", "Γράψε τον κωδικό σου. Αν δεν έχεις ορίσει ακόμα, πάτα «Πρώτη φορά»."); return; }

  $("lSend").disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  $("lSend").disabled = false;
  if (error) {
    setMsg("lErr", error.status === 429
      ? "Πολλές προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά."
      : "Λάθος email ή κωδικός. Αν δεν έχεις ορίσει κωδικό, πάτα «Πρώτη φορά».");
    return;
  }
  $("lPass").value = "";
  $("dLogin").close();
}

/* ---------- Πρώτη φορά: σύνδεσμος στο email ---------- */
async function sendLink() {
  const email = $("lEmail").value.trim();
  if (!$("lEmail").checkValidity() || !email) { setMsg("lErr", "Γράψε πρώτα σωστά το email σου."); return; }

  $("lLink").disabled = true;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) {
    $("lLink").disabled = false;
    setMsg("lErr", error.status === 429
      ? "Έχουν σταλεί πολλά email πρόσφατα. Δοκίμασε ξανά σε μία ώρα."
      : "Η αποστολή απέτυχε. Έλεγξε το email και δοκίμασε ξανά.");
    return;
  }
  setMsg("lErr", `Έστειλα σύνδεσμο στο ${email}. Άνοιξέ τον (κοίτα και στα ανεπιθύμητα) και μετά όρισε κωδικό.`, true);
}

/* ---------- Ορισμός κωδικού ---------- */
function openSetPassword() {
  $("nPass").value = "";
  $("nPass2").value = "";
  setMsg("nErr", "");
  $("dPass").showModal();
}

async function savePassword(e) {
  e.preventDefault();
  const p1 = $("nPass").value, p2 = $("nPass2").value;
  if (p1.length < 8) { setMsg("nErr", "Τουλάχιστον 8 χαρακτήρες."); return; }
  if (p1 !== p2) { setMsg("nErr", "Οι δύο κωδικοί δεν ταιριάζουν."); return; }

  $("nSave").disabled = true;
  const { error } = await sb.auth.updateUser({ password: p1 });
  $("nSave").disabled = false;
  if (error) { setMsg("nErr", "Ο κωδικός δεν αποθηκεύτηκε. Δοκίμασε άλλον, πιο δύσκολο."); return; }
  setMsg("nErr", "Έτοιμο. Από εδώ και πέρα μπαίνεις με email και κωδικό.", true);
  setTimeout(() => $("dPass").close(), 1500);
}

let promptedForPassword = false;

/* ---------- «Ματάκι» στα πεδία κωδικού ---------- */
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

function addPasswordToggles() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.parentElement.classList.contains("pw")) return;
    const wrap = document.createElement("span");
    wrap.className = "pw";
    input.replaceWith(wrap);
    wrap.appendChild(input);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-toggle";
    const sync = () => {
      const shown = input.type === "text";
      btn.innerHTML = shown ? EYE_OFF : EYE;
      btn.setAttribute("aria-label", shown ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού");
      btn.title = btn.getAttribute("aria-label");
    };
    btn.onclick = () => { input.type = input.type === "password" ? "text" : "password"; sync(); input.focus(); };
    sync();
    wrap.appendChild(btn);

    // Κάθε φορά που κλείνει το παράθυρο, ο κωδικός κρύβεται ξανά.
    input.closest("dialog")?.addEventListener("close", () => { input.type = "password"; sync(); });
  });
}

export function initAuth() {
  addPasswordToggles();
  renderAuth();
  $("fLogin").onsubmit = loginWithPassword;
  $("lLink").onclick = sendLink;
  $("fPass").onsubmit = savePassword;

  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      await refreshAuth(session);
      // Μετά την πρώτη σύνδεση με σύνδεσμο, ζήτα κωδικό από τη γραμματεία.
      if (cameFromEmailLink && !promptedForPassword && S.canEdit) {
        promptedForPassword = true;
        openSetPassword();
      }
    }, 0);
  });
}
