---
name: project-dashboard
description: Family dashboard app — stack, device, key architecture decisions, and env var names
metadata:
  type: project
---

Full-stack Next.js 15 (App Router) wall dashboard for an iPad, deployed to Vercel.

**Why:** Always-on family display showing weather, calendars, dinner, grocery list.

**Target device:** iPad 6th gen (A10 Fusion), iPadOS 17.7.10 → Safari 17. Landscape ~1024×768.

**Stack:**
- Next.js 15 App Router (TypeScript, Tailwind CSS 3)
- Upstash Redis (`@upstash/redis`) for editable state (meals, grocery)
- `node-ical` for server-side ICS parsing
- Open-Meteo (free, no API key) for weather
- Basic Auth in middleware.ts (env var: `DASHBOARD_PASSWORD`)
- Wake Lock API + periodic hard-reload every 4 hours (memory leak prevention on A10)

**Env vars:** `TZ_NAME`, `NEXT_PUBLIC_TZ_NAME`, `WEATHER_LAT`, `WEATHER_LON`, `ICS_URLS`, `ICS_LABELS`, `ICS_COLORS` (optional), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DASHBOARD_PASSWORD`

**Design system:** Almanac — editorial serif aesthetic, Day/Night themes using OKLCH color tokens, three font families: Cormorant Garamond (display/clock), Spectral (text), JetBrains Mono (labels). Design source: `claude.ai/design` project `97c49ab9-f496-4115-a92e-4d1dc24642c2`, file `ui_kits/dashboard/index.html`. Theme persisted in `localStorage` under key `almanac-theme`; default `night`. `data-theme` attr on `<html>` drives CSS variables.

**Architecture decisions:**
- v1 scope: no AQI, no Notes strip (user's choice)
- Calendar colors: auto-palette + optional `ICS_COLORS` env var override
- Left column (380px): Clock → Agenda → Dinner → Grocery. Right column: Weather → 4-week grid
- Dinner widget: tap-to-edit on the display (modal), also editable at `/manage` (phone UI)
- Grocery: tap-to-toggle on the display; full CRUD at `/manage`

**Data model (Redis keys):** `meals:defaults` (weekday→meal), `meals:overrides` (ISO date→meal), `grocery:items` (array of `{id, text, checked}`)

**Key bug fixed:** Open-Meteo hourly/daily times are local-timezone strings — must parse hour from `split('T')[1]`, not via `new Date()` (which interprets them as UTC on Vercel's servers).

**How to apply:** When adding features or debugging, start with the spec at `family-dashboard-spec.md`.
