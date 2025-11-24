// src/pages/pro.js
import {
  loadHistory,
  deleteHistoryItem,
  renderHistoryModal,
  refreshItemsWithCurrentPrices,
} from "../lib/history.js";
import { showToast, formatPrice } from "../lib/utils.js";
import { STORE_LABEL, STORE_COLORS } from "../lib/constants.js";
import { session } from "../lib/session.js";

const MAX_FREE_ITEMS = 3; // Free users can see first 3 items

const PRO_ICONS = {
  heart: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/></svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/></svg>`,
  history: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16"><path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.433l-.707-.708z"/><path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"/><path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7.5 8.5V3z"/></svg>`,
  save: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16"><path d="M11 2H9v3h2z"/><path d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0M1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v4.5A1.5 1.5 0 0 1 11.5 7h-7A1.5 1.5 0 0 1 3 5.5V1H1.5a.5.5 0 0 0-.5.5m3 4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V1H4zM3 15h10v-4.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5z"/></svg>`
};

export function renderProPage(mount) {
  const isPro = session.hasPro(); // Only check hasPro, not isDev
  
  // DEBUG: Log session state with detailed info
  const sessionData = JSON.parse(localStorage.getItem('sms_user_session_v2') || '{}');
  console.log('🔍 Pro Page Debug:', {
    isPro,
    isDev: session.isDev(),
    user: session.getUser(),
    sessionData,
    pro_until: sessionData.pro_until,
    pro_until_date: sessionData.pro_until ? new Date(sessionData.pro_until) : null,
    current_date: new Date(),
    is_future: sessionData.pro_until ? new Date(sessionData.pro_until) > new Date() : false
  });
  
  // FORCE CHECK: If you see this and isPro is true but pro_until is null, there's a bug!
  if (isPro && !sessionData.pro_until) {
    console.error('❌ BUG: isPro is true but pro_until is null!');
  }
  
  // Check if this is first time seeing pro page after activation
  const showWelcome = localStorage.getItem('sms_pro_welcome_shown') !== 'true' && isPro;
  if (showWelcome) {
    localStorage.setItem('sms_pro_welcome_shown', 'true');
  }

  // -------------------------
  // Pro Page Layout
  // -------------------------
  
  // For non-pro users, show upgrade page directly with Apple glassmorphism style
  if (!isPro) {
    mount.innerHTML = `
      <section class="pro">
        <div class="non-pro-container">
          <h2 class="non-pro-title">
            Upgrade naar<br><strong>Schappie Pro</strong>
          </h2>
          <p class="non-pro-subtitle">
            Ontgrendel alle premium functies en<br>bespaar nog meer op je boodschappen!
          </p>
          
          <div class="non-pro-features">
            <div class="non-pro-feature">
              <div class="non-pro-feature-icon icon-red">${PRO_ICONS.heart}</div>
              <div class="non-pro-feature-title">Favorieten</div>
              <div class="non-pro-feature-desc">Sla al je favoriete producten op</div>
            </div>
            
            <div class="non-pro-feature">
              <div class="non-pro-feature-icon icon-yellow">${PRO_ICONS.bell}</div>
              <div class="non-pro-feature-title">Prijsalerts</div>
              <div class="non-pro-feature-desc">Krijg meldingen bij prijsdalingen</div>
            </div>
            
            <div class="non-pro-feature">
              <div class="non-pro-feature-icon icon-blue">${PRO_ICONS.history}</div>
              <div class="non-pro-feature-title">Volledige Geschiedenis</div>
              <div class="non-pro-feature-desc">Toegang tot al je lijsten</div>
            </div>
            
            <div class="non-pro-feature">
              <div class="non-pro-feature-icon icon-green">${PRO_ICONS.save}</div>
              <div class="non-pro-feature-title">Lijsten Opslaan</div>
              <div class="non-pro-feature-desc">Bewaar al je boodschappenlijsten</div>
            </div>
          </div>
          
          <div class="non-pro-pricing">
            <div class="non-pro-pricing-label">eerste maand</div>
            <div class="non-pro-pricing-amount">€0,99</div>
            <div class="non-pro-pricing-after">daarna €2,99/maand</div>
            <button class="btn-subscribe">ABONNEER NU</button>
          </div>
          
          <details class="non-pro-code-section">
            <summary class="non-pro-code-summary">Heb je een activeringscode? 🎟️</summary>
            <div class="non-pro-code-content">
              <input id="pro-code-input" class="non-pro-code-input" placeholder="Voer code in">
              <button id="activate-code-btn" class="non-pro-code-btn">Activeer Code</button>
            </div>
          </details>
        </div>
      </section>
    `;
    
    // Subscribe button handler
    mount.querySelector('.btn-subscribe')?.addEventListener('click', () => {
      showToast('🚀 Abonnement binnenkort beschikbaar! Gebruik nu een code.');
    });
    
    // Code activation handler
    mount.querySelector('#activate-code-btn')?.addEventListener('click', () => {
      const code = mount.querySelector('#pro-code-input').value.trim().toUpperCase();
      if (code === "BOMBOCLAT") {
        const newSession = {
          uid: session.getUser() || "guest",
          email: session.getUser() || "guest@schappie",
          roles: ["user"],
          pro_until: new Date(Date.now() + 7 * 864e5).toISOString(),
          exp: Math.floor(Date.now() / 1000) + 7 * 86400,
        };
        session.signIn(newSession);
        
        // Reset welcome message flag so it shows again
        localStorage.removeItem('sms_pro_welcome_shown');
        
        showToast("✅ Pro geactiveerd voor 7 dagen!");
        location.reload();
      } else {
        showToast("❌ Ongeldige code");
      }
    });
    
    return; // Don't render cards for non-pro users
  }
  
  // For pro users, show the normal cards
  mount.innerHTML = `
    <section class="pro">
      <header class="page-header">
        <h1>Schappie ${isPro ? '<span class="pro-badge pro-gradient">✨ PRO</span>' : ''}</h1>
      </header>
      
      ${showWelcome ? renderWelcomeMessage() : ''}
      
      <!-- FAVORIETEN -->
      <div class="card favorites-card-block" style="margin-bottom:1rem;">
        <div class="card-header">
          <h2 class="icon-red">Favorieten ${PRO_ICONS.heart}</h2>
        </div>
        <div class="card-body">
          <div class="favorites-container"></div>
        </div>
      </div>

      <!-- PRIJSALERTS -->
      <div class="card alerts-card-block" style="margin-bottom:1rem;">
        <div class="card-header">
          <h2 class="icon-yellow">Prijsalerts ${PRO_ICONS.bell}</h2>
        </div>
        <div class="card-body">
          <div class="alerts-container"></div>
        </div>
      </div>

      <!-- GESCHIEDENIS -->
      <div class="card history-card-block">
        <div class="card-header">
          <h2 class="icon-blue">Geschiedenis ${PRO_ICONS.history}</h2>
        </div>
        <div class="card-body">
          <div class="history-container"></div>
          <div class="pagination-controls" style="text-align:center; margin-top:1rem;"></div>
        </div>
      </div>
    </section>
  `;

  // Render favorites and history with pro limits
  const favContainer = mount.querySelector(".favorites-container");
  const alertsContainer = mount.querySelector(".alerts-container");
  const histContainer = mount.querySelector(".history-container");
  const pagination = mount.querySelector(".pagination-controls");

  renderFavorites(favContainer, isPro);
  renderPriceAlerts(alertsContainer, isPro);
  renderHistory(histContainer, pagination, isPro);
}

// ... (renderWelcomeMessage and showProModal remain unchanged)

/* =======================
   PRIJSALERTS
   ======================= */


function renderPriceAlerts(container, isPro) {
  if (!isPro) {
      // If not pro, the card might not even be visible or we show upgrade prompt
      // But since we handle non-pro layout separately at the top of renderProPage, 
      // this function is likely only called for Pro users or if we change the logic.
      // For now, let's assume if we are here, we are Pro or checking logic.
      // Actually, the non-pro layout replaces the whole innerHTML, so this won't be called for non-pro.
      return;
  }

  const alerts = loadAlerts();
  container.innerHTML = "";

  if (!alerts.length) {
    container.innerHTML = `<p class="empty" style="opacity:0.7;">Nog geen prijsalerts ingesteld.</p>`;
    return;
  }

  const listWrapper = document.createElement("div");
  listWrapper.className = "alerts-list-wrapper pro-feature-wrapper";
  
  // Initially show only first 6
  const visibleAlerts = alerts.slice(0, 6);
  const hiddenAlerts = alerts.slice(6);

  const createAlertCard = (alert) => {
    const card = document.createElement("div");
    card.className = "alert-card glass-panel";
    Object.assign(card.style, {
      padding: "10px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      position: "relative",
      gap: "0.5rem",
      width:"100%"
    });

    // Image
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = alert.image || "https://placehold.co/100x100?text=No+Image";
    img.alt = alert.name;
    Object.assign(img.style, {
      width: "min(100%, 67px)",
      height: "auto",
      objectFit: "contain",
      borderRadius: "10px",
      background: "#fff",
      padding: "0px"
    });

    // Name (clamped to 3 lines)
    const name = document.createElement("div");
    name.textContent = alert.name;
    Object.assign(name.style, {
      fontSize: "0.7rem",
      fontWeight: "500",
      display: "-webkit-box",
      webkitLineClamp: "3",
      webkitBoxOrient: "vertical",
      overflow: "hidden",
      lineHeight: "1.2",
      height: "2.75rem" 
    });

    // Store badge
    const storeBadge = document.createElement("span");
    storeBadge.className = `list-store store-${alert.store}`;
    storeBadge.textContent = STORE_LABEL[alert.store] || alert.store;
    storeBadge.style.fontSize = "0.5rem";

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.innerHTML = "✕";
    delBtn.title = "Verwijder alert";
    Object.assign(delBtn.style, {
      position: "absolute",
      top: "-5px",
      right: "-5px",
      background: "#ff3b30",
      color: "#fff",
      border: "none",
      borderRadius: "50%",
      width: "20px",
      height: "20px",
      fontSize: "0.7rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
    });

    delBtn.addEventListener("click", async () => {
        // Reconstruct a dummy product object to use togglePriceAlert
        const dummyProduct = { name: alert.name, store: alert.store };
        await togglePriceAlert(dummyProduct);
        renderPriceAlerts(container, isPro); // Re-render alerts
        
        // Also re-render favorites to update the bell icon there
        const favContainer = document.querySelector(".favorites-container");
        if (favContainer) {
            renderFavorites(favContainer, isPro);
        }
    });

    card.appendChild(delBtn);
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(storeBadge);
    return card;
  };

  // Render ALL alerts to DOM
  alerts.forEach((alert, idx) => {
      const card = createAlertCard(alert);
      // Hide alerts after the first 6 initially
      if (idx >= 6) {
          card.style.display = "none";
      }
      listWrapper.appendChild(card);
  });

  container.appendChild(listWrapper);

  // If more than 6, add toggle button for show more / less
  if (alerts.length > 6) {
      const allCards = listWrapper.querySelectorAll('.alert-card');
      let isExpanded = false;
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn small";
      Object.assign(toggleBtn.style, {
          display: "block",
          margin: "1rem auto 0",
          width: "fit-content"
      });

      const updateState = () => {
          if (isExpanded) {
              // Show all alerts with scrolling
              allCards.forEach(card => card.style.display = "flex");
              Object.assign(listWrapper.style, {
                  maxHeight: "460px",
                paddingRight: "20px",
                paddingTop: "10px",
                overflowY: "auto"
              });
              toggleBtn.textContent = "Toon minder";
          } else {
              // Show only first 6 alerts
              allCards.forEach((card, idx) => {
                  if (idx >= 6) card.style.display = "none";
                  else card.style.display = "flex";
              });
              Object.assign(listWrapper.style, {
                  maxHeight: "",
                  paddingRight: "",
                  overflowY: ""
              });
              toggleBtn.textContent = `Toon meer (${alerts.length - 6})`;
          }
      };

      // Initial state
      updateState();

      toggleBtn.addEventListener("click", () => {
          isExpanded = !isExpanded;
          updateState();
      });

      container.appendChild(toggleBtn);
  }
}

// Apple-style glassmorphism welcome message
function renderWelcomeMessage() {
  return `
    <div class="pro-welcome-glass" style="
      max-width: min(420px, 95vw);
      margin: 0 auto 2rem;
      padding: 2rem 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      text-align: center;
      color: #fff;
      animation: slideInGlass 0.6s ease-out;
    ">
      <h2 style="
        font-family: 'Clash Display', sans-serif;
        font-size: 1.8rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
        line-height:1.4rem;
        color: #fff;
      ">Bedankt voor je steun!</h2>
      <p style="
        font-size: 1rem;
        opacity: 0.95;
        line-height: 1.6;
        margin-bottom: 1.5rem;
      ">
        Je hebt nu toegang tot alle premium functies van Schappie Pro.
      </p>
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-top: 1.5rem;
      ">
        <div style="
          background: rgba(255, 255, 255, 0.15);
          padding: 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div class="icon-red" style="font-size: 1.5rem; margin-bottom: 0.25rem;">${PRO_ICONS.heart}</div>
          <div style="font-size: 0.85rem; font-weight: 500;">Favorieten</div>
        </div>
        <div style="
          background: rgba(255, 255, 255, 0.15);
          padding: 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div class="icon-yellow" style="font-size: 1.5rem; margin-bottom: 0.25rem;">${PRO_ICONS.bell}</div>
          <div style="font-size: 0.85rem; font-weight: 500;">Prijsalerts</div>
        </div>
        <div style="
          background: rgba(255, 255, 255, 0.15);
          padding: 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div class="icon-blue" style="font-size: 1.5rem; margin-bottom: 0.25rem;">${PRO_ICONS.history}</div>
          <div style="font-size: 0.85rem; font-weight: 500;">Geschiedenis</div>
        </div>
        <div style="
          background: rgba(255, 255, 255, 0.15);
          padding: 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div class="icon-green" style="font-size: 1.5rem; margin-bottom: 0.25rem;">${PRO_ICONS.save}</div>
          <div style="font-size: 0.85rem; font-weight: 500;">Opslaan</div>
        </div>
      </div>
    </div>
  `;
}


// Show pro upgrade modal
function showProModal() {
  const modal = document.createElement('div');
  modal.className = 'pro-modal';
  modal.innerHTML = `
    <div class="pro-modal-content">
      <button class="modal-close">×</button>
      <h2>✨ Upgrade to Schappie Pro</h2>
      
      <div class="pro-features">
        <div class="pro-feature">
          <span class="icon">${PRO_ICONS.heart}</span>
          <h3>Unlimited Favorites</h3>
          <p>Save all your favorite products</p>
        </div>
        
        <div class="pro-feature">
          <span class="icon">${PRO_ICONS.bell}</span>
          <h3>Price Alerts</h3>
          <p>Get notified when prices drop</p>
        </div>
        
        <div class="pro-feature">
          <span class="icon">${PRO_ICONS.history}</span>
          <h3>Full History</h3>
          <p>Access all your shopping lists</p>
        </div>
        
        <div class="pro-feature">
          <span class="icon">${PRO_ICONS.save}</span>
          <h3>Save Lists</h3>
          <p>Keep your lists forever</p>
        </div>
      </div>
      
      <div class="pro-pricing">
        <div class="price">€4.99/month</div>
        <button class="btn-subscribe">Start Free Trial</button>
        <p class="trial-note">7 days free, then €4.99/month</p>
      </div>
      
      <div class="pro-code-section">
        <details>
          <summary>Have a code?</summary>
          <input id="pro-code-modal-input" placeholder="Enter activation code">
          <button id="activate-code-modal">Activate</button>
        </details>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Subscribe button (placeholder)
  modal.querySelector('.btn-subscribe').addEventListener('click', () => {
    showToast('🚀 Subscription coming soon! Use a code for now.');
  });
  
  // Code activation
  modal.querySelector('#activate-code-modal').addEventListener('click', () => {
    const code = modal.querySelector('#pro-code-modal-input').value.trim().toUpperCase();
    if (code === "BOMBOCLAT") {
      const newSession = {
        uid: session.getUser() || "guest",
        email: session.getUser() || "guest@schappie",
        roles: ["user"],
        pro_until: new Date(Date.now() + 7 * 864e5).toISOString(),
        exp: Math.floor(Date.now() / 1000) + 7 * 86400,
      };
      session.signIn(newSession);
      
      // Reset welcome message flag so it shows again
      localStorage.removeItem('sms_pro_welcome_shown');
      
      showToast("✅ Pro activated for 7 days!");
      modal.remove();
      location.reload();
    } else {
      showToast("❌ Invalid code");
    }
  });
}

