# JadHor OS — System Architecture & Codebase Overview

This document provides a comprehensive overview of the JadHor OS (Property Management Platform) architecture, database models, security constraints, and implementation status. It is designed to give an external agent (like Claude) a complete, high-context view of the system for auditing and planning.

---

## 1. Project Stack & Architecture

JadHor OS is a SaaS property management platform tailored for Thai dormitory/apartment owners and tenants. It features billing automation, slip verification, tenant self-reporting meters, LINE OA integration, SMS notifications, and legally binding lease signing.

*   **Framework:** Next.js (App Router, Turbopack)
*   **Database & ORM:** PostgreSQL (Supabase) + Prisma ORM
*   **Authentication:** Next-Auth (Credentials + LINE OAuth Login)
*   **Security:** Row-Level Security (RLS) simulation layer in Prisma (`src/lib/prisma-secure.ts`) + Soft Delete system-wide
*   **Testing:** Vitest + Mock DB Layer
*   **Integrations:**
    *   **SlipOK API:** Automatic bank transfer QR slip verification
    *   **LINE OA Webhook:** Notification bindings, status checks, and tenant actions
    *   **SMS API:** SMS reminders for tenants

---

## 2. File Tree Structure

```text
C:\dev\JadHor
├── .agents/                    # Customization rules and agents configuration
├── prisma/
│   ├── schema.prisma           # Database models and relations
│   └── seed.js                 # Database seed script for development
├── src/
│   ├── app/                    # Next.js page routes & route handlers
│   │   ├── api/                # REST API Endpoints (Auth, Bills, Properties, Webhooks...)
│   │   ├── dashboard/          # Owner & Tenant Dashboards (Tabulated/Role-based pages)
│   │   ├── pay/                # Public/Tenant Payment pages
│   │   └── pricing/            # SaaS Plan tier marketing page
│   ├── components/             # Reusable UI component blocks (Dialogs, UI kit...)
│   ├── lib/                    # Shared utility layers
│   │   ├── auth.ts             # Next-Auth configuration & credentials provider
│   │   ├── prisma.ts           # Standard Prisma client instance
│   │   ├── prisma-secure.ts    # Secure Prisma client with RLS simulation & Soft Delete
│   │   ├── pricing.ts          # SaaS plan tiers and resource limits logic
│   │   └── rate-limit.ts       # Rate limiters (Redis + In-memory fallbacks)
│   └── middleware.ts           # Route protection and role verification middleware
├── tests/                      # Vitest test suite
│   ├── api/                    # Route handlers and API logic testing
│   └── lib/                    # Local utility logic testing
├── vercel.json                 # Vercel serverless configuration (Singapore regionSIN1)
└── package.json                # Dependencies and npm script runner
```

---

## 3. Database Architecture (Prisma Schema)

Below are the core models defined in `prisma/schema.prisma`:

### User & Authentication
*   **User:** Stores profile information, passwords, role (`ADMIN`, `OWNER`, `TENANT`), plan details (`FREE_TRIAL`, `STARTER`, `GROWTH`, `ENTERPRISE`), and LINE binding identifiers.
*   **Account / Session:** Next-Auth schema mappings for OAuth logins (LINE).

### Property & Room Management
*   **Property:** Represents a building/apartment complex owned by an `OWNER`. Holds utility rates (electric/water), default fees (common fee, parking, internet), default check-in values (deposits, advance rent), and tenant reporting configurations (`enableTenantReport`, `reportStartDay`, `reportEndDay`).
*   **Room:** Represents a specific unit inside a property. Holds rent prices, status (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`), initial meter numbers (`waterMeterStart`, `electricMeterStart`), and gallery images.

### Tenant & Contract Details
*   **Tenant:** Detailed personal data (Name, ID Card/Passport, Phone, Address), lease date ranges, deposit amount, and LINE identifiers. Links to a specific `Room` and `User`.

### Billing & Transactions
*   **Bill:** Monthly billing records. Tracks water/electricity units (current vs. previous), base rent, additional fees, payment status (`UNPAID`, `PENDING_REVIEW`, `PAID`, `OVERDUE`), slip image, and invoice approvals.
*   **Invoice:** SaaS platform invoices generated for owners subscribing to paid plan tiers.

### Utility & Communication
*   **MaintenanceRequest:** Repair requests submitted by tenants. Tracks categories, urgency, description, photos, and status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`).
*   **Parcel:** Mail/package tracking for rooms. Tracks carrier, tracking numbers, status (`ARRIVED`, `COLLECTED`), and pickup verification photos.
*   **MeterSubmission:** Monthly self-reported meter readings submitted directly by tenants via their dashboard.
*   **SmsAddon:** Prepaid SMS top-ups bought by owners.

---

## 4. Key Core Business Logic & Security

