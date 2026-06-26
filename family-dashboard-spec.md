# Family Dashboard — Build Spec

A self-hosted, always-on family dashboard for a wall-mounted iPad. Deployed to Vercel.
Shows the day's dinner, weather, and merged Google calendars, with a few small editable widgets.

This document is the spec for the build. Read **Step 0** before writing any code — the target
device is the main constraint and it shapes the whole stack.

---

## Step 0 — Target device (RESOLVED)

The display device has been confirmed:

- **Device:** iPad (6th generation), model MR7J2LL/A
- **OS:** iPadOS 17.7.10 → ships **Safari 17** (modern WebKit)
- **Storage:** 128 GB, ~72 GB free (ample for static image assets)
- **Chip:** A10 Fusion (capable but a few years old)

What this means for the build:

- **No old-Safari workarounds needed.** Safari 17 supports modern JS/CSS (container queries,
  modern syntax, etc.), so a standard Next.js build is fine. No minimal-JS fallback required.
- Still set `browserslist` to `"safari >= 17"` so the toolchain targets it cleanly.
- The A10 chip means: avoid heavy continuous animation, and **keep the periodic hard-reload**
  (see "Always-on") since long uptime on older silicon can leak memory.
- **Wake Lock API IS available** (Safari 16.4+), so the page can keep its own screen awake
  programmatically — see the updated "Always-on" section.

Still treat "renders correctly on the real iPad" as a hard acceptance criterion for every feature —
verify on-device, but expect it to just work.

---

## Goal & non-goals

**Goal:** a glanceable, always-on home screen that shows, at minimum:
today's dinner · current weather · merged Google calendars (grid + today's agenda),
plus a shared grocery list and clock. Editable bits are editable from any phone on the home network.

**Non-goals (do not build):**
- No news / headlines ticker (explicitly unwanted).
- No chore/rewards system in v1.
- No native app, no App Store distribution.
- No account system for end users — this is a single-household instance.

---

## Tech stack

- **Framework:** Next.js (App Router) — server route handlers do all external fetching.
- **Host:** Vercel, Hobby (free) tier is sufficient.
- **Persistence (for editable widgets):** any small serverless store. Recommended: **Upstash Redis**
  (available as a Vercel integration) or **Vercel Postgres / Neon**. The data is tiny (meal plan,
  grocery list, notes) so a KV store is plenty.
- **Calendar parsing:** `node-ical` (or `ical.js`) on the server.
- **Weather:** Open-Meteo — free, no API key, includes current conditions, hourly/daily,
  sunrise/sunset, and air quality. Feed it lat/long.

**Why server-side fetching is required:** fetching Google ICS feeds (and some weather endpoints)
directly from the browser hits CORS blocks. Route handlers fetch server-side and return clean JSON.

---

## Architecture

```
/app
  /display            → the wall view (read-mostly, self-refreshing)
  /manage             → edit view (meal plan, grocery, notes) — used from a phone
  /api/calendar       → fetches + merges all ICS feeds, returns normalized events JSON
  /api/weather        → fetches Open-Meteo, returns current + daily + sun times (+ AQI if enabled)
  /api/meals          → GET today's dinner + week; POST/PUT to edit defaults & overrides
  /api/grocery        → GET/POST/PUT/DELETE grocery items
  /api/notes          → GET/PUT the family notes strip
/middleware.ts        → auth gate (see Privacy)
```

The `/display` page polls the `/api/*` routes on an interval and re-renders. It holds no secrets;
all credentials (ICS URLs, store tokens) live in env vars and are only touched server-side.

---

## Features / widgets

### 1. Clock & date  *(core)*
Large current time + date. Update every second (or every 15s if minimizing repaints on old Safari).
Use the device/local timezone; default **America/New_York**, configurable via env var.

### 2. Today's dinner  *(core — see data model below)*
Shows the dinner planned for today. Tapping it (on the iPad) or editing from `/manage` (on a phone)
lets you change it. Backed by a **default weekly rotation** plus **per-date overrides**.

### 3. Weather  *(core)*
From Open-Meteo for the configured lat/long:
- Current temp + condition icon
- Today's high / low
- Precipitation chance / "rain expected around Npm"
- **Sunrise / sunset** times
- *(optional, config-flagged)* **Air Quality Index** — Open-Meteo air-quality endpoint

### 4. Calendars — month/week grid  *(core)*
Merge **multiple Google calendars** from their private ICS subscription URLs (one per calendar).
Color-code by source calendar. Show ~the next 4 weeks. Read-only.

> Note on freshness: Google caches published ICS feeds, so edits can take up to ~1 hour to appear.
> This is acceptable for a wall display. Do **not** switch to the Google Calendar API + OAuth unless
> near-real-time updates become a hard requirement (much more setup for marginal gain here).

### 5. Today's agenda  *(core)*
A time-ordered list of **only today's** events across all merged calendars. All-day events grouped
at the top. This is the most-glanced-at element — give it visual priority near the top of the layout.

### 6. Shared grocery list  *(core)*
Add / check-off / delete items. Editable from any device on the same dashboard. Synced via the store.

### 7. Family notes strip  *(optional, config-flagged)*
A single editable free-text line ("Zip's vet at 4," "Jake home late"). Editable from `/manage`.

