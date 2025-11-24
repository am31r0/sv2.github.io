// =============================================
// Schappie - Session Manager
// =============================================

const LS_KEY = "sms_user_session_v2";
let state = null;

export const session = {
  async rehydrate() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      if (!raw) return (state = null);
      if (raw.exp && raw.exp * 1000 < Date.now()) {
        localStorage.removeItem(LS_KEY);
        state = null;
        return;
      }
      state = raw;
    } catch {
      state = null;
    }
  },

  isSignedIn() {
    return !!state;
  },

  getUser() {
    return state?.email || "guest";
  },

  hasPro() {
    if (!state?.pro_until) return false;
    return new Date(state.pro_until).getTime() > Date.now();
  },

  isDev() {
    return state?.roles?.includes("dev") || false;
  },

  signIn(data) {
    // data = { uid, email, roles, pro_until, exp }
    state = { ...data };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  },

  signOut() {
    state = null;
    localStorage.removeItem(LS_KEY);
  },
};
