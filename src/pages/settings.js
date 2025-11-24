// src/pages/settings.js
import {
  getSettings,
  setFontSizeFactor,
  setAccessibilityFont,
} from "../lib/settings.js";

import { renderTutorialPage } from "../pages/tutorial.js"; // nieuw
import { markTutorialShown } from "../lib/tutorialPopup.js"; // optioneel, om datum te resetten

export function renderSettingsPage(mount) {
  const s = getSettings();

  mount.innerHTML = `
  <div class="page-header"><h1>Instellingen</h1></div>
    <section class="settings">
  

      <div class="card">
        <h2>Tutorial</h2>
        <a class="btn small tutorial-settings" href="#/tutorial">Bekijk tutorial opnieuw</a>
      </div>

      <div class="card">
        <h2>🗑️ Data wissen</h2>
        <p style="opacity:0.8;font-size:0.9rem;margin-bottom:1rem;">
          Verwijder alle opgeslagen data inclusief sessie, favorieten en geschiedenis.
        </p>
        <button id="clear-all-data" class="btn small danger" style="background:#e74c3c;color:#fff;">
          Wis alle data
        </button>
      </div>

      </section>
  `;


  // Tekstgrootte
  const groupSize = mount.querySelector("#font-size-group");
  groupSize?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-f]");
    if (!btn) return;
    const factor = parseFloat(btn.dataset.f);
    setFontSizeFactor(factor);
    groupSize
      .querySelectorAll("button[data-f]")
      .forEach((b) => b.setAttribute("aria-checked", "false"));
    btn.setAttribute("aria-checked", "true");
  });

  // Leesbaar lettertype
  const groupA11y = mount.querySelector("#a11y-font-group");
  groupA11y?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-font]");
    if (!btn) return;
    const mode = btn.dataset.font; // "default" | "dyslexic"
    setAccessibilityFont(mode);
    groupA11y
      .querySelectorAll("button[data-font]")
      .forEach((b) => b.setAttribute("aria-checked", "false"));
    btn.setAttribute("aria-checked", "true");
  });

  // Clear all data button
  const clearBtn = mount.querySelector("#clear-all-data");
  clearBtn?.addEventListener("click", () => {
    const confirmed = confirm(
      "⚠️ Weet je zeker dat je ALLE data wilt wissen?\n\n" +
      "Dit verwijdert:\n" +
      "- Je sessie en login\n" +
      "- Developer-Pro status\n" +
      "- Favorieten\n" +
      "- Boodschappenlijst\n" +
      "- Geschiedenis\n\n" +
      "Deze actie kan niet ongedaan worden gemaakt!"
    );
    
    if (confirmed) {
      // Clear everything
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login
      location.hash = "#/login";
      location.reload();
    }
  });
}
