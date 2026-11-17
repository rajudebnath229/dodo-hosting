const createButton = document.getElementById("create-server");
const notice = document.getElementById("notice");
const authModal = document.getElementById("auth-modal");
const authOpen = document.getElementById("auth-open");
const authClose = document.getElementById("auth-close");
const authLogout = document.getElementById("auth-logout");
const authMessage = document.getElementById("auth-message");
const accountLabel = document.getElementById("account-label");
const googleButton = document.getElementById("google-signin");

let currentUser = null;
let googleClientId = null;

function setMessage(message, success = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("success", success);
}

function openAuth() {
  authModal.hidden = false;
  document.body.classList.add("modal-open");
  renderGoogleButton();
}

function closeAuth() {
  authModal.hidden = true;
  document.body.classList.remove("modal-open");
  if (!authOpen.hidden) authOpen.focus();
  else authLogout.focus();
}

function renderAccount(user) {
  currentUser = user;
  const signedIn = Boolean(user);
  authOpen.hidden = signedIn;
  authLogout.hidden = !signedIn;
  accountLabel.hidden = !signedIn;
  accountLabel.textContent = signedIn ? user.email : "";
  accountLabel.title = signedIn ? user.email : "";
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  let body = {};
  try { body = await response.json(); } catch { /* Empty response. */ }
  if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
  return body;
}

function renderGoogleButton() {
  if (!googleClientId || !window.google?.accounts?.id || authModal.hidden) return;
  googleButton.replaceChildren();
  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true
  });
  window.google.accounts.id.renderButton(googleButton, {
    type: "standard",
    theme: "filled_black",
    size: "large",
    shape: "pill",
    text: "continue_with",
    width: 320,
    logo_alignment: "left"
  });
}

async function handleGoogleCredential(response) {
  if (!response?.credential) {
    setMessage("Google did not return a sign-in credential. Please try again.");
    return;
  }
  setMessage("Verifying your Google account…");
  try {
    const data = await apiRequest("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential })
    });
    renderAccount(data.user);
    closeAuth();
    notice.textContent = "Signed in with Google. Server provisioning is the next milestone; no Minecraft server has been created yet.";
    notice.classList.add("notice-active");
  } catch (error) {
    setMessage(error.message);
  }
}

async function loadSession() {
  try {
    const data = await apiRequest("/api/auth/me", { method: "GET", headers: {} });
    renderAccount(data.user);
  } catch {
    renderAccount(null);
  }
}

async function loadGoogleConfig() {
  try {
    const data = await apiRequest("/api/config", { method: "GET", headers: {} });
    googleClientId = data.googleClientId;
    if (!googleClientId) throw new Error("Google sign-in is not configured on the server yet.");
    renderGoogleButton();
  } catch (error) {
    setMessage(error.message);
  }
}

authOpen.addEventListener("click", openAuth);
authClose.addEventListener("click", closeAuth);
authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuth();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !authModal.hidden) closeAuth();
});

authLogout.addEventListener("click", async () => {
  authLogout.disabled = true;
  try {
    await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
    renderAccount(null);
    notice.textContent = "You have signed out.";
    notice.classList.add("notice-active");
  } catch (error) {
    notice.textContent = error.message;
    notice.classList.add("notice-active");
  } finally {
    authLogout.disabled = false;
  }
});

createButton?.addEventListener("click", () => {
  if (!currentUser) {
    notice.textContent = "Please sign in with Google before continuing.";
    notice.classList.add("notice-active");
    openAuth();
    return;
  }
  notice.textContent = "You're signed in. Real server creation is not enabled until a secure Minecraft hosting node is connected.";
  notice.classList.add("notice-active");
});

loadSession();
loadGoogleConfig();
