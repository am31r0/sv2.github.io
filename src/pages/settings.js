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
        <h2>Tekstgrootte</h2>
        <div class="row" id="font-size-group" role="radiogroup" aria-label="Tekstgrootte">
          <button class="btn" data-f="0.9" aria-checked="${
            s.fontSizeFactor === 0.9
          }">Standaard (aanbevolen)</button>
          <button class="btn" data-f="1.2" aria-checked="${
            s.fontSizeFactor === 1.2
          }">Groot</button>
        </div>
        
      </div>

      <div class="card">
        <h2>Lettertype</h2>
        <div class="row" id="a11y-font-group" role="radiogroup" aria-label="Lettertype">
          <button class="btn" data-font="default" aria-checked="${
            s.accessibilityFont !== "dyslexic"
          }">Standaard (aanbevolen)</button>
          <button style="font-family: 'Open-Dyslexic';" class="btn" data-font="dyslexic" aria-checked="${
            s.accessibilityFont === "dyslexic"
          }">Dyslexic</button>
        </div>
      </div>


      <div class="card">
        <h2>Tutorial</h2>
        <a class="btn small tutorial-settings" href="#/tutorial">Bekijk tutorial opnieuw</a>
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
}
