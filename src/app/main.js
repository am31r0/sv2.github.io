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
import { initSettings } from "../lib/settings.js";
import {
  shouldShowTutorialOnce,
  markTutorialShown,
} from "../lib/tutorialPopup.js";
import { registerClick } from "../lib/adSystem.js";
import { loadLearnedBoosts } from "../lib/matching.js";
import { renderLoginPage } from "../pages/login.js";

const LS_KEY = "sms_user_session";
const mount = document.getElementById("app");

/* ----------------------------
   Session Check
----------------------------- */
function hasSession() {
  try {
    const session = JSON.parse(localStorage.getItem(LS_KEY));

    // Geen sessie → false
    if (!session) return false;

    // Developer mag nooit sessie behouden
    if (session.user === "developer") {
      localStorage.removeItem(LS_KEY);
      if (location.hash !== "#/login") location.hash = "#/login";
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/* ----------------------------
   App Init
----------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // 1️⃣ Settings en cache vóór eerste paint
  initSettings();
  loadLearnedBoosts();

  // 2️⃣ Login check
  if (!hasSession()) {
    renderLoginPage(mount);
    return; // Stop hier — geen router of tutorial
  }

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
    defaultHash: "#/login",
  });

  // 4️⃣ Start flow: tutorial → home
  if (shouldShowTutorialOnce()) {
    // Toon tutorial bij eerste gebruik
    renderTutorialPage(mount);
    markTutorialShown();
  } else {
    // Anders direct naar home
    router.start();
    if (!location.hash || location.hash === "#/tutorial") {
      location.hash = "#/home";
    }
  }

  // 5️⃣ Event listeners
  registerClick();

  document.addEventListener("click", (e) => {
    const target = e.target.closest("button, .product-card, .add-btn, a");
    if (target) registerClick();
  });

  document.addEventListener("touchend", () => {
    document.activeElement?.blur();
  });


  // Swipe functionality for tab switching
  let startX = 0;
  let endX = 0;
  let startY = 0;
  let endY = 0;

  // Touch start event
  document.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  // Touch move event
  document.addEventListener("touchmove", (e) => {
    endX = e.touches[0].clientX;
    endY = e.touches[0].clientY;
  });

  // Touch end event
  document.addEventListener("touchend", (e) => {
    const swipeThreshold = 50; // Minimum swipe distance in pixels
    const swipeThresholdY = 30; // Maximum vertical distance for swipe to count as horizontal

    // Calculate swipe distance
    const diffX = startX - endX;
    const diffY = Math.abs(startY - endY);

    // Only consider it a swipe if it's primarily horizontal and meets threshold
    if (diffY < swipeThresholdY && Math.abs(diffX) > swipeThreshold) {
      e.preventDefault();
      if (diffX > 0) {
        // Swipe left - go to next tab
        navigateToNextTab();
      } else {
        // Swipe right - go to previous tab
        navigateToPreviousTab();
      }
    }
  });

  // Mouse drag functionality
  let isDragging = false;
  let dragStartX = 0;

  document.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    // Optional: Add visual feedback during drag
  });

  document.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;

    const swipeThreshold = 50;
    const diffX = dragStartX - e.clientX;

    if (Math.abs(diffX) > swipeThreshold) {
      e.preventDefault();
      if (diffX > 0) {
        // Drag left - go to next tab
        navigateToNextTab();
      } else {
        // Drag right - go to previous tab
        navigateToPreviousTab();
      }
    }
  });

  // Tab navigation functions
  function navigateToNextTab() {
    const currentHash = location.hash;
    const tabOrder = ["#/home", "#/list", "#/deals", "#/pro", "#/settings"];
    const currentIndex = tabOrder.indexOf(currentHash);
    
    if (currentIndex !== -1 && currentIndex < tabOrder.length - 1) {
      location.hash = tabOrder[currentIndex + 1];
    } else if (currentIndex === tabOrder.length - 1) {
      // Loop back to first tab
      location.hash = tabOrder[0];
    }
  }

  function navigateToPreviousTab() {
    const currentHash = location.hash;
    const tabOrder = ["#/home", "#/list", "#/deals", "#/pro", "#/settings"];
    const currentIndex = tabOrder.indexOf(currentHash);
    
    if (currentIndex !== -1 && currentIndex > 0) {
      location.hash = tabOrder[currentIndex - 1];
    } else if (currentIndex === 0) {
      // Loop back to last tab
      location.hash = tabOrder[tabOrder.length - 1];
    }
  }
});
