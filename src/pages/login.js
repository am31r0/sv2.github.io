// =============================================
// Schappie - Login Page with Google Sign-In
// =============================================
import { showNav, showToast } from "../lib/utils.js";
import { warmupDataAndEngine } from "../lib/dataLoader.js";
import { session } from "../lib/session.js";
import { resetTutorialStatus } from "../lib/tutorialPopup.js"; // ✅ Import for tutorial reset
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Initialize Google Auth (web only - Android uses plugin config)
if (typeof window !== 'undefined' && !window.Capacitor) {
  GoogleAuth.initialize({
    clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

export function renderLoginPage(mount) {
  showNav(false);

  mount.innerHTML = `
    <section class="login-page">
      <img class="logo" src="./icons/schappie-logo.webp" />
      <p style="opacity:0.99;">Log in om verder te gaan</p>

      <div class="login-buttons">
        <button id="google-login" class="btn-login">
          Log in met
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="G"
            style="height:1.1rem; vertical-align:middle; margin-right:8px;">
        </button>
        <button id="dev-login" class="btn-login btn-dev">
          Ik ben ontwikkelaar
        </button>
      </div>

      <details class="dev-code">
        <summary>Heb je een Pro-code?</summary>
        <input id="pro-code" placeholder="Voer code in" />
        <button id="activate-code">Activeer</button>
      </details>

      <p class="login-terms">
        Door verder te gaan, ga je akkoord<br>met onze
        <a href="about:blank" target="_blank">Gebruiksvoorwaarden</a> &
        <a href="about:blank" target="_blank">Privacyverklaring</a>.
      </p>
    </section>
  `;

  // --- Google Sign-In Handler ---
  document
    .getElementById("google-login")
    .addEventListener("click", async () => {
      try {
        showToast("Inloggen met Google…");
        
        // Sign in with Google
        const googleUser = await GoogleAuth.signIn();
        
        // TODO: Send to backend for verification and subscription check
        // For now, create a session with placeholder data
        const userData = await verifyGoogleToken(googleUser);
        
        session.signIn(userData);
        
        // ✅ Reset tutorial for new sign-in (will show on next navigation)
        resetTutorialStatus();
        
        showToast("✅ Ingelogd met Google");
        
        // ✅ Start data loading in background (don't wait)
        warmupDataAndEngine().catch(() => {});
        
        // ✅ Navigate immediately to tutorial
        location.hash = "#/tutorial";
      } catch (err) {
        console.error("Google login error:", err);
        showToast("Login mislukt: " + err.message);
      }
    });

  // --- Dev Login Handler ---
  document.getElementById("dev-login").addEventListener("click", async (e) => {
    // ✅ Prevent double clicks
    const btn = e.target;
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = "Bezig...";
    
    const devSession = {
      uid: "dev:" + Math.random().toString(36).slice(2),
      email: "developer@local",
      roles: ["dev"], // Dev role but NO pro access
      pro_until: null, // No pro access by default
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
    };
    session.signIn(devSession);
    
    // ✅ Reset tutorial for new sign-in (will show on next navigation)
    resetTutorialStatus();
    
    showToast("🧠 Ontwikkelaarsmodus geactiveerd");
    
    // ✅ Start data loading in background (don't wait)
    warmupDataAndEngine().catch(() => {});
    
    // ✅ Navigate immediately to tutorial
    location.hash = "#/tutorial";
  });

  // --- Pro Code Activation Handler ---
  document
    .getElementById("activate-code")
    .addEventListener("click", async () => {
      const code = document.getElementById("pro-code").value.trim();
      if (!code) return showToast("Voer een geldige code in");

      // TODO: vervang door echte servervalidatie
      if (code.toUpperCase() === "BOMBOCLAT") {
        const proSession = {
          uid: "code:" + code,
          email: "guest@schappie",
          roles: ["user"],
          pro_until: new Date(Date.now() + 7 * 864e5).toISOString(),
          exp: Math.floor(Date.now() / 1000) + 7 * 86400,
        };
        session.signIn(proSession);
        
        // Reset welcome message flag so it shows on first pro page visit
        localStorage.removeItem('sms_pro_welcome_shown');
        
        showToast("✅ Pro actief voor 7 dagen");
        await warmupDataAndEngine().catch(() => {});
        location.hash = "#/home";
      } else {
        showToast("Ongeldige code");
      }
    });
}

/**
 * Verify Google token with backend and get user data
 * TODO: Replace with actual backend API call
 * 
 * @param {Object} googleUser - Google user object from GoogleAuth.signIn()
 * @returns {Promise<Object>} - Session data with subscription status
 */
async function verifyGoogleToken(googleUser) {
  // PLACEHOLDER: This should call your backend API
  // Example:
  // const response = await fetch('/api/auth/google', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     idToken: googleUser.authentication.idToken,
  //   }),
  // });
  // const userData = await response.json();
  // return userData;
  
  // For now, return mock data
  console.log("Google user:", googleUser);
  
  return {
    uid: googleUser.id,
    email: googleUser.email,
    name: googleUser.name,
    roles: ["user"],
    pro_until: null, // TODO: Get from backend based on subscription
    exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7, // 7 days
  };
}

/**
 * Check subscription status from backend
 * TODO: Implement actual backend call
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Subscription data
 */
async function checkSubscriptionStatus(userId) {
  // PLACEHOLDER: This should call your backend API
  // Example:
  // const response = await fetch(`/api/user/${userId}/subscription`);
  // const subData = await response.json();
  // return subData;
  
  return {
    isPro: false,
    pro_until: null,
    plan: "free",
  };
}
