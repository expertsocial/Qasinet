# QasiNet — Phase 1A: Foundation & Architecture

This document outlines the Phase 1A implementation plan for establishing the core QasiNet architecture. Based on the codebase audit, no existing Next.js framework is present in the workspace, so we will initialize the project from scratch according to the requested architecture (Next.js App Router, TypeScript, Tailwind CSS, Supabase).

## User Review Required

> [!IMPORTANT]
> **Project Initialization**
> As the directory currently only contains specification documents and logos, I will initialize a new Next.js project directly in the root directory. This will not overwrite your existing documents.

> [!WARNING]
> **Supabase Configuration**
> The current plan focuses on setting up the codebase and environment architecture. I will create the structure for Supabase integrations, but you will need to provide the Supabase URL and Anon Key in the environment variables once the foundation is set.

## Open Questions

> [!NOTE]
> Are there any specific font families you prefer for the QasiNet brand (e.g., Inter, Roboto, Plus Jakarta Sans), or should I select a modern, premium font (like Inter or Plus Jakarta Sans) that complements the fintech aesthetic?

## Proposed Changes

### Next.js Initialization
We will initialize the project in the root directory using:
`npx -y create-next-app@latest ./ --ts --tailwind --eslint --app --src-dir --use-npm --yes`

---

### Project Structure & Folders

I will create a scalable directory structure inside `src/`:

#### [NEW] `src/components/ui`
For reusable design components (buttons, inputs, cards, modals, toast).

#### [NEW] `src/features`
For domain-specific logic (e.g., `airtime`, `tv`, `admin`, `auth`).

#### [NEW] `src/services/providers`
For the core vending abstraction:
- `VendingProvider.ts` (Interface)
- `KyandaProvider.ts` (Implementation)

#### [NEW] `src/lib/kyanda`
For Kyanda-specific utilities, specifically the HMAC SHA-256 signing mechanism (e.g., `signature.ts`).

#### [NEW] `src/types`
For centralized TypeScript interfaces (e.g., `Transaction`, `KyandaResponse`).

---

### Environment Architecture

#### [NEW] `.env.example`
A template for required environment variables (Kyanda and Supabase credentials).
```env
# Kyanda API Credentials
KYANDA_BASE_URL=
KYANDA_API_KEY=
KYANDA_MERCHANT_ID=
KYANDA_SECURITY_KEY=
KYANDA_CALLBACK_URL=

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
#### [MODIFY] `.gitignore`
Ensure `.env.local` and other secrets are properly ignored.

---

### Design Foundation & Theme

#### [MODIFY] `tailwind.config.ts`
I will analyze `Qasinet logo.jpeg` and establish the design tokens:
- Primary (Premium Blue)
- Secondary (Energetic Green)
- Neutral surface colors for Light and Dark modes.
- Define radius, typography, and spacing systems.

#### [MODIFY] `src/app/globals.css`
Establish baseline styles, CSS variables for dark/light mode transitions, and clean typography.

#### [NEW] `src/components/Providers.tsx`
For wrapping the application in a Next-Themes provider to handle dark/light mode persistence.

---

### Verification Plan

### Automated Tests
- Run `npm run build` to ensure no compile or TypeScript errors.
- Run `npm run lint` to enforce code quality.

### Manual Verification
- Start the development server (`npm run dev`).
- Verify routing works for the basic structure.
- Verify the `Qasinet logo.jpeg` renders correctly on the homepage.
- Toggle between Light and Dark mode to ensure the theme system applies correctly.
