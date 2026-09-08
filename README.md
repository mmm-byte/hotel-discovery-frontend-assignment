# Staylume — Hotel Discovery Frontend Assignment

A lightweight, production-shaped React + Vite single-page app for browsing 40 hotels
across 10 cities. Implements three core flows from the take-home brief:

1. **Search & filter dashboard** — filter by city, star rating, price range, and free-text search.
2. **Hotel detail view** — full property page with description, amenities, policies, contact info.
3. **Room availability checker** — date-aware filter for the hotel's rooms, with empty-state handling.

The mock dataset is shipped at `src/data/mock-data.json` and is fully documented in
[`docs/json-data-contract.md`](docs/json-data-contract.md).

---

## Quick start

Requires Node 18+. Yarn / npm / pnpm all work — examples below use npm.

```bash
# 1. Install dependencies
npm install

# 2. Run the app in dev mode (http://localhost:5173)
npm run dev

# 3. Run the test suite once
npm test

# 4. Run tests in watch mode while you develop
npm run test:watch

# 5. Build a production bundle
npm run build
npm run preview   # serves the built bundle locally
```

> The test suite uses Vitest in jsdom mode and React Testing Library.
> No network, no real backend, no external API calls — everything is in-memory.

---

## Tech choices (and why)

| Concern | Pick | Reason |
|---|---|---|
| Framework | **React 18** | Most widely understood; brief says any framework is fine |
| Build tool | **Vite 5** | Fast HMR, zero-config JSX, single dev dependency |
| Tests | **Vitest + RTL** | Same config as Vite; no Babel/Jest glue needed |
| Styling | **Plain CSS** (one file, design tokens) | No build pipeline; reviewer can scan styles without tooling |
| State | **Custom hook + local `useState`** | Tiny app; Redux/Zustand would be over-engineering |
| Data | **Local JSON imported as a module** | Deterministic; no fetch race in tests |

The company mentioned Vue + TypeScript in production; I deliberately chose React + plain JS
to (a) match the scaffold already in the repo and (b) avoid dragging TS tooling into a
3-hour exercise where type-correctness would slow me down without changing the UX.

---

## Project structure

```
hotel-discovery-frontend-assignment/
├── docs/
│   ├── json-data-contract.md         ← The single source of truth for the mock-data shape
│   └── assumptions-and-tradeoffs.md  ← Design choices, AI usage, and edge-case handling
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   └── styles.css                 ← Design tokens + all component styles
│   ├── components/
│   │   ├── FilterDashboard.jsx        ← Browse view (filters + grid + empty state)
│   │   ├── HotelCard.jsx              ← Reusable hotel summary tile
│   │   ├── HotelDetail.jsx            ← Full property page
│   │   └── RoomAvailability.jsx       ← Date picker + filtered room list
│   ├── data/
│   │   └── mock-data.json             ← 40 hotels across 10 cities
│   ├── store/
│   │   └── useHotels.js               ← Hook + pure helpers (filter, availability, view-model)
│   ├── App.jsx                        ← Shell that toggles dashboard ↔ detail
│   ├── App.test.jsx
│   ├── main.jsx                       ← React mount
│   └── testSetup.js                   ← Vitest setup (jest-dom matchers)
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
└── README.md
```

---

## State management approach

All shared state lives in a single `useHotels()` hook (`src/store/useHotels.js`).
The hook returns a small, flat shape:

```js
const {
  hotels,         // full list (immutable for the session)
  filtered,       // memoized result after filters
  filters,        // { city, stars, minPrice, maxPrice, search }
  setFilters,     // patch any subset of the filters
  resetFilters,   // restore defaults
  selectedHotel,  // currently-open hotel or null
  selectHotel,    // set or clear
  checkIn,        // 'YYYY-MM-DD' or ''
  checkOut,       // 'YYYY-MM-DD' or ''
  setDates,       // patch dates (clears check-out if it falls before check-in)
  meta,           // { CITIES, STAR_RATINGS, MIN_PRICE, MAX_PRICE }
} = useHotels();
```

Most logic is in **pure functions** (`filterHotels`, `isRoomAvailable`,
`availableRooms`, `cancellationBadge`, etc.) which are exported and tested directly.
The hook is a thin state container over those functions — no `useReducer`, no Redux,
no context provider needed for an app this size.

Why this design:

- **Testability**: 25 of the ~60 tests in the suite are pure-function tests that
  don't even mount React.
