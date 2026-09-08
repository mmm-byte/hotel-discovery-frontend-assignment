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

Leveraged GitHub Copilot and ChatGPT to accelerate the full development lifecycle through strategic prompting and strict human oversight:
* **Research & Planning:** Used AI to analyze existing solutions, define system architecture, and map out technical prerequisites before development.
* **Guided Execution:** Provided precise, detailed instructions to scaffold component shells, CSS, and initial testing workflows.
* **Quality Assurance:** Designed AI-assisted testing processes. All AI-generated code was rigorously reviewed, manually refined, and tested before committing.

