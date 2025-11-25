// =============================================
// Mock API Service for Schappie
// =============================================
// This file contains mock API calls that simulate backend responses.
// Replace these with real API calls once backend is implemented.
// See BACKEND_IMPLEMENTATION_PLAN.md for details.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const MOCK_MODE = import.meta.env.VITE_MOCK_API !== 'false'; // Default to mock mode

// =============================================
// Helper Functions
// =============================================

function getAccessToken() {
  return localStorage.getItem('access_token');
}

function setTokens(accessToken, refreshToken) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// Simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================
// Mock Data
// =============================================

const MOCK_USER = {
  id: 'mock-user-123',
  google_id: '1234567890',
  email: 'user@example.com',
  name: 'Test User',
  given_name: 'Test',
  family_name: 'User',
  picture: 'https://via.placeholder.com/150',
  locale: 'nl',
  birth_date: null,
  city: null,
  postal_code: null,
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
  gdpr_consent: true,
  marketing_consent: false
};

const MOCK_SUBSCRIPTION = {
  id: 'mock-sub-123',
  user_id: 'mock-user-123',
  status: 'active', // 'trial', 'active', 'cancelled', 'expired'
  plan: 'pro_monthly',
  current_price: 2.99,
  currency: 'EUR',
  trial_start: null,
  trial_end: null,
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancelled_at: null,
  provider: 'mollie',
  provider_subscription_id: 'sub_mock123',
  provider_customer_id: 'cst_mock123',
  created_at: new Date().toISOString()
};

// =============================================
// Authentication API
// =============================================

