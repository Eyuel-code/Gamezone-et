<div align="center">

# 🎮 GameZone ET

**Ethiopia's Next-Generation Competitive Esports Hub, Instant Top-Up Store & Responsible Gaming Platform**

[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini_AI-Powered-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![WCAG 2.2](https://img.shields.io/badge/Accessibility-WCAG_2.2_AA-10B981?style=for-the-badge)](https://www.w3.org/WAI/standards-guidelines/wcag/)

[Live Demo]([YOUR_LIVE_DEMO_URL]) • [Features](#-core-features) • [Security Architecture](#-cybersecurity--anti-smurfing-engine) • [Installation](#-getting-started)

</div>

---

## 📖 Overview

**GameZone ET** is a full-stack esports ecosystem and gaming platform designed specifically for Ethiopian gamers in **Addis Ababa (Finfinnee)** and across the region. Built with a high-contrast cyberpunk obsidian & royal violet glassmorphic interface, the platform unifies **zero-fee competitive tournaments**, **local mobile money top-ups (Telebirr & CBE Birr)**, an **in-browser open-source WebGL/HTML5 arcade**, **enterprise-grade anti-smurfing verification**, and a **digital wellness engine** powered by Google Gemini AI.

---

## ✨ Core Features

### 🏆 Zero-Cost Competitive Esports Tournaments
* **Flagship Titles:** Supports solo and squad brackets for **Free Fire**, **PUBG Mobile**, and **EAFC**.
* **Automated Room Distribution:** Custom Room IDs and Passwords remain encrypted and hidden until match time, unlocking exclusively inside the profiles of verified, registered participants.
* **Admin Control Center:** Role-restricted administrative dashboard for tournament creation, live feed monitoring, and top-up verification.

### 💳 Localized Digital Top-Up Store
* Instant diamond, UC, and game credit top-ups tailored for local payment rails, supporting **Telebirr** and **CBE Birr** workflows with real-time order tracking.

### 🕹️ In-App Open-Source WebGL & HTML5 Arcade
* Play curated, top-rated open-source browser games directly inside a full-viewport **In-App Arcade Player Modal**—no external redirects or third-party sign-in walls.
* Lazy-loaded `<iframe>` game stages with fullscreen support, keyboard control overlays, and live session timer synchronization.

### 🤖 Dual Google Gemini AI Assistants & Interactive Help Guide
* **Floating Esports & Top-Up Assistant:** Instant 24/7 support for tournament rules, bracket schedules, and Telebirr/CBE Birr top-up inquiries.
* **Mindful Companion AI Coach:** Embedded inside the *Health & Wellness* portal to offer grounding exercises, tilt recovery, and encouragement when players experience competitive fatigue or match frustration.
* **Interactive `?` Platform Guide:** Built-in onboarding drawer walking new players through verification, top-ups, and fair-play rules.

---

## 🛡️ Cybersecurity & Anti-Smurfing Engine

Competitive integrity is enforced at the identity and session layers to eliminate duplicate accounts and unfair multi-entries:

1. **Strict Document Exclusivity (Passport vs. Ethiopian National ID):** Players must verify their identity using **either** a valid Passport **or** an Ethiopian National ID/Digital ID—strictly never both, never neither.
2. **One-ID-Per-Account Deduplication:** Prevents a single identity credential from being bound to multiple accounts or entered twice into the same tournament bracket.
3. **Fuzzy-Name Matching & Anomaly Warnings:** Compares submitted document credentials against the user's sign-in profile name, allowing natural spacing/capitalization differences while issuing real-time security warnings and tracking repeat offenses on major identity mismatches.
4. **Hardware & Session Integrity:** Lightweight client-side browser fingerprinting, rate-limiting protection on top-up forms, and admin audit trails.

---

## 🧠 Responsible Gaming & Digital Wellness

GameZone ET actively protects players from burnout and screen fatigue so competitive gaming stays balanced with studies, work, and health:

* **Daily 2-Hour Gameplay Hard Cap:** An active session timer tracks in-browser playtime and triggers an empathetic wellness lock screen once a player reaches 2 hours in a calendar day.
* **Weekly Tournament Throttle:** Limits each verified player to **one tournament per calendar week** (Monday–Sunday) to prevent over-competition and ensure fair bracket availability.
* **Health & Wellness Portal:** Dedicated navigation hub featuring ergonomic wrist/posture routines, eye-strain prevention guides, and direct access to the *Mindful Companion* AI coach.

---

## ♿ WCAG 2.2 Level AA Accessibility

Engineered from the ground up to be inclusive for blind, low-vision, deaf, hard-of-hearing, motor-impaired, and motion-sensitive users:

* **Screen Reader Support:** Semantic HTML5 landmarks, descriptive `aria-label` tags on all interactive controls, `aria-live` polite/assertive regions for live slot updates and alerts, and an optional **Web Speech API ("Read Aloud")** toggle.
* **Visual & Contrast Protection:** Minimum **4.5:1 text contrast ratio** enforced via backdrop scrims over animated backgrounds, plus non-color-dependent status badges.
* **Deaf & Hard-of-Hearing Compliance:** Zero audio-only cues—all alerts provide high-contrast visual banners and complete text transcripts.
* **Keyboard & Motion Safety:** Full keyboard operability with high-visibility `:focus-visible` outlines, modal focus trapping, `prefers-reduced-motion` detection, and a one-click **Pause Background Motion** toggle.

---

## 🛠️ Tech Stack

* **Frontend Framework:** React + TypeScript
* **Styling & Motion:** Tailwind CSS, Custom CSS3 Design Tokens, Dual-Layer `padding-box` / `border-box` Gradient Borders, GPU-Composited Spring Physics
* **Artificial Intelligence:** Google Gemini API (`@google/genai`)
* **Icons & UI:** Lucide React
* **Game Runtime:** Sandboxed Open-Source HTML5 Canvas & WebGL (`<iframe>`)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **npm** or **yarn**
* A **Google Gemini API Key**

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/](https://github.com/)[YOUR_GITHUB_USERNAME]/gamezone-et.git
   cd gamezone-et
