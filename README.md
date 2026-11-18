# GameZoneET — Complete Ethiopian Gaming Platform

GameZoneET is a modern, high-performance Ethiopian esports and gaming marketplace engineered around three core pillars:
1. **Top-Up Marketplace:** Buy diamonds, UC, and FC Points in Ethiopian Birr (ETB) with simulated Telebirr & CBE Birr checkouts.
2. **Free Esports Tournaments:** 100% free-to-enter tournaments for Free Fire, PUBG Mobile, and EA SPORTS FC with real-time interactive single-elimination brackets, match score submission, and dispute resolution.
3. **Integrated HTML5 Game Library:** 52 lightweight, mobile-optimized online games playable directly on the platform with zero downloads and zero GPU requirements.

---

## 🚀 Quick Start & Installation

```bash
# Install dependencies
npm install

# Start local development server (runs on port 3000)
npm run dev

# Build for production
npm run build
```

---

## 🛡️ Architecture & Implementation Highlights

### 1. Payment Abstraction & Demo Checkout
- **Interface:** `PaymentProvider` (`initializePayment()`, `verifyPayment()`, `getPaymentStatus()`).
- **Implementation:** `DemoPaymentProvider` in `src/services/payment.ts`.
- **Supported Ethiopian Gateways:**
  - **Telebirr (Ethio Telecom):** Simulated USSD push prompt sent to customer's mobile number (`09...`).
  - **CBE Birr (Commercial Bank of Ethiopia):** Simulated bank wallet/app authorization.
- **Strict Safeguards:** Prominent `"DEMO CHECKOUT — No real money will be charged."` notices on all payment screens. No real banking credentials, PINs, or OTPs are ever collected or stored.
- **Developer Jury Controls:** Instant toggles for **Simulate Success**, **Simulate Pending**, and **Simulate Failed** outcomes.
- **Demonstration Receipts:** Every order generates a verifiable receipt reference (`TB-ETB-2026-XXXXX` / `CBE-BIRR-2026-XXXXX`), full order details, and delivery progress tracking.

### 2. Unified Reactive Database Engine
- **Service:** `db` in `src/services/db.ts` utilizing local storage persistence (`gzet_*_v3`) with pub-sub event notifications.
- **Pre-Seeded Data:**
  - **Users:** Demo Gamer (`Dawit_07`, Rank #4, 148 matches) and Administrator (`Aman_ET (Admin)`, Rank #1).
  - **Products:** 19 pre-seeded packages across Free Fire, PUBG Mobile, and EA SPORTS FC.
  - **Tournaments:** Live brackets with 16-slot single-elimination tournament (`Addis Ababa Clash Squad Invitational 2026`), Erangel Highland Cup, and EA FC 26 Addis Masters.
  - **Orders:** Realistic pre-seeded orders with status timelines and copyable receipts.
  - **News:** 4 detailed gaming articles covering patch notes and Addis Ababa telecom 5G latency updates.

### 3. Interactive Tournament Brackets & Administration
- **Live Visual Bracket Tree:** Quarterfinals -> Semifinals -> Grand Finals with score cards and winner progression.
- **100% Free Registration:** Enforces capacity limits, duplicate registration prevention, and public player ID validation.
- **Participant Reporting & Disputes:** Match score submissions and dispute filing with administrator arbitration tools.
- **Admin Dashboard (`/admin`):** Comprehensive CRUD management for Products, Orders, Tournaments, Games, News, and Users.

---

## 📋 Feature Status & Commercial Readiness Matrix

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Hero 3D Free Fire Stage** | ✅ **Fully Functional** | Unconstrained animation sequence: combat roll, fire aura farming, and throne settling. |
| **6-Step Top-Up Journey** | ✅ **Fully Functional** | Game -> Package -> Player ID -> Summary -> Payment -> Receipt. |
| **Telebirr & CBE Birr Checkout** | 🔶 **Simulated (Demo Mode)** | Authentic Ethiopian USSD simulation with test toggles (Success/Pending/Failed). |
| **HTML5 Game Library (52 Games)** | ✅ **Fully Functional** | 52 lightweight playable browser games with HUD, ping monitor, timer, and leaderboard logging. |
| **Free Tournament Registration** | ✅ **Fully Functional** | Capacity limits, duplicate prevention, Addis Ababa time scheduling. |
| **Interactive Tournament Brackets** | ✅ **Fully Functional** | Visual knockout tree, winner advancement, match approvals. |
| **Dispute Reporting System** | ✅ **Fully Functional** | Participant dispute filing and admin resolution flow. |
| **Gaming News & Updates** | ✅ **Fully Functional** | Category filters, full article reader, and admin publishing. |
| **Admin Dashboard** | ✅ **Fully Functional** | Role-protected portal with quick demo switcher (`Aman_ET` vs `Dawit_07`). |
| **Loyalty XP & Leaderboard** | ✅ **Fully Functional** | Tracks games played, high scores, tournament participation. |
| **Production Payment Gateway (Chapa/Telebirr Live)** | ⏳ **Awaiting Merchant API Keys** | Codebase is pre-architected with `PaymentProvider` interface for seamless drop-in when live merchant credentials are acquired. |

---

## 🔑 External Services & Environment

Refer to `.env.example`. No paid API keys or credit cards are required to run, test, and demonstrate this application.
