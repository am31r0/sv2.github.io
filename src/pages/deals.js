// src/pages/deals.js
import { loadJSONOncePerDay } from "../lib/cache.js";

import { normalizeAll } from "../lib/matching.js";
import { escHtml, escAttr, formatPrice, uid, showToast } from "../lib/utils.js";
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  STORE_COLORS,
  STORE_LABEL,
} from "../lib/constants.js";
import { addItem } from "../pages/list.js";
import { showSkeletonOverlay, hideSkeletonOverlay } from "../lib/skeleton.js";
import { toggleFavorite, heartSvg } from "../lib/favorites.js"; // ✅ Import favorites
import { togglePriceAlert, hasAlert, getAlertIcon } from "../lib/priceAlert.js"; // ✅ Import price alerts

const LS_KEY = "sms_list";

/* -------------------------
   Promo helpers
------------------------- */
const maandMap = {
  jan: 0,
  februari: 1,
  feb: 1,
  mrt: 2,
  maart: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  aug: 7,
  sep: 8,
  september: 8,
  okt: 9,
  nov: 10,
  dec: 11,
};
function formatNLDate(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}`;
}
function parseJumboString(s) {
  const m = s?.toLowerCase().match(/(\d{1,2})\s+([a-z]+)/i);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const maand = maandMap[m[2]] ?? null;
  if (maand === null) return null;
  const now = new Date();
  let yyyy = now.getFullYear();
  let candidate = new Date(yyyy, maand, dd);
  if (candidate < now) yyyy += 1;
  return new Date(yyyy, maand, dd);
}
function getPromoEnd(p) {
  if (p.promoEnd) return new Date(p.promoEnd);
  if (p.offerEnd) return new Date(p.offerEnd);
  if (p.promoUntil) return parseJumboString(p.promoUntil);
  return null;
}
function isValidPromo(p) {
  const promo =
    p.promoPrice || p.offerPrice || p.discountedPrice || p.discountPrice;
  if (!promo) return false;
  const base = p.price || 0;
  if (promo >= base || base === 0) return false;

  const now = new Date();
  const end = getPromoEnd(p);
  if (end && !isNaN(end)) {
    const max = new Date();
    max.setFullYear(now.getFullYear() + 2);
    if (end > max) return false;
    if (end.getFullYear() > 2100) return false;
  }
  return true;
}

/* -------------------------
   Lijstweergave (hoofdpagina)
------------------------- */
function renderProductCardList(p) {
  const promoPrice = p.promoPrice || p.offerPrice || p.discountedPrice || null;
  const endDate = getPromoEnd(p);
  const promoEndHtml =
    endDate && !isNaN(endDate)
      ? `<div class="promo-end">Geldig t/m ${formatNLDate(endDate)}</div>`
      : "";

  return `
    <div class="deal-row" data-id="${p.id}" data-store="${p.store}">
      <img class="deal-thumb" decoding="async" width="72" height="72"
           src="${escAttr(p.image || "")}" alt="${escAttr(p.name)}">
      <div class="deal-info">
        <div class="deal-name">${escHtml(p.name)}</div>
        <div class="deal-prices">
          <span class="old">${formatPrice(p.price)}</span>
          <span class="new">${formatPrice(promoPrice)}</span>
        </div>
        ${promoEndHtml}
      </div>
      <button class="btn small add-btn" style="padding:0.3rem 0.55rem;">+</button>
    </div>
  `;
}

/* -------------------------
   🔥 Modal (alle deals)
------------------------- */
function renderProductCard(p) {
  const promoPrice = p.promoPrice || p.offerPrice || p.discountedPrice || null;

  let promoEndHtml = "";
  if (isValidPromo(p)) {
    const endDate = getPromoEnd(p);
    if (endDate && !isNaN(endDate)) {
      promoEndHtml = `<div class="promo-end">Geldig t/m ${formatNLDate(
        endDate
      )}</div>`;
    } else if (p.promoEnd || p.offerEnd || p.promoUntil) {
      promoEndHtml = `<div class="promo-end">Geldig t/m ${escHtml(
        p.promoEnd || p.offerEnd || p.promoUntil
      )}</div>`;
    }
  }

  const infoBtn = p.link
    ? `<button class="info-btn" data-link="${p.link}" title="Bekijk productpagina"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16">
  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