import { loadFavorites, saveFavorites, toggleFavorite, removeFavorite } from "../lib/favorites.js";
import { togglePriceAlert, hasAlert, getAlertIcon, loadAlerts } from "../lib/priceAlert.js";

/* =======================
   FAVORIETEN
   ======================= */
// loadFavorites and saveFavorites are now imported from ../lib/favorites.js

function addToList(fav) {
  const list = JSON.parse(localStorage.getItem("sms_list") || "[]");
  const exists = list.find(
    (i) =>
      i.name.toLowerCase() === fav.name.toLowerCase() && i.store === fav.store
  );
  if (exists) {
    showToast("Staat al in jouw lijst 🛒");
    return;
  }
  list.push({
    id: fav.id || crypto.randomUUID(),
    name: fav.name,
    store: fav.store,
    price: fav.price,
    promoPrice: fav.promoPrice,
    qty: 1,
    done: false,
  });
  localStorage.setItem("sms_list", JSON.stringify(list));
  window.dispatchEvent(new Event("storage"));
  showToast(`${fav.name} toegevoegd aan jouw lijst 🛒`);
}

function renderFavorites(container, isPro) {
  console.log('📊 renderFavorites called with isPro:', isPro);
  
  const favs = loadFavorites();
  container.innerHTML = "";

  if (!favs.length) {
    if (!isPro) {
      // Show upgrade prompt for non-pro users
      container.innerHTML = `
        <div class="pro-blur-overlay" style="margin-top:0;padding-top:2rem;">
          <div class="lock-icon">🔒</div>
          <h3>Unlock Favorieten</h3>
          <p>Sla je favoriete producten op en krijg meldingen bij prijsdalingen</p>
          <button class="btn-upgrade">Upgrade to Pro</button>
        </div>
      `;
      container.querySelector(".btn-upgrade").addEventListener("click", showProModal);
    } else {
      container.innerHTML = `<p class="empty" style="opacity:0.7;">Nog geen favorieten.</p>`;
    }
    return;
  }

  // Show limited items for free users
  const itemsToShow = isPro ? favs : favs.slice(0, MAX_FREE_ITEMS);
  const hasMore = favs.length > MAX_FREE_ITEMS;
  
  console.log('📊 Favorites:', {
    total: favs.length,
    showing: itemsToShow.length,
    hasMore,
    willShowOverlay: !isPro && hasMore
  });

  const listWrapper = document.createElement("div");
  listWrapper.className = "favorites-list-wrapper pro-feature-wrapper";

  itemsToShow.forEach((f) => {
    const row = document.createElement("div");
    row.className = "fav-row";
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid var(--border-line-muted)",
      padding: "0.4rem 0",
    });

    const left = document.createElement("div");
    left.className = "fav-left";
    left.innerHTML = `
      <div style="font-size:0.9rem; font-weight:500; color:var(--ink); line-height:1.3;">
        ${f.name}
      </div>
      <div style="font-size:0.75rem; opacity:0.75; display:flex; align-items:center; gap:0.3rem; margin-top:2px;">
        <span class="list-store store-${f.store}" 
              style="border-radius:999px;padding:1px 8px;font-size:0.6rem;font-weight:600;">
          ${STORE_LABEL[f.store] || f.store}
        </span>
        ${
          f.promoPrice
            ? `<span class="promo-pill" style="background:#ff3b30;color:#fff;border-radius:99px;padding:0 6px;font-size:0.5rem;">KORTING</span>
             <span style="text-decoration:line-through;opacity:0.6;">${formatPrice(f.price)}</span>
             <strong class="price new">${formatPrice(f.promoPrice)}</strong>`
            : f.price
            ? `<span style="font-weight:600;">${formatPrice(f.price)}</span>`
            : ""
        }
      </div>
    `;

    const right = document.createElement("div");
    right.className = "fav-right";
    Object.assign(right.style, {
      display: "flex",
      alignItems: "center",
      gap: "0.35rem",
    });

    right.innerHTML = `
    <button class="icon-btn fav-alert" title="Prijsalert"
    style="background:#f0f0f0x;border:none;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">${getAlertIcon(hasAlert(f))}</button>
    <button class="icon-btn fav-add" title="Toevoegen aan lijst" 
      style="background:#24af5e;border:none;border-radius:50%;color:#fff;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">+</button>
      <button class="icon-btn fav-del" title="Verwijderen"
        style="background:#f00;border:none;border-radius:50%;color:#fff;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">✕</button>
    `;

    right.querySelector(".fav-add").addEventListener("click", () => addToList(f));
    right.querySelector(".fav-alert").addEventListener("click", async (e) => {
       const isOn = await togglePriceAlert(f);
       e.currentTarget.innerHTML = getAlertIcon(isOn);
       // Update the alerts section immediately
       const alertsContainer = document.querySelector(".alerts-container");
       if (alertsContainer) {
         renderPriceAlerts(alertsContainer, isPro);
       }
    });
    right.querySelector(".fav-del").addEventListener("click", () => {
      removeFavorite(f); // This removes it
      renderFavorites(container, isPro);
    });

    row.appendChild(left);
    row.appendChild(right);
    listWrapper.appendChild(row);
  });

  container.appendChild(listWrapper);

  // If Pro and more than 4 items, handle "Show More" logic
  if (isPro && favs.length > 4) {
      const allRows = listWrapper.querySelectorAll('.fav-row');
      let isExpanded = false;
      
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn small";
      Object.assign(toggleBtn.style, {
          display: "block",
          margin: "1rem auto 0",
          width: "fit-content"
      });

      const updateState = () => {
          if (isExpanded) {
              // Show all
              allRows.forEach(row => row.style.display = 'flex');
            Object.assign(listWrapper.style, {
              maxHeight: "460px",
              paddingRight: "10px",
              overflowY: "auto",
              display: "block"
            });
              toggleBtn.textContent = "Toon minder";
          } else {
              // Hide > 4
              allRows.forEach((row, index) => {
                  if (index >= 4) row.style.display = 'none';
                  else row.style.display = 'flex';
              });
              Object.assign(listWrapper.style, {
                  maxHeight: "", 
                  overflowY: "",
                  display: ""
              });
              toggleBtn.textContent = `Toon meer (${favs.length - 4})`;
          }
      };

      // Initial state
      updateState();

      toggleBtn.addEventListener("click", () => {
          isExpanded = !isExpanded;
          updateState();
      });

      container.appendChild(toggleBtn);
  }

  // Show upgrade prompt for free users
  if (!isPro && hasMore) {
    const overlay = document.createElement("div");
    overlay.className = "pro-blur-overlay";
    overlay.innerHTML = `
      <div class="lock-icon">🔒</div>
      <h3>Unlock ${favs.length - MAX_FREE_ITEMS} more favorites</h3>
      <p>Upgrade to Pro for unlimited favorites</p>
      <button class="btn-upgrade">Upgrade to Pro</button>
    `;
    overlay.querySelector(".btn-upgrade").addEventListener("click", showProModal);
    container.appendChild(overlay);
  }
}

