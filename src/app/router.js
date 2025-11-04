// =============================================
// Animated hash router met default route + active nav + smooth transition
// =============================================

export function createRouter({ routes, mountEl, defaultHash = "#/home" }) {
  
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const wrapper =
    document.getElementById("app-wrapper") ||
    mountEl.parentElement ||
    document.body;

  /* ----------------------------
     Helpers
  ----------------------------- */
  function getRenderer(hash) {
    const target = hash || window.location.hash || defaultHash;
    return (
      routes[target] ||
      routes[defaultHash] ||
      ((el) => (el.innerHTML = "<div style='padding:2rem'>Home</div>"))
    );
  }

  function setActiveNav(hash) {
    const current = hash || window.location.hash || defaultHash;
    document.querySelectorAll(".nav-link").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === current);
    });
  }

  function getTabOrder() {
    return ["#/home", "#/list", "#/deals", "#/pro", "#/settings"];
  }

  function getNextHash(currentHash, direction = 1) {
    const tabs = getTabOrder();
    const index = tabs.indexOf(currentHash);
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    return tabs[nextIndex];
    
  }


  /* ----------------------------
     Transition & Render
  ----------------------------- */
  function renderWithTransition(targetHash) {
    const routeFn = getRenderer(targetHash);

    // Bij voorkeur: minimale motion = geen animatie
    if (reduceMotion) {
      routeFn(mountEl);
      setActiveNav(targetHash);
      
      mountEl.scrollTop = 0;
      window.scrollTo(0, 0);
      return;
    }

    // Start fade-out
    wrapper.classList.add("page-transition-out");

    // Wacht kort voor vloeiendheid
    setTimeout(() => {
      wrapper.classList.remove("page-transition-out");
      wrapper.classList.add("page-transition-in");

      // Render nieuwe pagina
      routeFn(mountEl);
      setActiveNav(targetHash);
      mountEl.scrollTop = 0;
      window.scrollTo(0, 0);

      // Reset animatieclass
      setTimeout(() => {
        wrapper.classList.remove("page-transition-in");
      }, 250);
    }, 100);
  }

  /* ----------------------------
     Hashchange Handler
  ----------------------------- */
  function onHashChange() {
    const hash = window.location.hash || defaultHash;
    renderWithTransition(hash);
  }

  window.addEventListener("hashchange", onHashChange);

  /* ----------------------------
     Lifecycle Controls
  ----------------------------- */
  function start() {
    if (!window.location.hash) {
      // Triggert hashchange → render
      window.location.hash = defaultHash;
    } else {
      // Directe render bij deeplink/init
      renderWithTransition(window.location.hash);
    }
  }

  function navigate(to) {
    // Als hash gelijk is, forceer render (bijv. tab opnieuw klikken)
    if (window.location.hash === to) {
      renderWithTransition(to);
    } else {
      window.location.hash = to;
    }
  }

  function destroy() {
    window.removeEventListener("hashchange", onHashChange);
  }

  

  /* ----------------------------
     Expose
  ----------------------------- */
  return { start, navigate, destroy, getNextHash };
}