</svg></button>`
    : "";

  return `
    <div class="deal-card promo" data-id="${p.id}" data-store="${p.store}">
      <div class="meta">
        <span class="list-store store-${p.store}">${escHtml(
    p.store
  )}</span> ${infoBtn}
        <div class="price-group">
          <span class="price old">${formatPrice(p.price)}</span>
          <span class="price new">${formatPrice(promoPrice)}</span>
          <span class="ppu">${(p.pricePerUnit ?? 0).toFixed(2)} / ${
    p.unit
  }</span>
        </div>
      </div>
      <span class="promo-badge">Aanbieding</span>
      <img loading="lazy" decoding="async" width="200" height="200"
           src="${p.image || ""}" alt="${escAttr(p.name)}"/>
      <div class="info">
        <div class="name">${escHtml(p.name)}</div>
        ${promoEndHtml}
      </div>
      <div class="actions">
        <button class="btn small add-btn">Toevoegen</button>
        <button class="fav-btn icon-btn" title="Favoriet" style="background:transparent;border:none; vertical-align:middle;padding-top:2px;">${heartSvg(p)}</button>
        <button class="alert-btn icon-btn" title="Prijsalert" style="background:transparent;border:none; vertical-align:middle;padding-top:2px;">${getAlertIcon(hasAlert(p))}</button>
      </div>
    </div>
  `;
}

function showDealsModal(store, products) {
  const modal = document.createElement("div");
  modal.className = "search-modal";
  modal.innerHTML = `
    <div class="search-modal-backdrop"></div>
    <div class="search-modal-panel" role="dialog" aria-modal="true">
      <div class="search-modal-header">
        <h2>${
          store === "ah"
            ? "Albert Heijn"
            : store === "dirk"
            ? "Dirk van den Broek"
            : store === "jumbo"
            ? "Jumbo"
            : store === "aldi"
            ? "Aldi"
            : "Hoogvliet"
        } aanbiedingen</h2>
        <button class="search-modal-close" aria-label="Sluiten">✕</button>
      </div>
      <div class="category-nav"></div>
      <div class="search-results-deals"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const panel = modal.querySelector(".search-modal-panel");
  const backdrop = modal.querySelector(".search-modal-backdrop");
  const btnClose = modal.querySelector(".search-modal-close");
  const resultsBox = modal.querySelector(".search-results-deals");
  const navBox = modal.querySelector(".category-nav");

  resultsBox.style.display = "block";
  resultsBox.style.flexWrap = "unset";

  // Groepeer per categorie
  const grouped = {};
  for (const p of products) {
    const cat = p.unifiedCategory || p.rawCategory || "other";
    (grouped[cat] ||= []).push(p);
  }

  // Nav knoppen
  let navHtml = "";
  for (const cat of CATEGORY_ORDER) {
    if (!grouped[cat]) continue;
    const label = CATEGORY_LABELS[cat] || cat;
    navHtml += `<button class="cat-nav-btn filter-btn" data-target="cat-${cat}">${label}</button>`;
  }
  navBox.innerHTML = `<div class="cat-nav-inner">${navHtml}</div>`;

  // Categorieblokken
  let html = "";
  for (const cat of CATEGORY_ORDER) {
    const list = grouped[cat];
    if (!list) continue;
    html += `
      <div class="category-block" id="cat-${cat}">
        <h3 class="category-header sticky">${CATEGORY_LABELS[cat] || cat}</h3>
        <div class="category-grid">
          ${list.map((p) => renderProductCard(p)).join("")}
        </div>
      </div>
    `;
  }
  resultsBox.innerHTML = html;

  // Smooth scroll
  navBox.querySelectorAll(".cat-nav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetId = e.currentTarget.dataset.target;
      const targetEl = resultsBox.querySelector(`#${targetId}`);
      if (targetEl)
        targetEl.scrollIntoView({ behavior: "auto", block: "start" });
    });
  });

  // Add-to-list in modal
  resultsBox.querySelectorAll(".deal-card").forEach((card) => {
    const addBtn = card.querySelector(".add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = card.dataset.id;
        const chosen =
          products.find(
            (r) =>
              String(r.id) === id ||
              String(r.productId) === id ||
              String(r.sku) === id
          ) || null;
        if (chosen) addItem(chosen);
      });
    }

    // ✅ Favorite button
    const favBtn = card.querySelector(".fav-btn");
    if (favBtn) {
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = card.dataset.id;
        const chosen = products.find(
          (r) =>
            String(r.id) === id ||
            String(r.productId) === id ||
            String(r.sku) === id
        ) || null;
        if (chosen) {
          toggleFavorite(chosen);
          favBtn.innerHTML = heartSvg(chosen);
        }
      });
    }

    // ✅ Price alert button
    const alertBtn = card.querySelector(".alert-btn");
    if (alertBtn) {
      alertBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = card.dataset.id;
        const chosen = products.find(
          (r) =>
            String(r.id) === id ||
            String(r.productId) === id ||
            String(r.sku) === id
        ) || null;
        if (chosen) {
          const isOn = await togglePriceAlert(chosen);
          alertBtn.innerHTML = getAlertIcon(isOn);
        }
      });
    }

    // ✅ Info button
    const infoBtn = card.querySelector(".info-btn");
    if (infoBtn) {
      infoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.open(infoBtn.dataset.link, "_blank");
      });
    }

    // Hele kaart klikbaar (optioneel)
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const chosen =
        products.find(
          (r) =>
            String(r.id) === id ||
            String(r.productId) === id ||
            String(r.sku) === id
        ) || null;
      if (chosen) addItem(chosen);
    });
  });

  // Sluitlogica
  function closeModal() {
    modal.remove();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointerdown", onDocPointerDown, true);
  }
  function onKeyDown(e) {
    if (e.key === "Escape") closeModal();
  }
  function onDocPointerDown(e) {
    if (panel.contains(e.target)) return;
    closeModal();
  }
  btnClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("pointerdown", onDocPointerDown, true);
}