/* =======================
   GESCHIEDENIS
   ======================= */
function renderHistory(container, pagination, isPro) {
  console.log('📜 renderHistory called with isPro:', isPro);
  
  const history = loadHistory();
  container.innerHTML = "";
  pagination.innerHTML = "";

  if (!Array.isArray(history) || history.length === 0) {
    if (!isPro) {
      // Show upgrade prompt for non-pro users
      container.innerHTML = `
        <div class="pro-blur-overlay" style="margin-top:0;padding-top:2rem;">
          <div class="lock-icon">🔒</div>
          <h3>Unlock Geschiedenis</h3>
          <p>Bewaar al je boodschappenlijsten en hergebruik ze later</p>
          <button class="btn-upgrade">Upgrade to Pro</button>
        </div>
      `;
      container.querySelector(".btn-upgrade").addEventListener("click", showProModal);
    } else {
      container.innerHTML = `
        <p class="empty" style="opacity:0.7;">
          Nog geen opgeslagen lijsten.<br>
          <small>Ga naar <strong>Mijn Lijst</strong> en klik op "Klaar ✓".</small>
        </p>`;
    }
    return;
  }

  // Show limited items for free users
  const itemsToShow = isPro ? history.slice(0, 8) : history.slice(0, MAX_FREE_ITEMS);
  const hasMore = history.length > (isPro ? 8 : MAX_FREE_ITEMS);
  
  console.log('📜 History:', {
    total: history.length,
    showing: itemsToShow.length,
    hasMore,
    willShowOverlay: !isPro && hasMore
  });

  const wrapper = document.createElement("div");
  wrapper.className = "pro-feature-wrapper";

  itemsToShow.forEach((entry) => {
    const dateStr = new Date(entry.date).toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `
      <div class="history-row-main">
        <strong>${dateStr}</strong>
        <span class="muted">• ${entry.items?.length ?? 0} producten</span>
      </div>
      <div class="history-row-actions">
        <button class="btn small reuse-btn" style="background:#44aaff">Hergebruiken</button>
        <button class="btn small view-btn">Bekijken</button>
        <button class="btn small danger del-btn">Verwijderen</button>
      </div>
    `;

    row.querySelector(".reuse-btn").addEventListener("click", async () => {
      try {
        const fresh = await refreshItemsWithCurrentPrices(entry.items);
        localStorage.setItem("sms_list", JSON.stringify(fresh));
        showTopBanner("✅ Lijst hergebruikt met actuele prijzen");
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        showToast("Kon prijzen niet vernieuwen");
      }
    });

    row.querySelector(".view-btn").addEventListener("click", () => {
      document.querySelector(".history-modal")?.remove();
      renderHistoryModal(entry);
    });

    row.querySelector(".del-btn").addEventListener("click", () => {
      deleteHistoryItem(String(entry.id));
      renderHistory(container, pagination, isPro);
    });

    wrapper.appendChild(row);
  });

  container.appendChild(wrapper);

  // Show upgrade prompt for free users
  if (!isPro && hasMore) {
    const overlay = document.createElement("div");
    overlay.className = "pro-blur-overlay";
    overlay.innerHTML = `
      <div class="lock-icon">🔒</div>
      <h3>View all ${history.length} lists</h3>
      <p>Upgrade to Pro for full history access</p>
      <button class="btn-upgrade">Upgrade to Pro</button>
    `;
    overlay.querySelector(".btn-upgrade").addEventListener("click", showProModal);
    container.appendChild(overlay);
  }

  // Pagination for pro users
  if (isPro && history.length > 8) {
    const moreBtn = document.createElement("button");
    moreBtn.textContent = "Meer weergeven";
    moreBtn.className = "btn small";
    moreBtn.style.marginTop = "1rem";
    moreBtn.onclick = () => {
      showToast("Pagination coming soon!");
    };
    pagination.appendChild(moreBtn);
  }
}

/* =======================
   GROENE BEVESTIGINGSBANNER
   ======================= */
function showTopBanner(message) {
  const banner = document.createElement("div");
  banner.textContent = message;
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    background: "#2ecc71",
    color: "#fff",
    padding: "10px",
    textAlign: "center",
    fontWeight: "600",
    zIndex: "9999",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    transition: "transform 0.3s ease",
  });
  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.transform = "translateY(-100%)";
    setTimeout(() => banner.remove(), 300);
  }, 3000);
}
