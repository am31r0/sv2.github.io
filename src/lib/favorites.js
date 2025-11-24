import { uid, showToast } from "./utils.js";
import { session } from "./session.js";

const LS_KEY_FAVS = "sms_favorites";

export function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_FAVS)) ?? [];
  } catch {
    return [];
  }
}

export function saveFavorites(list) {
  localStorage.setItem(LS_KEY_FAVS, JSON.stringify(list));
}

export function removeFavorite(item) {
  const favs = loadFavorites();
  const index = favs.findIndex(
    (f) => f.name.toLowerCase() === item.name.toLowerCase() && f.store === item.store
  );

  if (index !== -1) {
    favs.splice(index, 1);
    saveFavorites(favs);
    window.dispatchEvent(new Event("storage"));
    showToast("Verwijderd uit favorieten ❤️‍🔥");
  }
}

export function toggleFavorite(item) {
  if (!session.hasPro()) {
    showToast("🔒 Alleen voor Pro leden");
    return;
  }

  const favs = loadFavorites();
  const exists = favs.find(
    (f) => f.name.toLowerCase() === item.name.toLowerCase() && f.store === item.store
  );

  if (exists) {
    removeFavorite(item);
  } else {
    favs.push({
      id: uid(),
      name: item.name,
      store: item.store,
      price: item.price,
      promoPrice: item.promoPrice,
    });
    saveFavorites(favs);
    window.dispatchEvent(new Event("storage"));
    showToast("Toegevoegd aan favorieten ❤️");
  }
}

export function heartSvg(item) {
  const favs = loadFavorites();
  const isFav = favs.some(
    (f) => f.name.toLowerCase() === item.name.toLowerCase() && f.store === item.store
  );

  return isFav
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red" class="bi bi-suit-heart-fill" viewBox="0 0 16 16">
         <path d="M4 1c2.21 0 4 1.755 4 3.92C8 2.755 9.79 1 12 1s4 1.755 4 3.92c0 3.263-3.234 4.414-7.608 9.608a.513.513 0 0 1-.784 0C3.234 9.334 0 8.183 0 4.92 0 2.755 1.79 1 4 1"/>
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="rgba(255, 0, 0, 0.25)" class="bi bi-suit-heart-fill" viewBox="0 0 16 16">
         <path d="M4 1c2.21 0 4 1.755 4 3.92C8 2.755 9.79 1 12 1s4 1.755 4 3.92c0 3.263-3.234 4.414-7.608 9.608a.513.513 0 0 1-.784 0C3.234 9.334 0 8.183 0 4.92 0 2.755 1.79 1 4 1"/>
       </svg>`;
}