---

## Data models (editable state)

### Meal plan — the one structurally important piece

Two layers:

```jsonc
// Default weekly rotation — auto-fills every day unless overridden.
// Keys are weekday indices 0–6 (0 = Sunday) or names; pick one and be consistent.
"defaultMeals": {
  "monday":    "Spaghetti",
  "tuesday":   "Tacos",
  "wednesday": "Stir-fry",
  "thursday":  "Sheet-pan chicken",
  "friday":    "Pizza",
  "saturday":  "Leftovers / out",
  "sunday":    "Slow cooker"
}

// One-off overrides for specific dates. Key = ISO date "YYYY-MM-DD".
// An override replaces the default for that date ONLY; it does not change the default.
"mealOverrides": {
  "2026-06-26": "Birthday dinner — sushi"
}
```

**Resolution logic for "today's dinner":**
```
todaysDinner = mealOverrides[todayISO] ?? defaultMeals[weekdayOf(todayISO)]
```

**Editing flows that must be supported:**
- Edit the **weekly default** for any weekday (changes it going forward, every week).
- Set a **one-off override** for a specific date ("this Thursday it's leftovers") without touching
  the default.
- Clear an override (falls back to the default).
- v1 is **dinner only**. If breakfast/lunch are ever wanted, extend each value to `{b, l, d}`.

### Grocery list
```jsonc
"grocery": [
  { "id": "uuid", "text": "Milk (2%)", "checked": true },
  { "id": "uuid", "text": "Bananas",   "checked": false }
]
```
Operations: add, toggle checked, delete, (optional) clear-checked.

### Notes
```jsonc
"notes": { "text": "Zip's vet at 4pm", "updatedAt": "ISO timestamp" }
```

---

## Always-on / self-refresh behavior

A wall display loads once and must not go stale or crash. Implement all three:

1. **Data polling:** re-fetch each `/api/*` source on an interval (calendar/weather every ~10 min;
   meals/grocery/notes every ~30–60s so edits from a phone appear quickly).
2. **Periodic hard reload:** `location.reload()` every few hours to clear any leaked memory / state
   drift (old Safari leaks over days of uptime).
3. **Clock tick:** independent lightweight timer for the clock so it never looks frozen.

Keep the screen awake using **both** layers:
- **Wake Lock API** (`navigator.wakeLock.request('screen')`) — supported on this device (Safari 17).
  Request it on load, and **re-request on `visibilitychange`**, since the lock is released whenever the
  tab is backgrounded or the device is briefly locked.
- **iOS-level backup:** set Auto-Lock → Never, and/or use Guided Access to pin the dashboard. This
  covers the case where the Wake Lock is dropped and not reacquired.

---

## Privacy / auth

The Vercel URL is public by default; it would expose the family calendar to anyone who finds it.

- **Minimum:** gate everything behind a shared password via `middleware.ts` (HTTP Basic Auth is fine
  for a household). Store the password in an env var.
- **`/manage` routes** must be behind auth regardless, since they write data.
- Avoid putting any secret in client-side code or the URL.

---

## Configuration / env vars

```
TZ_NAME=America/New_York
WEATHER_LAT=40.85
WEATHER_LON=-73.94
ICS_URLS=<comma-separated list of Google Calendar private ICS URLs>
ICS_LABELS=<comma-separated labels matching ICS_URLS order, for color/legend>
STORE_URL / STORE_TOKEN=<Upstash or Postgres connection vars>
DASHBOARD_PASSWORD=<for Basic Auth>
ENABLE_AQI=false
ENABLE_NOTES=false
```

Make widgets that are optional (AQI, notes) switch on/off via env flags so the layout can be tuned
without code changes.

---

## Suggested build order

1. **Scaffold + Step 0 check.** Confirm iPad Safari version, set `browserslist`, deploy a "hello world"
   to Vercel, and confirm it renders on the actual iPad before going further.
2. **Calendar pipeline.** `/api/calendar` merging ICS feeds → normalized JSON. Render the grid +
   today's agenda. (Highest-value, read-only, no store needed.)
3. **Weather.** `/api/weather` from Open-Meteo → current + daily + sun times. Add AQI behind the flag.
4. **Clock + layout.** Assemble the read-only display; tune typography/sizing for across-the-room
   legibility on the iPad.
5. **Persistence + meal plan.** Wire the store; implement the default-weekly + override model and the
   `/manage` editor; show today's dinner on the display.
6. **Grocery list.** Reuse the store + `/manage` patterns.
7. **Self-refresh + auth + notes (optional).** Add polling/reload, the auth gate, and the notes strip
   if enabled.
8. **Final on-device pass.** Leave it running on the iPad for a day; confirm no white-screen, no stale
   data, no crash.

---

## Acceptance criteria

- Renders correctly on the **actual target iPad**, not just a modern browser.
- Today's dinner reflects the override-then-default resolution and is editable from a phone.
- All configured Google calendars appear, color-coded, in both grid and today's-agenda views.
- Weather shows current conditions, today's hi/lo, precipitation, and sun times.
- Grocery edits from one device appear on the wall display within ~60s.
- The display survives 24h+ of continuous uptime without going stale or blank.
- No news ticker. No chores. Nothing exposed publicly without the password.
