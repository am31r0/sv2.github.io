// =============================================
// Schappie - Main Entrypoint (App build)
// =============================================

import { createRouter } from "./router.js";
import { renderHomePage } from "../pages/home.js";
import { renderListPage } from "../pages/list.js";
import { renderSettingsPage } from "../pages/settings.js";
import { renderDealsPage } from "../pages/deals.js";
import { renderProPage } from "../pages/pro.js";
import { renderTutorialPage } from "../pages/tutorial.js";
import { renderLoginPage } from "../pages/login.js";

import { initSettings } from "../lib/settings.js";
import {
  shouldShowTutorialOnce,
  markTutorialShown,
} from "../lib/tutorialPopup.js";
import { registerClick } from "../lib/adSystem.js";
import { loadLearnedBoosts } from "../lib/matching.js";
import { session } from "../lib/session.js";
import { checkPriceAlerts } from "../lib/priceAlert.js";
import { ensureDataLoaded } from "../lib/dataLoader.js";

const mount = document.getElementById("app");

/* ----------------------------
   App Init
----------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  // 1️⃣ Settings en cache vóór eerste paint
  initSettings();
  loadLearnedBoosts();

  // 2️⃣ Session herstellen
  await session.rehydrate();

  // 3️⃣ Router setup
  const routes = {
    "#/home": renderHomePage,
    "#/list": renderListPage,
    "#/settings": renderSettingsPage,
    "#/deals": renderDealsPage,
    "#/tutorial": renderTutorialPage,
    "#/pro": renderProPage,
    "#/login": renderLoginPage,
  };

  const router = createRouter({
    routes,
    mountEl: mount,
    defaultHash: "#/home",
  });

  /* ----------------------------
     4️⃣ Route Guards (login only)
  ----------------------------- */
  router.beforeEach((to, from, next) => {
    const signedIn = session.isSignedIn();

    // 🔒 Login verplicht
    if (!signedIn && to !== "#/login") {
      return next("#/login");
    }

    // ✅ Al ingelogd maar op loginpagina → naar home
    if (signedIn && to === "#/login") {
      return next("#/home");
    }

    // Pro page is accessible to everyone, but features are limited for non-pro users
    next(); // alles oké → render
  });

  /* ----------------------------
     5️⃣ Router Start + Tutorial Flow
  ----------------------------- */
  router.start();

  if (shouldShowTutorialOnce()) {
    router.go("#/tutorial");
    markTutorialShown();
  } else if (!location.hash) {
    location.hash = "#/home";
  }

  /* ----------------------------
     6️⃣ Algemene klik-/touch-listeners
  ----------------------------- */
  registerClick();

  document.addEventListener("click", (e) => {
    const target = e.target.closest("button, .product-card, .add-btn, a");
    if (target) registerClick();
  });

  document.addEventListener("touchend", () => {
    document.activeElement?.blur();
  });

  /* ----------------------------
     7️⃣ Swipe/tab functionaliteit verwijderd
  ----------------------------- */
  // Swipe en drag navigatie is verwijderd op verzoek.

  /* ----------------------------
     8️⃣ Snel-toets: C = sessie wissen
  ----------------------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "c") {
      const confirmReset = confirm(
        "Weet je zeker dat je de sessie wilt wissen?"
      );
      if (confirmReset) {
        session.signOut();
        localStorage.removeItem('sms_pro_welcome_shown'); // Reset pro welcome flag
        location.hash = "#/login";
        location.reload(); // volledige herstart
      }
    }
  });
  /* ----------------------------
     9️⃣ Check Price Alerts
  ----------------------------- */
  ensureDataLoaded().then(({ allProducts }) => {
      checkPriceAlerts(allProducts);
  });
});
