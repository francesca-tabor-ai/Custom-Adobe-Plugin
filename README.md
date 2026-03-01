# Brand Sync & Governance

Adobe UXP plugin (InDesign + Photoshop) with a Node.js middleware that reads brand data from an existing SQLite database and lets designers apply swatches, place logos, validate compliance, and log audit events.

## Architecture

```
Airtable <-> [Python data-sync] <-> SQLite (existing)
                                       |
                              [Node.js middleware] -- reads SQLite, serves REST API
                                       |
                              [UXP Plugin] -- InDesign + Photoshop panels
```

## Monorepo Structure

```
packages/
  shared/        Shared TypeScript types (BrandPayload, API contracts, audit events)
  middleware/    Express service -- SQLite reader, JWT auth, brand API, audit logging
  plugin/        Adobe UXP plugin -- adapters, UI components, offline cache
```

### Middleware

| Route | Description |
|---|---|
| `POST /auth/login` | Email + shared secret -> JWT |
| `POST /auth/refresh` | Extend JWT |
| `GET /brands` | List active brands |
| `GET /brands/:id/payload` | Full normalized BrandPayload (supports ETag 304) |
| `GET /assets/:id/file` | Stream asset binary |
| `POST /audit/events` | Write audit records |
| `GET /health` | DB connectivity check |

### Plugin

- **Host adapters** for InDesign and Photoshop (swatch injection, logo placement, color/disclaimer validation)
- **Offline-first** caching via localStorage with ETag revalidation
- **Audit logger** with batched flush and offline queue persistence
- **Spectrum Web Components** UI (SignIn -> BrandSelector -> BrandDashboard)

## Prerequisites

- Node.js >= 20
- The existing SQLite database from the Python data-sync pipeline (or use the seed script)

## Setup

```bash
# Install dependencies
npm install

# Seed a development database (creates packages/middleware/data/brand-seed.sqlite)
npm run seed

# Copy and configure environment
cp .env.example packages/middleware/.env
# Edit packages/middleware/.env -- set DATABASE_PATH to your seed or production DB
```

## Development

```bash
# Start the middleware dev server (default port 3200)
npm run dev:middleware

# Build all packages
npm run build

# Run tests
npm test
```

## Loading the Plugin

1. Open Adobe InDesign or Photoshop
2. Launch the **UXP Developer Tool**
3. Click **Add Plugin** and select `packages/plugin/manifest.json`
4. Load the plugin -- the Brand Sync panel appears
5. Sign in with an allowed email and the shared secret
6. Select a brand, then apply swatches, place logos, or run validation

## Plugin Features

| Feature | InDesign | Photoshop |
|---|---|---|
| Apply color swatches | Named colors in Swatches panel (BS_ prefix) | batchPlay swatch descriptors |
| Place logos | Frame + place with fitting options | batchPlay placeEvent |
| Validate colors | Reads doc.colors against brand palette | Reads text layer colors |
| Validate disclaimers | Iterates doc.stories for text matching | Collects text from TEXT layers |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `../../Adobe-Templatization/data-sync/data/database.sqlite` | Path to SQLite brand database |
| `ASSET_DIR` | `../../Adobe-Templatization/data-sync/data/assets` | Directory with downloaded asset files |
| `JWT_SECRET` | -- | Secret key for signing JWTs |
| `SHARED_SECRET` | -- | Shared secret for login authentication |
| `ALLOWED_USERS` | -- | Comma-separated list of allowed email addresses |
| `PORT` | `3200` | Middleware server port |
| `AUDIT_DB_PATH` | `./data/audit.sqlite` | Path for the audit event database |

## Testing

```bash
# Run middleware unit tests (9 tests for brand-payload-builder)
npm test
```

Tests use an in-memory sql.js database with fixture data covering brands, design tokens, assets, disclaimers, claims, and market locales.