/* -------------------------
   Main render
------------------------- */
export async function renderDealsPage(mount) {

  mount.innerHTML = `
    <section class="deals-page">
      <header class="page-header"><h1>Aanbiedingen</h1></header>
      <div class="deals-container"></div>
    </section>
  `;

  if (!mount) {
    console.error("[deals] renderDealsPage: mount is null");
    return;
  }

  
  const container = mount.querySelector(".deals-container");
  if (!container) {
    console.error("[deals] .deals-container not found in mount");
    return;
  }

  // 2) Hosts zekerstellen (maak ze aan als ze niet bestaan)
  let skeletonHost = container.querySelector(".skeleton-host");
  let storesHost = container.querySelector(".stores-host");
  if (!skeletonHost) {
    skeletonHost = document.createElement("div");
    skeletonHost.className = "skeleton-host";
    container.appendChild(skeletonHost);
  }
  if (!storesHost) {
    storesHost = document.createElement("div");
    storesHost.className = "stores-host";
    container.appendChild(storesHost);
  }

  // 3) Minimal inline skeleton (zonder externe CSS)
  function ensureShimmerKF() {
    if (document.getElementById("skShimmerKF")) return;
    const style = document.createElement("style");
    style.id = "skShimmerKF";
    style.textContent = `
      @keyframes skShimmer {
        0% { background-position-x: 200%; }
        100% { background-position-x: -200%; }
      }
      /* fallback voor als .spinner elders niet gestyled is */
      @keyframes skSpin { 100% { transform: rotate(360deg); } }
      .sk-fallback-spinner {
        width: 28px; height: 28px;
        border: 3px solid #cfcfcf; border-top-color: #7a7a7a;
        border-radius: 50%;
        animation: skSpin .8s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }

  function renderInlineSkeleton(target, cards = 3) {
    if (!target) return;
    ensureShimmerKF();

    // één skeleton-blok (met spinner erin)
    const block = (w = "100%", h = 120, mb = 10) => `
      <div style="
        position:relative;
        width:${w}; height:${h}px; margin-bottom:${mb}px; border-radius:12px;
        background:linear-gradient(90deg,#eee 25%,#f3f3f3 50%,#eee 75%);
        background-size:200% 100%; animation:skShimmer .9s linear infinite;
  
        /* spinner netjes centreren in het blok */
        display:flex; align-items:center; justify-content:center;
      ">
        <!-- Gebruik jouw bestaande .spinner stijl als die er is.
             Zo niet, tonen we een kleine fallback spinner. -->
        <div class="spinner"></div>
        <div class="sk-fallback-spinner" aria-hidden="true"></div>
      </div>
    `;

    // één kaart (drie blokken met elk een spinner)
    const card = () => `
      <div style="
        border-radius:20px; background:var(--card-bg,#fff);
        box-shadow:0 2px 8px rgba(0,0,0,.06);
        padding:70px 12px 50px
        ; width:min(478px,95vw);
        overflow:hidden;
        margin:0 auto 20px auto;
      ">
        ${block("100%", 100, 10)}
        ${block("100%", 100, 6)}
        ${block("100%", 100, 6)}
      </div>
    `;

    // let op: géén extra wrapper erbuiten
    target.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fill,1fr); gap:12px; padding:8px 0;">
        ${Array.from({ length: cards }).map(card).join("")}
      </div>
    `;
    target.setAttribute("aria-busy", "true");

    // Als jouw globale .spinner bestaat: verberg de fallback.
    // (We meten of er CSS op .spinner staat; simpel: als computed width > 0)
    requestAnimationFrame(() => {
      const spinners = target.querySelectorAll(".spinner");
      let hasStyledSpinner = false;
      spinners.forEach((sp) => {
        const cs = getComputedStyle(sp);
        if (parseFloat(cs.width) > 0 || cs.animationName || cs.borderTopColor) {
          hasStyledSpinner = true;
        }
      });
      if (hasStyledSpinner) {
        target
          .querySelectorAll(".sk-fallback-spinner")
          .forEach((el) => (el.style.display = "none"));
      }
    });
  }

  function clearInlineSkeleton(target) {
    if (!target) return;
    target.removeAttribute("aria-busy");
    target.innerHTML = "";
  }

  // 4) Wacht 1 paint, dán skeleton tonen (voorkomt router race)
  await new Promise(requestAnimationFrame);
  renderInlineSkeleton(skeletonHost, 10);


  const [ahRaw, dirkRaw, jumboRaw, aldiRaw, hoogvlietRaw] = await Promise.all([
    loadJSONOncePerDay("ah", "./dev/store_database/ah.json"),
    loadJSONOncePerDay("dirk", "./dev/store_database/dirk.json"),
    loadJSONOncePerDay("jumbo", "./dev/store_database/jumbo.json"),
    loadJSONOncePerDay("aldi", "./dev/store_database/aldi.json"),
    loadJSONOncePerDay("hoogvliet", "./dev/store_database/hoogvliet.json"),
  ]);
  clearInlineSkeleton(container);
  const all = normalizeAll({
    ah: ahRaw,
    dirk: dirkRaw,
    jumbo: jumboRaw,
    aldi: aldiRaw,
    hoogvliet: hoogvlietRaw,
  });
  const stores = ["ah", "jumbo", "dirk", "aldi", "hoogvliet"];

  for (const store of stores) {
    let products = all.filter((p) => p.store === store && isValidPromo(p));
    if (!products.length) continue;

    // Sorteer op grootste korting
    products = products
      .map((p) => ({
        ...p,
        discountPct:
          ((p.price -
            (p.promoPrice || p.offerPrice || p.discountedPrice || p.price)) /
            p.price) *
          100,
      }))
      .sort((a, b) => b.discountPct - a.discountPct);

    const logoSrc =
      store === "ah"
        ? "./icons/ah-logo.webp"
        : store === "jumbo"
        ? "./icons/jumbo-logo-transparent.webp"
        : store === "dirk"
        ? "./icons/dirk-logo-square.webp"
        : store === "aldi"
        ? "./icons/aldi-logo.webp"
        : "./icons/hoogvliet-logo.webp";

    const section = document.createElement("section");
    section.className = "store-deals-list";
    section.innerHTML = `
      <div class="store-header-row" style="border-left: 5px solid ${
        STORE_COLORS[store]
      }">
        <img src="${logoSrc}" class="store-logo" alt="${store}">
        <h2>${STORE_LABEL[store] || store}</h2>
      </div>
      <div class="deal-list">
        ${products.slice(0, 3).map(renderProductCardList).join("")}
      </div>
      <button class="btn show-all">Bekijk folder</button>
    `;
    container.appendChild(section);

    // Add-to-list op hoofdpagina
    section.querySelectorAll(".deal-row").forEach((row) => {
      row.querySelector(".add-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const id = row.dataset.id;
        const chosen = products.find((r) => String(r.id) === id);
        if (chosen) addItem(chosen);
      });
    });
    
    console.log("hide skeleton");

    // Open modal met alle deals per winkel
    section.querySelector(".show-all").addEventListener("click", () => {
      showDealsModal(store, products);
    });
    
   
  }
}
