# Schappie Backend Implementation Plan
## Google Login + Subscription System

---

## 📋 Overview

This document outlines the complete backend implementation needed for:
1. Google OAuth 2.0 Authentication
2. User Data Management (GDPR compliant)
3. Subscription System (€0.99 first month, €2.99/month after)
4. Payment Processing (Mollie/Stripe)

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│   Backend    │─────▶│  Database   │
│  (Vite App) │      │ (Node.js API)│      │ (PostgreSQL)│
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Payment    │
                     │   Provider   │
                     │(Mollie/Stripe)│
                     └──────────────┘
```

---

## 🔐 Part 1: Google OAuth 2.0 Setup

### 1.1 Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "Schappie"
3. Enable **Google+ API** and **People API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:5173`, `https://yourdomain.com`
   - Authorized redirect URIs: `http://localhost:5173/auth/callback`, `https://yourdomain.com/auth/callback`
5. Save your **Client ID** and **Client Secret**

### 1.2 Environment Variables

Create `.env` file in backend:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/schappie

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Payment (Mollie recommended for NL)
MOLLIE_API_KEY=your_mollie_api_key
# OR Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

---

## 💾 Part 2: Database Schema

### 2.1 PostgreSQL Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    given_name VARCHAR(100),
    family_name VARCHAR(100),
    picture TEXT,
    locale VARCHAR(10),
    
    -- Additional data (optional, ask for consent)
    birth_date DATE,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    
    -- Privacy
    gdpr_consent BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Subscription details
    status VARCHAR(50) NOT NULL, -- 'trial', 'active', 'cancelled', 'expired'
    plan VARCHAR(50) NOT NULL, -- 'pro_monthly'
    
    -- Pricing
    current_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Dates
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP,
    
    -- Payment provider
    provider VARCHAR(50), -- 'mollie' or 'stripe'
    provider_subscription_id VARCHAR(255),
    provider_customer_id VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, status)
);

-- Payment history
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(50) NOT NULL, -- 'pending', 'paid', 'failed', 'refunded'
    
    -- Provider info
    provider VARCHAR(50),
    provider_payment_id VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

-- Sessions (for JWT refresh tokens)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

---

## 🔧 Part 3: Backend API (Node.js/Express)

### 3.1 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── google-oauth.js
│   │   └── payment.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   └── subscription.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Subscription.js
│   │   └── Payment.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── subscription.routes.js
│   ├── services/
│   │   ├── google-auth.service.js
│   │   ├── subscription.service.js
│   │   └── payment.service.js
│   └── app.js
├── .env
├── package.json
└── README.md
```

### 3.2 Required NPM Packages

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.0",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "@mollie/api-client": "^3.7.0",
    "stripe": "^14.10.0"
  }
}
```

### 3.3 Key API Endpoints

```javascript
// Authentication
POST   /api/auth/google              // Verify Google token
POST   /api/auth/refresh             // Refresh JWT token
POST   /api/auth/logout              // Logout user

// User Management
GET    /api/user/profile             // Get user profile
PATCH  /api/user/profile             // Update profile
DELETE /api/user/account             // Delete account (GDPR)

// Subscriptions
GET    /api/subscription/status      // Get subscription status
POST   /api/subscription/create      // Create subscription
POST   /api/subscription/cancel      // Cancel subscription
GET    /api/subscription/history     // Payment history

// Webhooks (for payment provider)
POST   /api/webhooks/mollie          // Mollie webhook
POST   /api/webhooks/stripe          // Stripe webhook
```

---

## 💳 Part 4: Payment Integration (Mollie Recommended)

### 4.1 Why Mollie for Netherlands?

- ✅ Dutch company, GDPR compliant
- ✅ Supports iDEAL (most popular in NL)
- ✅ Lower fees than Stripe for EU
- ✅ Easy recurring payments
- ✅ Excellent documentation in Dutch

### 4.2 Mollie Setup

1. Create account at [Mollie.com](https://www.mollie.com/)
2. Get API keys (test + live)
3. Set up webhook URL: `https://yourdomain.com/api/webhooks/mollie`
4. Configure subscription product

### 4.3 Subscription Flow

```javascript
// Example: Create Mollie subscription
const createSubscription = async (userId, customerId) => {
  const subscription = await mollieClient.subscriptions.create({
    customerId: customerId,
    amount: {
      currency: 'EUR',
      value: '0.99' // First month
    },
    interval: '1 month',
    description: 'Schappie Pro - Eerste maand',
    webhookUrl: 'https://yourdomain.com/api/webhooks/mollie',
    metadata: {
      userId: userId,
      plan: 'pro_monthly'
    }
  });
  
  return subscription;
};

// After first month, update to regular price
const updateSubscriptionPrice = async (subscriptionId) => {
  await mollieClient.subscriptions.update(subscriptionId, {
    amount: {
      currency: 'EUR',
      value: '2.99'
    },
    description: 'Schappie Pro - Maandelijks'
  });
};
```

---

## 🔒 Part 5: Security Best Practices

### 5.1 Data Protection (GDPR)

```javascript
// Encrypt sensitive data
const crypto = require('crypto');

const encrypt = (text) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Store minimal data
const userDataToStore = {
  google_id: googleProfile.id,
  email: googleProfile.email,
  name: googleProfile.name,
  picture: googleProfile.picture,
  // Only store additional data with explicit consent
  birth_date: userConsent.birthDate ? userData.birthDate : null,
  city: userConsent.location ? userData.city : null
};
```

### 5.2 JWT Token Strategy

```javascript
// Access token (short-lived, 15 minutes)
const accessToken = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Refresh token (long-lived, 7 days)
const refreshToken = jwt.sign(
  { userId: user.id, type: 'refresh' },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

### 5.3 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Te veel login pogingen, probeer later opnieuw'
});

app.use('/api/auth', authLimiter);
```

---

## 📱 Part 6: Frontend Integration

### 6.1 API Service (Already created in mock)

```javascript
// src/services/api.service.js
const API_BASE = process.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiService = {
  // Auth
  async verifyGoogleToken(idToken) {
    const response = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    return response.json();
  },
  
  // Subscription
  async createSubscription() {
    const response = await fetch(`${API_BASE}/subscription/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    return response.json();
  }
};
```

### 6.2 Environment Variables

Create `.env` in frontend:

```env
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 🚀 Part 7: Deployment

