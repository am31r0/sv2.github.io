// =============================================
// Tutorial Page (Schappie v2 - stabiele versie)
// =============================================

import { markTutorialShown } from "../lib/tutorialPopup.js";
import { showNav } from "../lib/utils.js"; // om nav te verbergen/tonen
import { renderStoreSelector } from "../lib/storeSelector.js"; // ✅ Import store selector

export function renderTutorialPage(mount) {
  showNav(false); // nav verbergen zolang tutorial actief is

  mount.innerHTML = `
    <div class="tutorial-overlay">
      <div class="tutorial-wrapper">
        <div class="tutorial-pages">
          <div class="tutorial-page active">
            <div class="tutorial-welcome">Welkom bij</div>
            <img src="./icons/schappie-logo.webp" class="logo">
            <p class="welkom">
              Vergelijk prijzen van <strong>jouw favoriete supermarkten</strong> in één overzicht en <orange>bespaar tot wel €60 per maand!</orange>
            </p>
            <button class="tutorial-next btn small hidden">Laten we beginnen →</button>
          </div>

          <div class="tutorial-page">
            <div class="tutorial-step-number">Stap 1</div>
            <h2>Kies jouw winkels</h2>
            <p>
              Selecteer de supermarkten<br>bij jou in de buurt
            </p>
            <div class="tutorial-store-selector-mount"></div>
            <p class="tutorial-tip">💡 Tip:<br>Selecteer alleen 1 winkel als je maar naar 1 winkel zoekt</p>
            <button class="tutorial-next btn small hidden">Volgende →</button>
          </div>

          <div class="tutorial-page">
            <div class="tutorial-step-number">Stap 2</div>
            <h2>Zo werkt het</h2>
            <p>
              Kies uit de categorieën<br>of typ direct in de zoekbalk
            </p>
            <img src="./images/tutorial_zoekbalk_02.webp" class="tutorial-img tutorial-zoekbalk">
            <p class="tutorial-tip">💡 Tip:<br>Begin met typen en krijg direct suggesties</p>
            <button class="tutorial-next btn small hidden">Volgende →</button>
          </div>

          <div class="tutorial-page">
            <div class="tutorial-step-number">Stap 3</div>
            <h2>Gebruik filters</h2>
            <p>
              Filter op prijs, eenheden of categorieën om sneller te vinden wat je zoekt
            </p>
            <img src="./images/tutorial_modalfilter_02.webp" class="tutorial-img tutorial-modalfilter">
            <button class="tutorial-next btn small hidden">Volgende →</button>
          </div>

          <div class="tutorial-page">
            <div class="tutorial-step-number">Stap 4</div>
            <h2>Streep af tijdens het winkelen</h2>
            <p>
              Klik op een product om het af te vinken terwijl je boodschappen doet
            </p>
            <img src="./images/tutorial_doorstrepen.webp" class="tutorial-img tutorial-doorstrepen">
            <button class="tutorial-next btn small hidden">Volgende →</button>
          </div>

          <div class="tutorial-page">
            <div class="tutorial-emoji">🎉</div>
            <h2>Klaar om te besparen!</h2>
            <p>
              Je kunt deze tutorial altijd terugvinden via<br>
              <strong>Instellingen → Tutorial</strong>
            </p>
            
            <div class="tutorial-pro-section">
              <div class="tutorial-pro-badge">
                <span class="pro-badge pro-gradient">✨ PRO</span>
              </div>
              <p class="tutorial-pro-text">
                Met <strong>Schappie Pro</strong> kun je ook favoriete producten opslaan en <orange>meteen een melding krijgen</orange> als het in de aanbieding komt!
              </p>
            
            </div>

            <button class="tutorial-finish btn small hidden">Start met besparen! 🚀</button>
          </div>
        </div>

        <div class="tutorial-pagination"></div>
      </div>
    </div>
  `;

  const pages = mount.querySelectorAll(".tutorial-page");
  const pagination = mount.querySelector(".tutorial-pagination");
  const nextBtns = mount.querySelectorAll(".tutorial-next");
  const finishBtn = mount.querySelector(".tutorial-finish");

  // ✅ Render store selector in step 1
  const storeSelectorMount = mount.querySelector(".tutorial-store-selector-mount");
  if (storeSelectorMount) {
    renderStoreSelector(storeSelectorMount);
  }

  let current = 0;
  let showTimer = null;

  // === Pagination bolletjes ===
  pages.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "dot" + (i === 0 ? " active" : "");
    pagination.appendChild(dot);
  });
  const dots = pagination.querySelectorAll(".dot");

  function showButtonDelayed(pageIndex) {
    const btn =
      pages[pageIndex].querySelector(".tutorial-next") ||
      pages[pageIndex].querySelector(".tutorial-finish");

    if (!btn) return;
    btn.classList.add("hidden");

    clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      btn.classList.remove("hidden");
    }, 2200);
  }

  function goToPage(n) {
    clearTimeout(showTimer);

    pages[current].classList.remove("active");
    dots[current].classList.remove("active");

    current = Math.max(0, Math.min(pages.length - 1, n));

    pages[current].classList.add("active");
    dots[current].classList.add("active");

    showButtonDelayed(current);
  }

  // Init: start delay voor eerste pagina
  showButtonDelayed(current);

  // === Navigatie voor "Volgende" knoppen ===
  nextBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (current < pages.length - 1) goToPage(current + 1);
    })
  );

  // === Veiliger Finish handler ===
  function safeFinish() {
    try {
      if (!sessionStorage.getItem("tutorialFromSettings")) {
        markTutorialShown();
      } else {
        sessionStorage.removeItem("tutorialFromSettings");
      }
    } catch (e) {
      console.warn("⚠️ Kon tutorial status niet opslaan:", e);
    }

    // Zoek zowel in mount als in body
    const overlay =
      mount.querySelector(".tutorial-overlay") ||
      document.querySelector(".tutorial-overlay");

    if (overlay) overlay.remove();

    // wis de hele mount voor zekerheid
    mount.innerHTML = "";
    showNav(true);

    // kleine vertraging om race conditions te voorkomen
    setTimeout(() => {
      window.location.hash = "#/home";
    }, 150);
  }
  

  // --- Zorg dat finishBtn altijd reageert zodra zichtbaar ---
  function enableFinishWhenReady() {
    const check = setInterval(() => {
      if (!document.body.contains(finishBtn)) {
        clearInterval(check);
        return;
      }
      const isVisible = !finishBtn.classList.contains("hidden");
      if (isVisible) {
        finishBtn.onclick = safeFinish;
        clearInterval(check);
      }
    }, 200);
  }

  // standaard fallback listener
  finishBtn.addEventListener("click", () => {
    if (!finishBtn.classList.contains("hidden")) {
      safeFinish();
    }
  });

  // --- Observeer laatste pagina ---
  const observer = new MutationObserver(() => {
    const isLastActive =
      pages[current] === pages[pages.length - 1] &&
      pages[current].classList.contains("active");
    if (isLastActive) enableFinishWhenReady();
  });
  observer.observe(pages[pages.length - 1], {
    attributes: true,
    attributeFilter: ["class"],
  });

  // === Dev hack: sluit tutorial met 'Z' key ===
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "z") {
      const overlay = document.querySelector(".tutorial-overlay");
      if (overlay) {
        overlay.remove();
        showNav(true);
        console.log("⛔ Tutorial geforceerd gesloten via 'Z' key");
      }
    }
  });
}