### 4.1. Row-Level Security (RLS) Simulation (`src/lib/prisma-secure.ts`)
Instead of database-level RLS, the application enforces access isolation via Prisma Client extensions:
*   **OWNER Policy:** Automatically appends `where: { ownerId }` on `Property` queries, and `where: { property: { ownerId } }` on dependent models (`Room`, `Tenant`, `Bill`, `Parcel`, `MaintenanceRequest`).
*   **TENANT Policy:** restrains access to the tenant's own `Room`, `Bill`, `Parcel`, and `MaintenanceRequest` records based on the session `roomId`.
*   **Soft Delete:** Mutates `delete` and `deleteMany` calls into `update` / `updateMany` setting `isDeleted: true`, and filters out deleted records during find operations system-wide.

### 4.2. Automatic Slip Verification (`src/app/api/bills/[id]/pay/route.ts`)
*   Integrates with **SlipOK API** to scan the uploaded bank transfer slip QR code.
*   Checks for transfer sender, date/time, and ensures the transacted amount matches the bill total.
*   Prevents duplicate slip uploads (double-spending attacks) by verifying the payload signature.

### 4.3. Timezone & Testing Guards (`tests/api/meter-submissions.test.ts`)
*   The billing cycles and self-reporting meters are strictly bound to calendar date ranges (e.g., reporting is only open between day 20 and day 24 of the month).
*   Testing uses `vi.useFakeTimers()` to mock dates to fall inside the valid windows, avoiding test failures based on execution date.

### 4.4. State Lock / Approved Guard (`src/app/api/bills/[id]/approve/route.ts`)
*   Once a bill's payment status is updated to `PAID`, further modifications, uploads, or status overrides are locked to prevent transaction manipulation.

---

## 5. API Endpoint Maps

*   `/api/auth/` - Sign-in, sign-up, password reset, and LINE account binding code.
*   `/api/properties/` - Property CRUD operations and default billing configurations.
*   `/api/rooms/` - Room CRUD operations, initial meters, and AI-generated rental listing description drafts.
*   `/api/tenants/` - Tenant check-in, check-out, personal profile updates, and lease PDF parsing.
*   `/api/bills/` - Generating monthly bills, bulk bills, checking payments, and uploading QR slip images.
*   `/api/maintenance/` - Maintenance request pipeline (tenants submit, owners update progress).
*   `/api/parcels/` - Logging incoming mail/parcels, notifying tenants, and registering pickups.
*   `/api/tenant/meter-submission/` - Tenant self-reporting meter endpoint.
*   `/api/webhook/line/` - LINE Messaging Webhook for automated chatbot responses, bindings, and notifications.

---

## 6. Current Implementation Status

Below is the completeness audit of the system pages:

| Path / Route | Description | Status | Details / Implementation |
| :--- | :--- | :---: | :--- |
| `src/app/dashboard/page.tsx` | Main Dashboard Overview | **Complete** | Stat cards, charts, and quick actions |
| `src/app/dashboard/properties` | Property Management | **Complete** | Property CRUD, defaults, tax config |
| `src/app/dashboard/rooms` | Room Management | **Complete** | Room grid, details, print onboarding card |
| `src/app/dashboard/tenants` | Tenant Management | **Complete** | Check-in, check-out, LINE profile sync |
| `src/app/dashboard/billing` | Billing Pipeline | **Complete** | Bill calculations, slip reviews, invoice generation |
| `src/app/dashboard/maintenance` | Maintenance Hub | **Complete** | Tenant tickets, owners assign & update |
| `src/app/dashboard/parcels` | Parcel Hub | **Complete** | Logging incoming mail, barcodes, pickups |
| `src/app/dashboard/meters` | Meter Registry | **Complete** | Monthly water/electric reading submissions |
| `src/app/dashboard/analytics` | Income Analytics | **Complete** | Income charts, utility rate breakdowns |
| `src/app/dashboard/settings` | General Settings | **Complete** | System configurations |
| `src/app/dashboard/my-bills` | Tenant Bill Portal | **Complete** | Listing bills, uploading payment slips |
| `src/app/dashboard/my-contract` | Tenant Lease Portal | **Complete** | Viewing and signing lease agreements |
| `src/app/dashboard/my-account` | Tenant Profile Portal | **Complete** | Personal detail forms, password updates |
| `src/app/pay/[id]` | Direct Payment Page | **Complete** | Bank QR Code and slip upload form |
| `src/app/pricing` | SaaS Pricing Tiers | **Complete** | Marketing pricing tables |

---

## 7. Instructions for Claude (Audit Focus Areas)

When you review this codebase, focus on checking the following critical components:
1.  **Security Boundaries (IDOR):** Check if any custom API route in `src/app/api/` bypasses `getSecurePrisma` and uses base `prisma` directly without manually enforcing `where: { ownerId }` or `where: { userId }`.
2.  **SaaS Limit Enforcement:** Audit if the starter or growth plan resource limits (e.g. room count limits) are bypassable during creation.
3.  **Slip Verification Edge Cases:** Check if SlipOK verification handlers correctly protect against replay attacks or date-mismatch bypasses.
4.  **Transaction Safety:** Ensure that modifying active billing states enforces the `Approved / Paid` lock, preventing double submission or overwrite of processed records.