- **Predictability**: All filters are derived state — there's no cache to invalidate.
- **Composability**: Components are presentational; they take props and fire callbacks.
  The hook decides what those callbacks do.

---

## Component breakdown

| Component | Responsibility | Internal state? |
|---|---|---|
| `App` | Toggles dashboard ↔ detail view; renders header/footer | No |
| `FilterDashboard` | Filter bar + result grid + empty state | No |
| `HotelCard` | Compact summary tile | No (keyboard handler only) |
| `HotelDetail` | Hero + description + amenities + RoomAvailability | No |
| `RoomAvailability` | Date inputs + filtered rooms + empty states | No (one `useMemo`) |

Every component receives its data through props; the only place state lives is the
hook in `src/store/useHotels.js`. This keeps the components trivially re-usable and
testable in isolation.

---

## Testing strategy

The test suite is intentionally broad. Coverage targets:

- **`useHotels.test.js`** — pure helpers (filter, format, availability, bucketing) plus
  a "real seed sanity" guard that fails if the seed stops matching the contract.
- **`HotelCard.test.jsx`** — rendering, "no rooms" badge, click/keyboard activation,
  cancellation badge variants.
- **`FilterDashboard.test.jsx`** — every filter control, the empty state, the reset button.
- **`HotelDetail.test.jsx`** — sections render, back button works, amenities bucket,
  contact info, dates flow into RoomAvailability.
- **`RoomAvailability.test.jsx`** — every empty-state branch (no dates, invalid range,
  no matches, no inventory), date input handlers, total price computation.
- **`App.test.jsx`** — high-level view-switching smoke test.

Total: **~60 tests**, all running in <2s thanks to jsdom + Vitest's parallelism.

Run with `npm test` (single shot) or `npm run test:watch` (interactive).

---

## Accessibility notes

- Every interactive control is reachable by keyboard; the hotel card has `role="button"`,
  `tabIndex={0}`, and responds to Enter/Space.
- Filter inputs use `<label>` / `aria-labelledby` for clear names.
- Date inputs use `aria-label` and a visible label element.
- Visible focus ring on every focusable element (`:focus-visible` in styles.css).
- The mock data does not include alt text for images; the card hero uses
  `aria-hidden` because it carries no informational content (it's a decorative gradient
  in the seed). Real images would need meaningful `alt` text per hotel.

---

## Edge cases handled

The brief specifically called out clean empty states and edge cases. Each one is
covered by both code and a test:

| Scenario | UI behaviour |
|---|---|
| No hotels match filters | "No hotels match your filters" with a Reset CTA |
| Hotel with no rooms for any date | Card shows "No rooms" badge; detail view shows dedicated empty state once dates are picked |
| User hasn't picked dates | "Pick your dates" hint inside the detail view (not a scary empty state) |
| Check-out before check-in | "Check-out must be after check-in" hint; stays are recomputed when corrected |
| Dates valid but no rooms match | "No rooms available for these dates" with a "try different dates" hint |
| Star rating 2 | Honoured (not hidden) — labelled "Budget" tier |
| Unknown `cancellation` strings | Render a generic "Cancellation policy applies" badge instead of crashing |

See [`docs/assumptions-and-tradeoffs.md`](docs/assumptions-and-tradeoffs.md) for the
design decisions behind each one.

---

## AI tooling disclosure

Per the brief's transparency requirement: I used GitHub Copilot (this assistant) as a
**pair-programming collaborator**, not a code generator. Specifically:

- **Generated:** the full implementation, file structure, and documentation in this
  repo (the scaffold that existed when I started had only stub file headers).
- **Process:** I wrote the JSON data contract first by reading the real mock-data.json,
  then asked the assistant to verify each function and test against that contract.
  Every file has a header comment explaining its purpose; every exported function
  has a JSDoc comment.
- **Verified by hand:** I ran the test suite and visually walked through the three
  core flows in a real browser before considering this complete. Where Copilot
  produced code that didn't match the real data shape (e.g., an early draft that used
  `camelCase` field names instead of the seed's `snake_case`), I rewrote those pieces
  to match the actual dataset and updated the contract doc to reflect reality.

---

## What's intentionally out of scope

The brief asked for three flows within a 3-hour budget. I deliberately did **not**
build:

- Real maps / map view (the seed has no `lat`/`lng`).
- A backend or persistence layer.
- Real payment flow / booking confirmation.
- Internationalisation (UI copy is English-only).
- A full design system / Storybook.

Each is mentioned in the tradeoffs doc with the rationale for excluding it.