### 7.1 Backend Hosting Options

**Recommended: Railway.app or Render.com**
- ✅ Easy PostgreSQL setup
- ✅ Automatic deployments
- ✅ Free tier available
- ✅ Environment variables management

**Alternative: DigitalOcean App Platform**
- More control
- Slightly more expensive
- Better for scaling

### 7.2 Database Hosting

**Recommended: Railway PostgreSQL**
- Included with backend hosting
- Automatic backups
- Easy connection string

**Alternative: Supabase**
- Free tier
- Built-in auth (can replace custom auth)
- Real-time features

### 7.3 Deployment Checklist

- [ ] Set all environment variables
- [ ] Configure CORS for production domain
- [ ] Set up SSL certificate (automatic on Railway/Render)
- [ ] Configure webhook URLs in Mollie/Stripe
- [ ] Set up database backups
- [ ] Configure monitoring (e.g., Sentry)
- [ ] Test payment flow in test mode
- [ ] Switch to live API keys
- [ ] Set up error logging

---

## 📊 Part 8: Monitoring & Analytics

### 8.1 Key Metrics to Track

```javascript
// Track in database or analytics service
- New user signups
- Subscription conversions
- Churn rate
- Monthly recurring revenue (MRR)
- Payment failures
- API response times
```

### 8.2 Recommended Tools

- **Sentry**: Error tracking
- **PostHog**: Product analytics
- **LogRocket**: Session replay
- **Plausible**: Privacy-friendly analytics

---

## 📝 Part 9: Legal Requirements (Netherlands)

### 9.1 Required Documents

1. **Privacy Policy** (Privacyverklaring)
   - How you collect data
   - What data you store
   - How long you keep it
   - User rights (GDPR)

2. **Terms of Service** (Algemene Voorwaarden)
   - Subscription terms
   - Cancellation policy
   - Refund policy

3. **Cookie Policy**
   - What cookies you use
   - How to opt-out

### 9.2 GDPR Compliance

```javascript
// User data export (GDPR right to data portability)
app.get('/api/user/export', authenticate, async (req, res) => {
  const userData = await User.findByPk(req.userId, {
    include: [Subscription, Payment]
  });
  
  res.json({
    user: userData,
    exported_at: new Date().toISOString()
  });
});

// User data deletion (GDPR right to be forgotten)
app.delete('/api/user/account', authenticate, async (req, res) => {
  // Cancel subscription first
  await cancelSubscription(req.userId);
  
  // Anonymize or delete user data
  await User.destroy({ where: { id: req.userId } });
  
  res.json({ message: 'Account deleted' });
});
```

---

## 🎯 Part 10: Implementation Timeline

### Phase 1: Backend Setup (Week 1-2)
- [ ] Set up Node.js/Express server
- [ ] Configure PostgreSQL database
- [ ] Implement Google OAuth
- [ ] Create user management endpoints
- [ ] Set up JWT authentication

### Phase 2: Payment Integration (Week 3)
- [ ] Set up Mollie account
- [ ] Implement subscription creation
- [ ] Set up webhooks
- [ ] Test payment flow

### Phase 3: Frontend Integration (Week 4)
- [ ] Connect frontend to backend API
- [ ] Implement subscription UI
- [ ] Test end-to-end flow
- [ ] Bug fixes

### Phase 4: Testing & Launch (Week 5)
- [ ] Security audit
- [ ] Load testing
- [ ] Legal documents
- [ ] Soft launch
- [ ] Monitor and iterate

---

## 💰 Cost Estimation

### Monthly Costs (Starting)

| Service | Cost |
|---------|------|
| Railway (Backend + DB) | €5-10 |
| Domain | €1-2 |
| Mollie transaction fees | 1.8% + €0.25 per transaction |
| Total | ~€10-15/month + transaction fees |

### Break-even Analysis

- Monthly cost: €15
- Subscription price: €2.99
- Break-even: ~6 paying customers

---

## 📞 Support & Resources

### Documentation
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Mollie API](https://docs.mollie.com/)
- [Stripe API](https://stripe.com/docs/api)
- [PostgreSQL](https://www.postgresql.org/docs/)

### Communities
- [r/webdev](https://reddit.com/r/webdev)
- [Stack Overflow](https://stackoverflow.com/)
- [Dev.to](https://dev.to/)

---

## ✅ Next Steps

1. **Review this document** with your team/developer
2. **Set up Google Cloud Console** and get credentials
3. **Choose payment provider** (Mollie recommended)
4. **Set up development environment** (Node.js + PostgreSQL)
5. **Start with Phase 1** of implementation timeline

---

**Questions or need help?** 
Contact your backend developer or hire a freelancer on:
- Upwork
- Fiverr
- Codementor

**Estimated development time**: 4-5 weeks for experienced developer
**Estimated cost**: €2000-4000 for freelance developer

---

*Last updated: 2025-11-24*
*Version: 1.0*