export const authAPI = {
  /**
   * Verify Google ID token and create/login user
   * @param {string} idToken - Google ID token from GoogleAuth.signIn()
   * @returns {Promise<{user, tokens}>}
   */
  async verifyGoogleToken(idToken) {
    if (MOCK_MODE) {
      await delay();
      console.log('🔶 MOCK: Verifying Google token...');
      
      // Simulate successful verification
      const mockTokens = {
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
        expires_in: 900 // 15 minutes
      };
      
      setTokens(mockTokens.access_token, mockTokens.refresh_token);
      
      return {
        success: true,
        user: MOCK_USER,
        tokens: mockTokens,
        is_new_user: false
      };
    }
    
    // Real API call
    const response = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    if (!response.ok) {
      throw new Error('Failed to verify Google token');
    }
    
    const data = await response.json();
    setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  },

  /**
   * Refresh access token using refresh token
   * @returns {Promise<{access_token, expires_in}>}
   */
  async refreshToken() {
    if (MOCK_MODE) {
      await delay(200);
      console.log('🔶 MOCK: Refreshing token...');
      
      const newAccessToken = 'mock_access_token_' + Date.now();
      localStorage.setItem('access_token', newAccessToken);
      
      return {
        access_token: newAccessToken,
        expires_in: 900
      };
    }
    
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (!response.ok) {
      clearTokens();
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    return data;
  },

  /**
   * Logout user
   */
  async logout() {
    if (MOCK_MODE) {
      await delay(200);
      console.log('🔶 MOCK: Logging out...');
      clearTokens();
      return { success: true };
    }
    
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    clearTokens();
    return response.json();
  }
};

// =============================================
// User API
// =============================================

export const userAPI = {
  /**
   * Get user profile
   * @returns {Promise<User>}
   */
  async getProfile() {
    if (MOCK_MODE) {
      await delay();
      console.log('🔶 MOCK: Getting user profile...');
      return MOCK_USER;
    }
    
    const response = await fetch(`${API_BASE}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get profile');
    }
    
    return response.json();
  },

  /**
   * Update user profile
   * @param {Object} updates - Profile fields to update
   * @returns {Promise<User>}
   */
  async updateProfile(updates) {
    if (MOCK_MODE) {
      await delay();
      console.log('🔶 MOCK: Updating profile...', updates);
      return { ...MOCK_USER, ...updates };
    }
    
    const response = await fetch(`${API_BASE}/user/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    return response.json();
  },

  /**
   * Delete user account (GDPR)
   * @returns {Promise<{success: boolean}>}
   */
  async deleteAccount() {
    if (MOCK_MODE) {
      await delay(1000);
      console.log('🔶 MOCK: Deleting account...');
      clearTokens();
      return { success: true, message: 'Account deleted' };
    }
    
    const response = await fetch(`${API_BASE}/user/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete account');
    }
    
    clearTokens();
    return response.json();
  },

  /**
   * Export user data (GDPR)
   * @returns {Promise<Object>}
   */
  async exportData() {
    if (MOCK_MODE) {
      await delay(1000);
      console.log('🔶 MOCK: Exporting user data...');
      return {
        user: MOCK_USER,
        subscription: MOCK_SUBSCRIPTION,
        exported_at: new Date().toISOString()
      };
    }
    
    const response = await fetch(`${API_BASE}/user/export`, {
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to export data');
    }
    
    return response.json();
  }
};

// =============================================
// Subscription API
// =============================================

export const subscriptionAPI = {
  /**
   * Get subscription status
   * @returns {Promise<Subscription|null>}
   */
  async getStatus() {
    if (MOCK_MODE) {
      await delay();
      console.log('🔶 MOCK: Getting subscription status...');
      // Return null for free users, or MOCK_SUBSCRIPTION for pro users
      const hasPro = localStorage.getItem('mock_has_pro') === 'true';
      return hasPro ? MOCK_SUBSCRIPTION : null;
    }
    
    const response = await fetch(`${API_BASE}/subscription/status`, {
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get subscription status');
    }
    
    return response.json();
  },

  /**
   * Create new subscription
   * @returns {Promise<{checkout_url: string, subscription: Subscription}>}
   */
  async create() {
    if (MOCK_MODE) {
      await delay(1000);
      console.log('🔶 MOCK: Creating subscription...');
      
      // Simulate Mollie checkout URL
      const mockCheckoutUrl = 'https://www.mollie.com/checkout/mock-checkout-id';
      
      // In real implementation, user would be redirected to this URL
      // For mock, we'll just mark as pro after a delay
      setTimeout(() => {
        localStorage.setItem('mock_has_pro', 'true');
        console.log('🔶 MOCK: Subscription activated!');
      }, 2000);
      
      return {
        checkout_url: mockCheckoutUrl,
        subscription: {
          ...MOCK_SUBSCRIPTION,
          status: 'pending',
          current_price: 0.99 // First month price
        }
      };
    }
    
    const response = await fetch(`${API_BASE}/subscription/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }
    
    return response.json();
  },

  /**
   * Cancel subscription
   * @returns {Promise<{success: boolean}>}
   */
  async cancel() {
    if (MOCK_MODE) {
      await delay(1000);
      console.log('🔶 MOCK: Cancelling subscription...');
      localStorage.setItem('mock_has_pro', 'false');
      
      return {
        success: true,
        message: 'Subscription cancelled. Access until end of period.',
        subscription: {
          ...MOCK_SUBSCRIPTION,
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        }
      };
    }
    
    const response = await fetch(`${API_BASE}/subscription/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
    
    return response.json();
  },

  /**
   * Get payment history
   * @returns {Promise<Payment[]>}
   */
  async getHistory() {
    if (MOCK_MODE) {
      await delay();
      console.log('🔶 MOCK: Getting payment history...');
      
      return [
        {
          id: 'pay-1',
          amount: 0.99,
          currency: 'EUR',
          status: 'paid',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          paid_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'pay-2',
          amount: 2.99,
          currency: 'EUR',
          status: 'paid',
          created_at: new Date().toISOString(),
          paid_at: new Date().toISOString()
        }
      ];
    }
    
    const response = await fetch(`${API_BASE}/subscription/history`, {
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get payment history');
    }
    
    return response.json();
  }
};

// =============================================
// Export all APIs
// =============================================

export default {
  auth: authAPI,
  user: userAPI,
  subscription: subscriptionAPI
};
