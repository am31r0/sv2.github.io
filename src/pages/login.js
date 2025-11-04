import { showNav, showToast } from "../lib/utils.js";

const LS_KEY = "sms_user_session";



export function renderLoginPage(mount) {
  showNav(false);

  mount.innerHTML = `
    <section class="login-page">
    <img class="logo" src="./public/icons/schappie-logo.webp">
      <p style="opacity:0.99;">Log in om verder te gaan</p>

      <div class="login-buttons">
        <button id="google-login" class="btn-login">
          
          Log in met <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="G" style="height:1.1rem; vertical-align:middle; margin-right:8px;">
        </button>
        <button id="dev-login" class="btn-login btn-dev">
        Ik ben ontwikkelaar
        </button>
      </div>

      <p class="login-terms">
        Door verder te gaan, ga je akkoord<br>met onze
        <a href="about:blank" target="_blank">Gebruiksvoorwaarden</a> &
        <a href="about:blank" target="_blank">Privacyverklaring</a>.
      </p>
    </section>
  `;

  // Placeholder login handlers
  document.querySelector("#google-login").addEventListener("click", () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ method: "google" }));
    showToast("✅ Ingelogd met Google (placeholder)");
  });

  document.querySelector("#dev-login").addEventListener("click", () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ method: "developer" }));
    showToast("🧠 Ontwikkelaarsmodus geactiveerd");
    window.location.hash = "#/home";
  });
    
  function saveSession(session) {
    // Developer → nooit opslaan
    if (session.user === "developer") return;
    localStorage.setItem(LS_KEY, JSON.stringify(session));
  }
  
    
}


