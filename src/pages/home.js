import { showNav, formatPrice, uid, showToast } from "../lib/utils.js";
import { loadJSONOncePerDay } from "../lib/cache.js";
import { STORE_COLORS, STORE_LABEL } from "../lib/constants.js";
import { normalizeAH, normalizeJumbo, normalizeDirk } from "../lib/matching.js";

/* ---------------- Storage helpers ---------------- */
const LS_KEY = "sms_list";

function loadList() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveList(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}



/* ---------------- Renderer ---------------- */
export async function renderHomePage(mount) {
  showNav(true);

  mount.innerHTML = `
    <div class="home-header page-header header-logo">
    <img class="logo" src="./icons/schappie-logo.webp">
      <!--<h3 style="font-size:0.6rem;">Beta 0.4.251016.1 (hotfix)</h3>-->
    </div>

    <div class="hero">
      <section class="hero__content">
      <div class="hero-inside">
        <h1>Vind altijd de<br>beste prijs</h1>
        <a href="#/list" class="btn btn--primary white-bg">Start zoeken</a>
        <img src="./images/hero-banner-img_mascotte_01.webp" alt="">
      </div>
    </section>
    </div>
    <div class="home-deals-wrapper">
    <section class="home-deals">
      <div class="home-deals-header">
        <h3 class="home-deals-title" style="text-align:center">Populaire aanbiedingen</h3>
        <button class="home-refresh btn small" style="display:none;">↻ Herlaad</button>
      </div>
      <div class="home-deals-grid"></div>
      <div class="home-deals-empty" style="display:none; text-align:center; color:#fff;">Geen deals gevonden 😕</div>
    </section>
    <a href="#/deals" class="btn small home-deals-btn">Alle aanbiedingen</a>
    </div>
    <section class="home-wist-je">
    <p>Wist je dat je gemiddeld<p class="price new" style="margin-left: 0.5rem">€14,80</p><p>per week bespaart met Schappie?<p>
    </section>



  <div class="schappie-pro-card">
  <div class="pro-content">
    <h2 class="pro-title">Schappie <span class="pro-badge pro-gradient" style="margin-left: 0.3rem; vertical-align: middle;">✨ PRO</span></h2>
    <p class="pro-subtitle">
      Ontvang direct een melding zodra jouw favoriete producten in de aanbieding zijn. 
      Nooit meer te laat voor een deal!
    </p>
    <a href="#/pro" class="pro-btn">Bekijk alle voordelen</a>
  </div>
</div>

  <section class="home-reviews">
    <h3 class="home-reviews-title">Wat anderen zeggen</h3>
    <div class="home-reviews-carousel">
      <div class="home-review-card">
        <div class="home-review-header">
          <div class="home-review-avatar">S</div>
          <div class="home-review-info">
            <div class="home-review-name">Steve <span class="pro-badge pro-gradient">✨ PRO</span></div>
            <div class="home-review-stars">★★★★★</div>
          </div>
        </div>
        <p class="home-review-text">"Snel prijzen vergelijken, duidelijke categorieën en mijn lijstje blijft gewoon bewaard. Scheelt me echt geld bij elke boodschap."</p>
      </div>

      <div class="home-review-card">
        <div class="home-review-header">
          <div class="home-review-avatar">L</div>
          <div class="home-review-info">
            <div class="home-review-name">Lisa</div>
            <div class="home-review-stars">★★★★★</div>
          </div>
        </div>
        <p class="home-review-text">"Eindelijk een app die me helpt om slim boodschappen te doen. Overzichtelijk en makkelijk in gebruik!"</p>
      </div>

      <div class="home-review-card">
        <div class="home-review-header">
          <div class="home-review-avatar">M</div>
          <div class="home-review-info">
            <div class="home-review-name">Mark <span class="pro-badge pro-gradient">✨ PRO</span></div>
            <div class="home-review-stars">★★★★★</div>
          </div>
        </div>
        <p class="home-review-text">"De prijsalerts zijn geweldig! Ik mis geen enkele aanbieding meer van mijn favoriete producten."</p>
      </div>
    </div>
  </section>

  `;

  const grid = mount.querySelector(".home-deals-grid");
  const emptyState = mount.querySelector(".home-deals-empty");

  let retryCount = 0;
  const MAX_RETRIES = 40; // 40 * 0.5s = 20 seconden max

  async function loadDeals() {
    grid.innerHTML = `<p style="opacity:0.6;text-align:center;width:min(500px,100vw)">Laden...</p>`;
    emptyState.style.display = "none";

    const stores = ["ah", "jumbo", "dirk"];

    const results = await Promise.all(
      stores.map(async (store) => {
        try {
          const raw = await loadJSONOncePerDay(
            store,
            `./dev/store_database/${store}.json`
          );

          const arr = Array.isArray(raw) ? raw : raw.data || raw.products || [];
          let normalized = [];
          if (store === "ah") normalized = arr.map(normalizeAH);
          if (store === "jumbo") normalized = arr.map(normalizeJumbo);
          if (store === "dirk") normalized = arr.map(normalizeDirk);

          return { store, data: normalized };
        } catch (err) {
          console.warn(`⚠️ ${store} kon niet geladen worden:`, err);
          return { store, data: [] };
        }
      })
    );

    const popularDeals = results
      .map(({ store, data }) => {
        if (!data.length) return null;

        const promos = data.filter((p) => p.promoPrice && p.price > p.promoPrice);
        let best;
        if (promos.length) {
          best = promos.sort(
            (a, b) =>
              (b.price - b.promoPrice) / b.price -
              (a.price - a.promoPrice) / a.price
          )[0];
        } else {
          best = data[Math.floor(Math.random() * data.length)];
        }

        return {
          store,
          name: best.name,
          oldPrice: best.price,
          newPrice: best.promoPrice || best.price,
          image: best.image,
        };
      })
      .filter(Boolean);

    // ✅ check of er producten zijn
    if (!popularDeals.length && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`🔁 Geen deals gevonden (poging ${retryCount}) — opnieuw proberen...`);
      setTimeout(loadDeals, 500);
      return;
    }

    if (!popularDeals.length) {
      console.warn("❌ Na meerdere pogingen geen deals gevonden.");
      emptyState.style.display = "block";
      grid.innerHTML = "";
      return;
    }

    renderDeals(popularDeals);
  }

  function renderDeals(deals) {
    grid.innerHTML = deals
      .map((deal) => {
        const color = STORE_COLORS[deal.store] || "#ccc";
        const label = STORE_LABEL[deal.store] || deal.store.toUpperCase();

        return `
          <div class="home-deal-card deal-card home-${deal.store}" 
               data-store="${deal.store}" 
               data-name="${deal.name}" 
               data-price="${deal.newPrice}" 
               style="background:var(--surface)">
            <div class="home-deal-header">
              <span class="list-store" style="background:${color}; color:#fff;">${label}</span>
            </div>
            <img src="${deal.image}" alt="${deal.name}">
            <div class="info">
              <p class="home-deal-name name">${deal.name}</p>
            </div>
            <div class="home-deal-prices">
              ${
                deal.oldPrice !== deal.newPrice
                  ? `<span class="price old">${formatPrice(
                      deal.oldPrice
                    )}</span>`
                  : ""
              }
              <span class="price new">${formatPrice(deal.newPrice)}</span>
            </div>
          </div>
        `;
      })
      .join("");

    // ✅ Klik = toevoegen aan lijst
    grid.querySelectorAll(".home-deal-card").forEach((card) => {
      card.addEventListener("click", () => {
        const store = card.dataset.store;
        const name = card.dataset.name;
        const price = parseFloat(card.dataset.price || 0);

        const item = {
          id: uid(),
          name,
          cat: "other", // we hebben hier geen categorie-info
          pack: null,
          qty: 1,
          done: false,
          store,
          price,
          promoPrice: null,
        };

        const list = loadList();
        list.push(item);
        saveList(list);
        document.dispatchEvent(new Event("list:changed"));
        showToast("Toegevoegd aan Mijn Lijst");
      });
    });
  }

  await loadDeals();
}
