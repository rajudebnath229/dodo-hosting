const createButton = document.getElementById("create-server");
const notice = document.getElementById("notice");
const authModal = document.getElementById("auth-modal");
const authOpen = document.getElementById("auth-open");
const authClose = document.getElementById("auth-close");
const authLogout = document.getElementById("auth-logout");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");
const passwordHelp = document.getElementById("password-help");
const showLogin = document.getElementById("show-login");
const showRegister = document.getElementById("show-register");
const accountLabel = document.getElementById("account-label");

let authMode = "login";
let currentUser = null;

function setMessage(message, success = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("success", success);
}

function setMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  authTitle.textContent = registering ? "Create your account" : "Sign in to your account";
  authSubtitle.textContent = registering ? "Create an account to access your Dodo dashboard." : "Continue to your hosting dashboard.";
  authSubmit.textContent = registering ? "Create account" : "Sign in";
  authPassword.autocomplete = registering ? "new-password" : "current-password";
  passwordHelp.textContent = registering ? "Use 10–72 characters. A longer unique passphrase is best." : "Enter your account password.";
  showLogin.classList.toggle("active", !registering);
  showRegister.classList.toggle("active", registering);
  setMessage("");
}

function openAuth(mode = "login") {
  setMode(mode);
  authModal.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => authEmail.focus(), 0);
}

function closeAuth() {
  authModal.hidden = true;
  document.body.classList.remove("modal-open");
  authForm.reset();
  setMessage("");
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
  try { body = await response.json(); } catch { /* The API may return an empty response. */ }
  if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
  return body;
}

async function loadSession() {
  try {
    const data = await apiRequest("/api/auth/me", { method: "GET", headers: {} });
    renderAccount(data.user);
  } catch {
    renderAccount(null);
  }
}

authOpen.addEventListener("click", () => openAuth("login"));
authClose.addEventListener("click", closeAuth);
showLogin.addEventListener("click", () => setMode("login"));
showRegister.addEventListener("click", () => setMode("register"));

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuth();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !authModal.hidden) closeAuth();
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  authSubmit.disabled = true;
  authSubmit.textContent = authMode === "register" ? "Creating account…" : "Signing in…";
  setMessage("");
  try {
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const data = await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    renderAccount(data.user);
    closeAuth();
    if (notice) {
      notice.textContent = authMode === "register"
        ? "Account created. Server provisioning is not connected yet."
        : "Signed in. Your account is ready; server provisioning is the next milestone.";
      notice.classList.add("notice-active");
    }
  } catch (error) {
    setMessage(error.message);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = authMode === "register" ? "Create account" : "Sign in";
  }
});

authLogout.addEventListener("click", async () => {
  authLogout.disabled = true;
  try {
    await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
    renderAccount(null);
    if (notice) {
      notice.textContent = "You have signed out.";
      notice.classList.add("notice-active");
    }
  } catch (error) {
    if (notice) {
      notice.textContent = error.message;
      notice.classList.add("notice-active");
    }
  } finally {
    authLogout.disabled = false;
  }
});

createButton?.addEventListener("click", () => {
  if (!currentUser) {
    notice.textContent = "Please sign in before continuing. Server creation will be enabled after hosting infrastructure is connected.";
    notice.classList.add("notice-active");
    openAuth("login");
    return;
  }
  notice.textContent = "You are signed in. Real server creation is not enabled yet; we still need to connect a secure Minecraft host.";
  notice.classList.add("notice-active");
});

loadSession();
