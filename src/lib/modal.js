// =============================================
// Modal System (Schappie v2) met loader state
// =============================================

import { escHtml, escAttr, formatPrice } from "./utils.js";
import { registerClick } from "../lib/adSystem.js";
import { STORE_LABEL } from "./constants.js";

// ------------------ Basishandlers ------------------
export function closeAllModals() {
  document.querySelectorAll(".search-modal").forEach((el) => el.remove());
}

// ------------------ Loader Modal ------------------
export function showLoadingModal(queryText = "") {
  closeAllModals();

  const modal = document.createElement("div");
  modal.className = "search-modal";
  modal.innerHTML = `
    <div class="search-modal-backdrop"></div>
    <div class="search-modal-panel" role="dialog" aria-modal="true">
      <div class="search-modal-header">
        <h2>Zoekresultaten</h2>
        <button class="search-modal-close" aria-label="Sluiten">✕</button>
      </div>

      <div class="search-results loading-state" style="height:400px;">
        <div class="modal-loading">
          <div class="spinner"></div>
          <p>Een ogenblik... Wij zoeken in jouw winkels${
            queryText
              ? ` naar<br><strong style="color:green;">${escHtml(
                  queryText
                )}</strong>`
              : ""
          }</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const btnClose = modal.querySelector(".search-modal-close");
  const backdrop = modal.querySelector(".search-modal-backdrop");

  function closeModal() {
    modal.remove();
    document.removeEventListener("keydown", onKeyDown);
  }
  function onKeyDown(e) {
    if (e.key === "Escape") closeModal();
  }

  btnClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", onKeyDown);

  return modal;
}

// ------------------ Result Modal ------------------
export function showSearchModal(results, onSelect) {
  closeAllModals();

  const baseResults = Array.isArray(results) ? results.slice() : [];

  const modal = document.createElement("div");
  modal.className = "search-modal";
  modal.innerHTML = `
    <div class="search-modal-backdrop"></div>
    <div class="search-modal-panel" role="dialog" aria-modal="true">
      <div class="search-modal-header">
        <h2>Producten</h2>
        <button class="search-modal-close" aria-label="Sluiten">✕</button> 
      </div>

      <div class="result-filters">
        <select id="sort-select">
          <option value="ppu">Prijs per eenheid</option>
          <option value="price">Laagste prijs</option>
          <option value="promo">Aanbiedingen</option>
          <option value="alpha">Alfabetisch</option>
        </select>
        <select id="category-filter">
          <option value="">Alle categorieën</option>
          <option value="produce">Groente & fruit</option>
          <option value="dairy">Zuivel</option>
          <option value="meat_fish_veg">Vlees/Vis/Vega</option>
          <option value="bakery">Bakkerij</option>
          <option value="frozen">Diepvries</option>
          <option value="snacks">Snacks</option>
          <option value="pantry">Voorraad/Conserven</option>
        </select>
      </div>

      <div class="extra-filters">
        <button class="filter-btn" data-filter="promoFirst">Aanbieding eerst</button>
        <button class="filter-btn" data-filter="huismerk">Huismerk</button>
        <button class="filter-btn" data-filter="amerk">A-merk</button>
        <button class="filter-btn" data-filter="bio">Bio</button>
        <button class="filter-btn" data-filter="vega">Vega</button>
      </div>

      <div class="search-results"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const panel = modal.querySelector(".search-modal-panel");
  const backdrop = modal.querySelector(".search-modal-backdrop");
  const btnClose = modal.querySelector(".search-modal-close");
  const resultsBox = modal.querySelector(".search-results");
  const sortSelect = modal.querySelector("#sort-select");
  const catSelect = modal.querySelector("#category-filter");
  const extraBtns = modal.querySelectorAll(".extra-filters .filter-btn");

  let currentSort = "ppu";
  let currentCat = "";
  let promoOnly = false;
  let filterMode = "";

  // ------------------ Helper: promo einde ------------------
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
    return `${dd}-${mm}-${yyyy}`;
  }

  function parseJumboString(s) {
    const m = s.toLowerCase().match(/(\d{1,2})\s+([a-z]+)/i);
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
    const promo = p.promoPrice || p.offerPrice;
    if (!promo) return false;
    const base = p.price || 0;
    if (promo >= base) return false;
    const end = getPromoEnd(p);
    if (!end || isNaN(end)) return false;
    const now = new Date();
    const max = new Date();
    max.setFullYear(now.getFullYear() + 2);
    if (end > max || end.getFullYear() > 2100) return false;
    return true;
  }

  // ------------------ Filter + sorteer ------------------
  function getFilteredSorted() {
    let arr = baseResults;

    if (currentCat)
      arr = arr.filter(
        (p) => (p.unifiedCategory || p.rawCategory) === currentCat
      );

    if (promoOnly) arr = arr.filter((p) => !!(p.promoPrice || p.offerPrice));

    if (filterMode === "huismerk") {
      arr = arr.filter((p) => {
        const name = (p.name || "").toLowerCase();
        return (
          name.includes("ah ") ||
          name.includes("dirk") ||
          name.includes("jumbo") ||
          name.includes("aldi") ||
          name.includes("hoogvliet") ||
          name.includes("1 de beste") ||
          name.includes("g'woon")
        );
      });
    } else if (filterMode === "amerk") {
      arr = arr.filter((p) => {
        const name = (p.name || "").toLowerCase();
        return !(
          name.includes("ah ") ||
          name.includes("dirk") ||
          name.includes("jumbo") ||
          name.includes("aldi") ||
          name.includes("hoogvliet") ||
          name.includes("1 de beste") ||
          name.includes("g'woon")
        );
      });
    } else if (filterMode === "bio") {
      arr = arr.filter((p) => {
        const name = (p.name || "").toLowerCase();
        return name.includes("bio") || name.includes("biologisch");
      });
    } else if (filterMode === "vega") {
      arr = arr.filter((p) => {
        const name = (p.name || "").toLowerCase();
        return (
          name.includes("vega") ||
          name.includes("vegan") ||
          name.includes("vegetarisch") ||
          name.includes("vegetarische")
        );
      });
    }

    const sorted = arr.slice();
    if (filterMode === "promoFirst") {
      sorted.sort((a, b) => {
        const aPromo = !!(a.promoPrice || a.offerPrice);
        const bPromo = !!(b.promoPrice || b.offerPrice);
        if (aPromo !== bPromo) return aPromo ? -1 : 1;
        return (a.pricePerUnit ?? Infinity) - (b.pricePerUnit ?? Infinity);
      });
      return sorted;
    }

    if (currentSort === "price") {
      sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else if (currentSort === "alpha") {
      sorted.sort((a, b) =>
        a.name.localeCompare(b.name, "nl", { sensitivity: "base" })
      );
    } else {
      sorted.sort(
        (a, b) => (a.pricePerUnit ?? Infinity) - (b.pricePerUnit ?? Infinity)
      );
    }
    return sorted;
  }

  // ------------------ Render ------------------
  function renderResults() {
    const data = getFilteredSorted();
    if (!data.length) {
      resultsBox.innerHTML = `<div class="empty">Geen resultaten gevonden.</div>`;
      return;
    }

    resultsBox.innerHTML = data
      .map((p) => {
        const hasPromo = !!(p.promoPrice || p.offerPrice);
        const promoPrice = p.promoPrice || p.offerPrice || null;
        const storeLabel = STORE_LABEL[p.store] || p.store;
        const unitStr = p.pricePerUnit
          ? `${formatPrice(p.pricePerUnit)} / ${p.unit || ""}`
          : p.unit
          ? `per ${p.unit}`
          : "";

        let promoEndHtml = "";
        if (hasPromo) {
          const endDate = getPromoEnd(p);
          if (endDate && !isNaN(endDate)) {
            promoEndHtml = `<div class="promo-end">Geldig t/m ${formatNLDate(
              endDate
            )}</div>`;
          } else if (p.promoEnd || p.offerEnd || p.promoUntil) {
            promoEndHtml = `<div class="promo-end">Geldig t/m ${
              p.promoEnd || p.offerEnd || p.promoUntil
            }</div>`;
          }
        }

        // ✅ (i)-knop
        const infoBtn = p.link
          ? `<button class="info-btn" data-link="${p.link}" title="Bekijk productpagina"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16">
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
        </svg></button>`
          : "";

        return `
          <div class="result-row ${hasPromo ? "promo" : ""}" data-id="${
          p.id
        }" data-store="${p.store}">
            <div class="meta">
              <span class="list-store store-${p.store}">${escHtml(storeLabel)}
       </span> ${infoBtn}
              <div class="price-group">
                ${
                  hasPromo
                    ? `<span class="price old">${formatPrice(p.price)}</span>
                       <span class="price new">${formatPrice(
                         promoPrice
                       )}</span>`
                    : `<span class="price">${formatPrice(p.price)}</span>`
                }
                <span class="ppu">${escHtml(unitStr)}</span>
              </div>
            </div>
            ${hasPromo ? `<span class="promo-badge">Aanbieding</span>` : ""}
            <img loading="lazy" src="${p.image || ""}" alt="${escAttr(
          p.name
        )}"/>
            <div class="info">
              <div class="name">${escHtml(p.name)}</div>
              ${
                p.category
                  ? `<div class="category">${escHtml(p.category)}</div>`
                  : ""
              }
              ${promoEndHtml}
              
            </div>
          </div>`;
      })
      .join("");

    // ------------------ Event handlers ------------------
    resultsBox.querySelectorAll(".result-row").forEach((row) => {
      const id = row.dataset.id;
      const store = row.dataset.store;
      const chosen = data.find(
        (r) => String(r.id) === id && String(r.store) === store
      );

      // Selecteer product bij klik op de kaart
      row.addEventListener("click", (e) => {
        // Klik op info-knop → open link
        if (e.target.closest(".info-btn")) return;
        if (chosen) onSelect(chosen);
        closeModal();
        registerClick();
      });

      // (i)-knop click
      const infoBtn = row.querySelector(".info-btn");
      if (infoBtn)
        infoBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          window.open(infoBtn.dataset.link, "_blank");
        });
    });
  }

  renderResults();

  // ------------------ Closing logic ------------------
  function closeModal() {
    modal.remove();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointerdown", onDocPointerDown, true);
    registerClick();
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

  // ------------------ Filter events ------------------
  sortSelect.addEventListener("change", (e) => {
    const v = e.target.value;
    if (v === "promo") {
      promoOnly = true;
      currentSort = "ppu";
    } else {
      promoOnly = false;
      currentSort = v;
    }
    filterMode = "";
    extraBtns.forEach((b) => b.classList.remove("active"));
    renderResults();
    registerClick();
  });

  catSelect.addEventListener("change", (e) => {
    currentCat = e.target.value || "";
    renderResults();
    registerClick();
  });

  extraBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (filterMode === btn.dataset.filter) {
        filterMode = "";
        btn.classList.remove("active");
      } else {
        filterMode = btn.dataset.filter;
        extraBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
      renderResults();
      registerClick();
    })
  );
}
