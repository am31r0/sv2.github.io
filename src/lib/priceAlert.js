import { LocalNotifications } from '@capacitor/local-notifications';
import { session } from './session.js';
import { showToast } from './utils.js';
import { STORE_LABEL } from './constants.js';

const LS_KEY_ALERTS = 'sms_alerts';

// Load alerts from local storage
export function loadAlerts() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_ALERTS)) || [];
  } catch {
    return [];
  }
}

// Save alerts to local storage
function saveAlerts(alerts) {
  localStorage.setItem(LS_KEY_ALERTS, JSON.stringify(alerts));
}

// Check if product has an active alert
export function hasAlert(product) {
  const alerts = loadAlerts();
  // Match by name and store, similar to favorites
  return alerts.some(a => a.name === product.name && a.store === product.store);
}

// Request notification permissions
async function requestPermissions() {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (e) {
    console.error("Error requesting notification permissions", e);
    // Fallback for web or if plugin fails
    return true; 
  }
}

// Toggle alert for a product
export async function togglePriceAlert(product) {
  if (!session.hasPro()) {
    showToast("🔒 Alleen voor Pro leden");
    return false;
  }

  const alerts = loadAlerts();
  const index = alerts.findIndex(a => a.name === product.name && a.store === product.store);

  if (index !== -1) {
    // Remove alert
    alerts.splice(index, 1);
    saveAlerts(alerts);
    showToast("Prijsalert verwijderd 🔕");
    return false; // Alert is now off
  } else {
    // Add alert
    const granted = await requestPermissions();
    if (!granted) {
      showToast("⚠️ Notificaties zijn niet toegestaan");
      return false;
    }

    alerts.push({
      id: product.id || crypto.randomUUID(),
      name: product.name,
      store: product.store,
      targetPrice: product.price, 
      image: product.image || null,
      createdAt: new Date().toISOString()
    });
    saveAlerts(alerts);
    showToast("Prijsalert ingesteld 🔔");
    
    // Check immediately if it's on sale (optional, but good feedback)
    if (product.promoPrice || product.offerPrice) {
       scheduleNotification(product);
    }
    
    return true; // Alert is now on
  }
}

// Schedule a notification
async function scheduleNotification(product) {
  try {
    // Truncate name to 3 words
    const words = product.name.split(' ');
    const shortName = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
    
    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Schappie Alert! 🏷️",
          body: `Product ${shortName} is nu in de aanbieding bij ${STORE_LABEL[product.store] || product.store}!`,
          id: Math.floor(Math.random() * 100000), // Simple random ID
          schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
          sound: null,
          attachments: null,
          actionTypeId: "",
          extra: null
        }
      ]
    });
  } catch (e) {
    console.error("Error scheduling notification", e);
  }
}

// Check all alerts against current products (to be called on app load/refresh)
export async function checkPriceAlerts(allProducts) {
  if (!session.hasPro()) return;

  const alerts = loadAlerts();
  if (alerts.length === 0) return;

  const granted = await requestPermissions();
  if (!granted) return;

  for (const alert of alerts) {
    // Find matching product in current data
    const match = allProducts.find(p => 
      p.name === alert.name && 
      p.store === alert.store && 
      (p.promoPrice || p.offerPrice) // Must be on sale
    );

    if (match) {
        const lastNotified = alert.lastNotified ? new Date(alert.lastNotified) : null;
        const now = new Date();
        // Check if already notified today
        const isToday = lastNotified && lastNotified.getDate() === now.getDate() && lastNotified.getMonth() === now.getMonth() && lastNotified.getFullYear() === now.getFullYear();
        
        if (!isToday) {
            await scheduleNotification(match);
            alert.lastNotified = now.toISOString();
        }
    }
  }
  saveAlerts(alerts);
}

// SVG Icons
export function getAlertIcon(isActive) {
    if (isActive) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#e67e22" class="bi bi-bell-fill" viewBox="0 0 16 16">
  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"/>
</svg>`;
    } else {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#e67e2255" class="bi bi-bell-fill" viewBox="0 0 16 16">
        <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"/>
</svg>`;
    }
}
