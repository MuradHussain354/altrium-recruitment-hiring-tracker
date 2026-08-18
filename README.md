# Altrium Recruitment & Hiring Tracker

A modern, full-stack recruitment platform engineered for collaborative application tracking, team assignment, candidate reviews, and role-based hiring workflows.

Developed for **Professional Practice and Project Management**.

---

## 🛠 Technology Stack & Rationale

### 1. Frontend
- **Framework**: **React 18 + TypeScript + Vite**
  - *Rationale*: Blazing fast dev server (HMR), strict type safety for multi-developer collaboration, and industry-standard component architecture.
- **Styling**: **Vanilla CSS + CSS Modules / Design System Variables**
  - *Rationale*: Custom, lightweight CSS tokens for dark/light themes, sleek glassmorphism, rounded cards, subtle shadows, and responsive layouts without bloated CSS framework locks.
- **Icons & Navigation**: `lucide-react`, `react-router-dom` v6.

### 2. Backend & API
- **Runtime & Server**: **Node.js + Express + TypeScript**
  - *Rationale*: Clean controller-service-repository pattern, modular REST API routing under `/api/v1`, robust middleware pipeline for Auth and Role-Based Access Control (RBAC).

### 3. Database & Abstraction
- **ORM & Database**: **Prisma ORM + PostgreSQL**
  - *Rationale*: Strongly typed database client, automated schema migration management, clear relation modeling (`User`, `Team`, `Position`, `Application`, `Feedback`, etc.). Supports SQLite fallback for instant local dev.

### 4. Security & Configuration
- **Auth**: JWT (JSON Web Token) + `bcryptjs` password hashing.
- **Environment**: Strict separation using `dotenv` and `.env.example`. Secrets are never committed to version control.

---

## 🏗 System Architecture & Component Responsibilities

1. **Client Layer (`/client`)**: Decoupled React application responsible purely for UI rendering, public careers browsing, candidate forms, and internal dashboard panels. Communicates with server via REST endpoints.
2. **Server Layer (`/server`)**: Express API server managing endpoints (`/api/v1`), JWT authentication, role permission verification (`MANAGER`, `HR`, `TEAM_LEAD`), and business services.
3. **Database Layer (`/server/prisma`)**: Prisma schema definitions, migrations, seeders, and model queries isolated from HTTP controllers and UI logic.

```
+-----------------------------------------------------------------------+
|                            CLIENT (Vite + React)                       |
|  +--------------------+   +-------------------+   +----------------+  |
|  | Public Careers Site|   | Auth State / Context|  | Internal Portal|  |
|  +--------------------+   +-------------------+   +----------------+  |
+-----------------------------------||-----------------------------------+
                                    || HTTP / JSON API
+-----------------------------------\/-----------------------------------+
|                        BACKEND (Node.js + Express)                    |
|  +--------------------+   +-------------------+   +----------------+  |
|  |  Routes & Auth Middleware | Service Business  | Controller Layer|  |
|  +--------------------+   +-------------------+   +----------------+  |
+-----------------------------------||-----------------------------------+
                                    || Prisma ORM
+-----------------------------------\/-----------------------------------+
|                            DATABASE (PostgreSQL)                        |
|   User | Team | Position | Stage | Candidate | Application | Feedback  |
+-----------------------------------------------------------------------+
```

---

## 📁 Project Directory Structure

```
altrium-recruitment-hiring-tracker/
├── .env.example              # Environment variables template
├── .gitignore                 # Version control ignore rules
├── README.md                  # Project documentation & setup instructions
├── package.json               # Root scripts (concurrent execution)
├── client/                    # React Frontend
│   ├── index.html             # HTML entry point with Google Fonts
│   ├── vite.config.ts         # Vite server & proxy configuration
│   ├── tsconfig.json          # Frontend TypeScript settings
│   ├── package.json           # Client dependencies
│   └── src/
│       ├── main.tsx           # React root renderer
│       ├── App.tsx            # Root component & API status check
│       ├── index.css          # Design system CSS variables & utility classes
│       ├── components/        # Reusable UI elements (common, layout)
│       ├── pages/             # Page views (public careers & internal portal)
│       ├── services/          # HTTP API client services
│       ├── types/             # Frontend TypeScript interfaces
│       └── utils/             # Helper utilities
└── server/                    # Express Backend
    ├── tsconfig.json          # Backend TypeScript settings
    ├── package.json           # Server dependencies
    ├── src/
    │   ├── server.ts          # Express HTTP server listener
    │   ├── app.ts             # Express app middleware & routing setup
    │   ├── config/            # Environment & database configuration
    │   ├── controllers/       # HTTP Request handlers
    │   ├── middleware/        # JWT auth & RBAC authorization
    │   ├── routes/            # API endpoints (/api/v1/...)
    │   ├── services/          # Core recruitment business logic
    │   ├── types/             # Backend TypeScript interfaces
    │   └── utils/             # Password & token utilities
    └── prisma/
        └── schema.prisma      # Prisma ORM schema (10 entities)
```

---

## 👥 Team Member Workload Breakdown

- **Member 1 (Full-Stack Developer)**:
  - Express API foundation, `/api/v1` routes, and database schema implementation.
  - JWT Auth & Role-Based Access Control middleware (`Manager`, `HR`, `Team Lead`).
  - End-to-End Application Workflow APIs (Candidate application processing -> Team assignment -> Review feedback).
- **Member 2 (Frontend Developer)**:
  - CSS Design System tokens, typography, glassmorphism, responsive grid layout.
  - Public Careers Pages (Landing page, About, Job search directory, Candidate application form).
  - Reusable components (Navbar, Footer, Job cards, Badges, Buttons).
- **Member 3 (Frontend + QA Developer)**:
  - Internal Portal Views (Manager oversight dashboard, HR processing panel, Team Lead review panel).
  - Workflow UI Modals (Assign application to team, submit review rating & feedback notes).
  - Automated testing setup (Jest/Vitest/Playwright) and QA verification test cases.

---

## 🚀 How to Run the Project Locally

### Prerequisites
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)

### Setup Steps
1. **Clone & Navigate**:
   ```bash
   git clone <repository-url>
   cd altrium-recruitment-hiring-tracker
   ```
2. **Environment File**:
   Copy `.env.example` to create `.env`:
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```
3. **Install Dependencies**:
   Install root, server, and client dependencies:
   ```bash
   npm run install:all
   ```
4. **Start Development Servers**:
   Run both frontend (Vite) and backend (Express) concurrently:
   ```bash
   npm run dev
   ```

---

## 🧪 How to Verify the Setup

1. **Backend Verification**:
   - Open browser or curl: `http://localhost:5000/api/v1/health`
   - Expected JSON output:
     ```json
     {
       "status": "OK",
       "message": "Altrium Recruitment & Hiring Tracker API is running",
       "timestamp": "2026-08-13T...",
       "version": "1.0.0"
     }
     ```
2. **Frontend Verification**:
   - Open browser: `http://localhost:5173/`
   - The application foundation page will display:
     - **Project Foundation Scaffold** header badge
     - **API Server Status** card displaying live `Online` ping from the server
     - **Database & Prisma ORM** schema card
     - **Team Task Division** breakdown
     - **Sprint 1 Core Workflow Scope** roadmap
