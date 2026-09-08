# Staylume — Hotel Discovery (Frontend Take-Home)

A lightweight React + Vite single-page app for browsing 40 hotels across
10 cities. Implements the three required flows — filterable dashboard,
hotel detail view, and date-aware room availability — with a clean
separation between UI and data-handling logic.

**Stack:** React 18 · Vite 5 · Vitest + Testing Library · plain CSS.

---

## Install, run, and test

Requires Node.js ≥ 18 and npm ≥ 9. No global packages or databases needed —
the dataset is bundled in `src/data/mock-data.json`.

```bash
npm install      # install dependencies
npm run dev      # start the dev server → http://localhost:5173
npm test         # run the test suite
npm run build    # production bundle in dist/
npm run lint     # ESLint check
```

`npm run verify` runs `lint` + `test` together. If port 5173 is busy, Vite
automatically uses the next free port and prints the URL.

---

## Project structure

```
src/
├── App.jsx                       # shell: toggles dashboard ↔ detail
├── main.jsx                      # React entry
├── testSetup.js                  # Vitest setup (jest-dom + RTL cleanup)
├── components/
│   ├── FilterDashboard.jsx       # hero + filter bar + result grid + sort + active chips
│   ├── HotelCard.jsx             # compact hotel tile
│   ├── HotelDetail.jsx           # hero + sticky bar + amenities + policies + contact + reserve card
│   ├── RoomAvailability.jsx      # custom two-month calendar + filtered room list
│   └── amenityIcons.js           # glyph map for amenity strings
├── store/
│   └── useHotels.js              # hook + pure helpers (filter, sort, view-model, date logic)
├── data/
│   └── mock-data.json            # 40 hotels × 10 cities (seeded at module-load)
└── assets/
    ├── styles.css                # design tokens + component styles
    └── images.js                 # per-city Unsplash photo URLs + gradient fallbacks
```

---

## State management

All shared state lives in a single `useHotels()` hook. It returns:

```js
const {
  hotels,            // full list (immutable for the session)
  filtered,          // memoized filtered list
  filters,           // { city, minStars, minPrice, maxPrice, search, minRating,
                     //   freeCancel, amenities, roomBedType, sort }
  defaultFilters,    // canonical defaults (used for diffing)
  setFilters,        // patch any subset of filters
  resetFilters,      // restore defaults
  selectedHotel,     // currently-open hotel or null
  selectHotel,       // set or clear
  checkIn,           // 'YYYY-MM-DD' or ''
  checkOut,          // 'YYYY-MM-DD' or ''
  setDates,          // patch dates
} = useHotels();
```

Most logic lives in **pure functions** exported alongside the hook
(`filterHotels`, `sortHotels`, `isRoomAvailable`, `availableRooms`,
`cancellationBadge`, `activeFilterCount`, `recommendDateWindows`, …) and
is tested directly without React. The hook itself is a thin state
container over those functions.

Filter and date state are combined into a single memoized `filtered`
value — picking dates at the top level automatically hides hotels that
cannot accommodate the stay.

---

## Component breakdown

| Component | Responsibility | Internal state |
|---|---|---|
| `App` | Routes between dashboard and detail; renders header + footer | none |
| `FilterDashboard` | Hero, filter bar, result grid, sort dropdown, active-filter chips | one `useState` (amenity "show more") |
| `HotelCard` | Compact summary tile (image, stars, price, CTA) | one `useState` (image error fallback) |
| `HotelDetail` | Hero, sticky booking bar, amenities, policies, contact, reserve card | one `useState` (image error) + scroll listener + save toggle |
| `RoomAvailability` | Custom calendar + filtered room list with stay totals | `pendingIn` (in-progress range start) |
| `DateRangePicker` (inside `RoomAvailability`) | Two-month calendar with prev/next nav and hover preview | `anchor`, `hoverIso`, `pendingIn` |

Each component is **controlled** — all filter / date / selection state is
owned by `useHotels()` and passed in via props, which keeps the components
easy to test in isolation and easy to coordinate across views.

---

## Data modeling

The app treats `src/data/mock-data.json` as the single source of truth,
loaded once at module scope and never mutated. Two shapes drive the UI:

- **Hotel** — `id`, `name`, `description`, `star_rating`, `overall_rating`,
  `review_count`, `address` (street/city/state/zip/country), `contact`
  (phone/email), `amenities[]`, `policies` (check-in/check-out times,
  cancellation text), and `rooms[]`.
- **Room** — `room_id`, `type`, `bed_type`, `bed_count`, `max_occupancy`,
  `square_footage`, `price_per_night`, `room_amenities[]`, and
  `available_dates[]` (an explicit list of ISO nights the room can be
  booked, rather than a date range — this matches the provided seed and
  lets availability be computed with a simple set lookup instead of range
  math).

All derived values — cheapest room price, cancellation badge text, rating
tier, review-score breakdown — are computed from these two shapes by pure
functions in `useHotels.js`, never hard-coded in components. The full
field-by-field contract, including which fields are required vs. optional
and how the UI degrades if a field is missing, is documented in
[`docs/json-data-contract.md`](docs/json-data-contract.md).

---

## Notes on edge cases and assumptions

The dashboard handles empty filter results with a clear message and a
"Reset filters" affordance. The room-availability section handles four
distinct empty states: no rooms at the hotel, no dates picked, no rooms
available for the chosen dates (with suggested date windows), and past
dates (disabled in the calendar). Full discussion of tradeoffs lives in
[`docs/assumptions-and-tradeoffs.md`](docs/assumptions-and-tradeoffs.md),
and the data contract that drives every UI choice lives in
[`docs/json-data-contract.md`](docs/json-data-contract.md).

---

## AI tooling usage

I used GitHub Copilot and ChatGPT during development, primarily for
scaffolding and first-draft generation, with all logic reviewed, tested,
and in several cases corrected by hand before it was committed.

**Where AI helped:**
- Scaffolding boilerplate — the initial Vite/React project setup, ESLint
  config, and first-draft component shells for `FilterDashboard`,
  `HotelCard`, `HotelDetail`, and `RoomAvailability`.
- First-draft unit and component tests, which I then edited to cover the
  specific edge cases in this assignment (e.g., a room available for
  three consecutive nights but not the fourth, hotels with zero rooms,
  invalid check-out-before-check-in ranges).
- Drafting CSS for the design system (tokens, card layout, responsive
  breakpoints) which I then adjusted for contrast, spacing, and mobile
  behavior.

**Where I made the calls myself:**
- The core availability rule — a room only counts as available if
  *every* night of the selected stay appears in its `available_dates`
  array, not just the check-in date — was a decision I made and tested
  explicitly, since getting this wrong would silently show rooms that
  aren't actually bookable for the full stay.
- I found and fixed a real bug in AI-generated code: an early version
  used a native `<input type="date">` for the range picker, which
  silently swallowed partial input and never fired `onChange` reliably.
  I diagnosed this in the browser and replaced it with a custom
  two-month calendar component using click-based state instead.
- Data-contract decisions (which JSON fields are required vs. optional,
  how components degrade when a field is missing) were made by reading
  the provided mock data directly, not generated.

**What I did not do:** I did not accept AI-generated code without running
it, and I did not use AI to write the assumptions/tradeoffs documentation
in [`docs/assumptions-and-tradeoffs.md`](docs/assumptions-and-tradeoffs.md)
— that reflects my own reasoning about scope and design decisions.
