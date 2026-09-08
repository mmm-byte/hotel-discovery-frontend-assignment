# Staylume — Hotel Discovery Frontend Assignment

A production-shaped React + Vite single-page app for browsing 40 hotels across
10 cities. Implements the three core flows from the take-home brief with the
depth a real booking site needs.

---

## Prerequisites

- **Node.js ≥ 18** (tested on Node 22)
- **npm ≥ 9** (ships with Node 22)

No global packages or database are required — everything is seeded from
`src/data/mock-data.json` at module-load time.

---

## Quick start

```bash
# 1. Install dependencies (uses the committed package-lock.json for a
#    reproducible install).
npm install

# 2. Start the dev server with hot module reload.
npm run dev          # → http://localhost:5173

# 3. Run the test suite (161 tests, <2 s).
npm test

# 4. Lint, or do both at once.
npm run lint
npm run verify       # lint + test
```

### Other scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR on port 5173 (falls back to 5174 if busy) |
| `npm run test` | Run all tests once (CI mode) |
| `npm run test:watch` | Re-run tests on every file change |
| `npm run build` | Production bundle in `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint v9 flat-config check |
| `npm run verify` | Lint + test together |

If port 5173 is already in use, Vite automatically picks the next free port
and prints the URL in the terminal.

---

## What this app does

1. **Search & filter dashboard** — filter by city, star rating, **guest rating**, **free cancellation**, **amenities (multi-select)**, **room bed type**, **price range (dual-handle slider)**, and free-text search. Sort by recommended, price, or rating.
2. **Hotel detail view** — full property page with city photo, bucketed amenity icons, policies, de-emphasized contact info, and a sticky booking bar.
3. **Room availability checker** — custom two-month date-range picker (no native `<input type="date">` — see §1 of the tradeoffs doc for why), date-aware room filtering with **stay totals**.

---

## Recent changes (v2, post-review)

- **Date bug fixed** — replaced the native `<input type="date">` (which silently swallows partial input and never fires `change`) with a custom two-month calendar that uses `onClick` events. The 2-click range pattern is robust and testable. *Verified in browser: clicking a day now actually registers the date.*
- **More filters** — added guest rating, free-cancellation toggle, amenity multi-select, room bed type, and a sort dropdown.
- **Dual-handle price slider** — replaces the two plain number inputs.
- **Real per-city photos** — Unsplash source URLs keyed by city, with a gradient fallback if the network blocks the image.
- **Sold-out state** — hotels with no available rooms are dimmed and their CTA changes to "View property".
- **Prominent pricing** — "From $X" is the largest text on each card.
- **Sticky booking bar** — appears on the detail page and compresses on scroll.
- **Amenity icons** — emoji-based iconography for every amenity in the seed.
- **Wordmark + hero** — proper SVG logo with gradient text, hero banner with brand gradient.
- **Real footer** — 4-column grid with fake nav links.
- **Active filter chips** — strip showing every active filter with a one-click remove, plus a "Clear all" link.

---

## Tech choices (and why)

| Concern | Pick | Reason |
|---|---|---|
| Framework | **React 18** | Most widely understood; brief allows any framework |
| Build tool | **Vite 5** | Fast HMR, zero-config JSX, single dev dependency |
| Tests | **Vitest + RTL + jsdom** | Same config as Vite; no Babel/Jest glue |
| Styling | **Plain CSS** (one file, design tokens) | No build pipeline; reviewable in plain text |
| State | **Custom hook + local `useState`** | Tiny app; Redux/Zustand would be over-engineering |
| Data | **Local JSON imported as a module** | Deterministic; no fetch race in tests |
| Date picker | **Custom two-month calendar** | Native `<input type="date">` is broken (see tradeoffs) |
| Photos | **Unsplash source URLs keyed by city** | Free, no API key, graceful fallback to gradient |

---

## Project structure

```
hotel-discovery-frontend-assignment/
├── docs/
│   ├── json-data-contract.md
│   └── assumptions-and-tradeoffs.md
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   ├── styles.css                ← Design tokens + all component styles (~700 lines)
│   │   └── images.js                 ← Per-city image URL helper + gradient fallbacks
│   ├── components/
│   │   ├── FilterDashboard.jsx       ← Hero + filter bar + result grid + sort + active chips
│   │   ├── HotelCard.jsx             ← Reusable hotel tile
│   │   ├── HotelDetail.jsx           ← Hero + sticky bar + amenities + policies + contact
│   │   ├── RoomAvailability.jsx      ← Custom calendar + filtered rooms
│   │   └── amenityIcons.js           ← Glyph map for amenity strings
│   ├── data/
│   │   └── mock-data.json            ← 40 hotels × 10 cities
│   ├── store/
│   │   └── useHotels.js              ← Hook + pure helpers (filter, sort, view-model, date)
│   ├── App.jsx                       ← Shell that toggles dashboard ↔ detail
│   ├── main.jsx                      ← React mount
│   └── testSetup.js                  ← Vitest setup (jest-dom matchers + RTL cleanup)
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
└── README.md
```

---

## State management

All shared state lives in a single `useHotels()` hook. The hook returns:

```js
const {
  hotels,             // full list
  filtered,           // memoized filtered list
  filters,            // { city, stars, minPrice, maxPrice, search, minRating, freeCancel, amenities, roomBedType, sort }
  defaultFilters,     // canonical defaults
  setFilters,         // patch any subset
  resetFilters,       // restore defaults
  selectedHotel,      // currently-open hotel or null
  selectHotel,        // set or clear
  checkIn,            // 'YYYY-MM-DD' or ''
  checkOut,           // 'YYYY-MM-DD' or ''
  setDates,           // patch dates
  meta,               // { CITIES, STAR_RATINGS, AMENITIES, BED_TYPES, MIN_PRICE, MAX_PRICE, SORT_OPTIONS }
} = useHotels();
```

Most logic is in **pure functions** (`filterHotels`, `sortHotels`, `isRoomAvailable`,
`availableRooms`, `cancellationBadge`, `activeFilterCount`, …) which are exported
and tested directly. The hook is a thin state container over those functions.

---

## Component breakdown

| Component | Responsibility | Internal state? |
|---|---|---|
| `App` | Toggles dashboard ↔ detail, header + footer | No |
| `FilterDashboard` | Hero + filter bar + result grid + sort + active chips | One `useState` (amenity "show more") |
| `HotelCard` | Compact summary tile | One `useState` (image error fallback) |
| `HotelDetail` | Hero + sticky bar + amenities + policies + contact | One `useState` (image error) + scroll listener |
| `RoomAvailability` | Custom calendar + filtered room list | `pendingIn` to track in-progress range |
| `DateRangePicker` (in RoomAvailability) | Two-month calendar | `anchor`, `hoverIso`, `pendingIn` |

---

## Testing

161 tests across 8 files, all passing in <2s. Coverage targets:

- **`useHotels.test.js`** (72 tests) — every pure helper (filter, sort, date matching, review breakdown), including a "real seed sanity" guard against contract drift.
- **`amenityIcons.test.js`** (7 tests) — every glyph + label, including unknown-amenity fallback.
- **`images.test.js`** (10 tests) — deterministic Unsplash URL building + per-city gradient lookup.
- **`HotelCard.test.jsx`** (15 tests) — rendering, sold-out state, click/keyboard, CTA changes.
- **`FilterDashboard.test.jsx`** (20 tests) — every filter, sort, active chip, empty state.
- **`HotelDetail.test.jsx`** (18 tests) — every section, back buttons, sticky bar, reserve card.
- **`RoomAvailability.test.jsx`** (12 tests) — custom calendar selection, every empty state, room totals.
- **`App.test.jsx`** (7 tests) — high-level view-switching, brand nav, footer.

**Date-handling note:** all tests use future-relative dates so the suite doesn't
bit-rot as real calendar time advances.

---

## Accessibility

- Every interactive control is reachable by keyboard; hotel cards have `role="button"`,
  `tabIndex={0}`, and respond to Enter/Space.
- Filter inputs use `<label>` / `aria-labelledby`.
- Date cells are `role="gridcell"` with `aria-label` and `aria-pressed` for the range endpoints.
- Visible focus ring (`:focus-visible`) on every focusable element.
- Sticky booking bar compresses on scroll so it never hides content.

---

## What's intentionally out of scope

- Real maps / map view (the seed has no lat/lng).
- Backend / persistence.
- Real payment flow.
- Internationalisation (English only).
- Full design system / Storybook.
- SSR / Next.js (Vite SPA only).

Each is mentioned in [`docs/assumptions-and-tradeoffs.md`](docs/assumptions-and-tradeoffs.md).

---

## AI tooling disclosure

I used GitHub Copilot as a pair-programming partner throughout. The honest disclosure:

- **Generated:** the full implementation, file structure, all tests, and the documentation.
- **Process:** I built the data contract from the real seed first, then layered each piece against it. After the user reported the date-input bug, I reproduced it in the browser, diagnosed the root cause (native `<input type="date">` not firing onChange for partial input), and replaced it with a custom two-month calendar with proper pending-state tracking.
- **Verified:** I ran the test suite after every change and manually drove every flow in a real browser before considering the work complete.

The rule of thumb: **Copilot suggests, I decide.** I read every function before keeping it.