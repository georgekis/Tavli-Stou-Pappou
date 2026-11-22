// Σύνδεση γραμματείας με σύνδεσμο στο email (χωρίς κωδικό).
import { sb } from "./supabase.js";
import { S, $ } from "./state.js";
import { render } from "./render.js";

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
    el.innerHTML = `<span>${S.canEdit ? "Γραμματεία" : "Χωρίς δικαίωμα αλλαγών"}</span><button id="logout">Αποσύνδεση</button>`;
    $("logout").onclick = () => sb.auth.signOut();
  } else {
    el.innerHTML = `<button id="login">Σύνδεση</button>`;
    $("login").onclick = () => {
      $("lErr").textContent = "";
      $("lErr").style.color = "";
      $("lSend").disabled = false;
      $("dLogin").showModal();
    };
  }
}

async function sendLink(e) {
  e.preventDefault();
  const email = $("lEmail").value.trim();
  const err = $("lErr");
  $("lSend").disabled = true;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) {
    err.style.color = "";
    err.textContent = error.status === 429
      ? "Έχουν σταλεί πολλά email πρόσφατα. Δοκίμασε ξανά σε μία ώρα."
      : "Η αποστολή απέτυχε. Έλεγξε το email και δοκίμασε ξανά.";
    $("lSend").disabled = false;
    return;
  }
  err.style.color = "var(--ok)";
  err.textContent = `Έστειλα σύνδεσμο στο ${email}. Άνοιξε το email σου (κοίτα και στα ανεπιθύμητα).`;
}

export function initAuth() {
  renderAuth();
  $("fLogin").onsubmit = sendLink;
  sb.auth.onAuthStateChange((_event, session) => { setTimeout(() => refreshAuth(session), 0); });
}
