// =============================================
// Animated hash router met default route + active nav + smooth transition
// + beforeEach() guard support + router.go() alias
// =============================================

export function createRouter({ routes, mountEl, defaultHash = "#/home" }) {
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const wrapper =
    document.getElementById("app-wrapper") ||
    mountEl.parentElement ||
    document.body;

  /* ----------------------------
     Internal State
  ----------------------------- */
  let guardFn = null; // voor beforeEach
  let lastHash = null;

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

    if (reduceMotion) {
      routeFn(mountEl);
      setActiveNav(targetHash);
      mountEl.scrollTop = 0;
      window.scrollTo(0, 0);
      return;
    }

    wrapper.classList.add("page-transition-out");

    setTimeout(() => {
      wrapper.classList.remove("page-transition-out");
      wrapper.classList.add("page-transition-in");

      routeFn(mountEl);
      setActiveNav(targetHash);
      mountEl.scrollTop = 0;
      window.scrollTo(0, 0);

      setTimeout(() => {
        wrapper.classList.remove("page-transition-in");
      }, 250);
    }, 100);
  }

  /* ----------------------------
     Guard handling
  ----------------------------- */
  function runGuard(to, from, next) {
    if (typeof guardFn === "function") {
      try {
        guardFn(to, from, next);
      } catch (err) {
        console.error("Router guard error:", err);
        next();
      }
    } else {
      next(); // geen guard ingesteld
    }
  }

  /* ----------------------------
     Navigation core
  ----------------------------- */
  function onHashChange() {
    const hash = window.location.hash || defaultHash;
    const from = lastHash;
    const to = hash;
    lastHash = hash;

    // Guard-intercept
    runGuard(to, from, (override) => {
      if (typeof override === "string") {
        // redirect
        navigate(override);
        return;
      }
      renderWithTransition(hash);
    });
  }

  window.addEventListener("hashchange", onHashChange);

  /* ----------------------------
     Lifecycle Controls
  ----------------------------- */
  function start() {
    lastHash = window.location.hash || defaultHash;
    if (!window.location.hash) {
      window.location.hash = defaultHash;
    } else {
      renderWithTransition(window.location.hash);
    }
  }

  function navigate(to) {
    if (window.location.hash === to) {
      renderWithTransition(to);
    } else {
      window.location.hash = to;
    }
  }

  function go(to) {
    navigate(to); // alias zodat router.go() werkt
  }

  function destroy() {
    window.removeEventListener("hashchange", onHashChange);
  }

  function beforeEach(fn) {
    guardFn = fn;
  }

  /* ----------------------------
     Expose
  ----------------------------- */
  return { start, navigate, go, destroy, getNextHash, beforeEach };
}
