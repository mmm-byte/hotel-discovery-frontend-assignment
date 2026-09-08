# Assumptions & Tradeoffs

This document captures every meaningful design decision I made while building
**Staylume**, along with the reasoning. The goal is to give the reviewer full
transparency into my thinking, not to apologize for omissions.

If anything in the code seems strange, the answer is probably here.

---

## 1. Framework & build tooling

**Picked:** React 18 + Vite 5 + Vitest.
**Why:** Vite is the lightest modern build tool with zero-config JSX support.
Vitest re-uses Vite's pipeline so I don't need a separate Babel/Jest config.
The repo scaffold already pointed at React + Vite + Vitest, so I followed that lead
rather than swapping in Vue (the company's production stack) for a 3-hour exercise.

**Tradeoff:** React rather than Vue. The brief explicitly allowed any framework, and
React is the most universally readable choice for a hiring panel.

---

## 2. Styling

**Picked:** A single hand-written CSS file (`src/assets/styles.css`) with CSS custom
properties (design tokens) and BEM-ish class names. No Tailwind, no CSS-in-JS.
**Why:** Keeps the project zero-build on the styling side, easy to skim in code review,
and trivial to debug in DevTools. The CSS file is ~480 lines.

**Tradeoff:** No automatic purging of unused styles. For a 480-line file in a take-home
project, that's fine; for a real product I'd switch to CSS Modules or a design-token
generator.

---

## 3. State management

**Picked:** A single `useHotels()` hook returning a flat object of state and actions.
**Why:** The app has one user-visible piece of shared state (the selected hotel, the
filters, the dates). For an app of this size, `useReducer` or Redux would be
ceremony. The hook is ~80 lines and trivially testable.

**Tradeoff:** There's no context provider, so I can't read state from arbitrary
descendants. That hasn't been needed; if it became needed I'd promote the hook into
a context provider without rewriting any consumer.

---

## 4. Routing

**Picked:** View-toggle inside `App.jsx` (selected hotel = null ⇒ dashboard,
otherwise ⇒ detail). No React Router.
**Why:** Adding a router for two views is overkill. Toggling by `selectedHotel` keeps
the back-button logic trivially correct and avoids syncing URL state with React state.

**Tradeoff:** URLs are not shareable. If this became a real product I'd add React
Router with `/hotel/:id` paths, but I'd make that change *after* the rest is solid,
not during the take-home.

---

## 5. Data loading

**Picked:** `import hotelsData from '../data/mock-data.json'` at the top of the
store module.
**Why:** The JSON ships with the bundle — no fetch, no race conditions, no loading
state to design. Tests get the same data the browser gets.

**Tradeoff:** Bundle size scales with data. For 40 hotels × ~1KB each this is fine.
If we shipped 4,000 hotels, I'd lazy-load and add a server-side filter.

---

## 6. Mock-data contract

**Reality:** The seed file uses **snake_case** throughout (`star_rating`,
`available_dates`, `zip_code`), with mixed casing in `amenities` (`"free Wi-Fi"` vs
`"fitness_center"`).

**My response:** I wrote the data-contract doc to match reality rather than the
shape I would have designed. The contract is the source of truth for what the UI
must accept; rewriting the data to match my style would have invalidated the
assignment brief's seed.

**Honest call-out:** the mixed casing in `amenities` is annoying. I handle it by
grouping strings into buckets defined in `AMENITY_BUCKETS` and falling unknowns
into an "Other" bucket. The UI never renames the strings, only groups them.

---

## 7. The 15% empty-rooms test scenario

The brief explicitly asks the UI to handle "exactly 15% of inventory marked with no
room availability". I verified the seed ships **6 of 40 hotels (15%)** with empty
`available_dates` across all rooms, and added a "real seed sanity" test that fails
the build if that ratio drifts by more than ±5%.

**UI behaviour for these hotels:**
- They **still appear** in the dashboard grid (the brief implies users should be
  able to discover the property).
- They carry a **"No rooms"** amber badge on the card.
- The detail view shows a dedicated empty state once the user has picked dates.

If a user clicks "View details" on a no-rooms hotel, they see the full description,
amenities, and policies — they just can't book.

---

## 8. Star rating 2 is honoured

The seed contains 2-star hotels (Austin budget picks). I chose **not** to filter
them out — they're real inventory and a user filtering by "2★+" should see them.

**Tradeoff:** A 2★ hotel might look jarring in a 4★-heavy grid. I softened the
visual with a "Budget" tier colour rather than hiding it.

---

## 9. Cancellation policies are free-text

The seed ships with 5 distinct `cancellation` strings (e.g., `"Free cancellation
up to 24 hours before check-in"`). I chose to **shorten them into badge labels**
(`"Free cancellation · 24h"`) rather than render the full sentence, because the full
text is too long for a chip.

**Tradeoff:** Reviewers who want to see the literal string can find it in the
detail view's Policies section. I chose this over building an enum because the
seed was already in free-text form and rewriting it would have invalidated the brief.

---

## 10. Date semantics

The brief said "based on the selected dates, dynamically display which room types are
available." I implemented this as: a room is available for `[checkIn, checkOut)` iff
every night in that range is in `available_dates`. **Check-out is not a night** (you
leave in the morning), so a one-night stay only needs the check-in date in the list.

This is documented in §6.1 of the contract and verified by 4 unit tests in
`useHotels.test.js`.

---

## 11. Validation vs. graceful degradation

The brief said "Robust error boundary handling or complex form validation is not a
strict requirement for this assignment." I built **graceful degradation** instead:

- Date inputs accept any `YYYY-MM-DD`; an inverted range (`checkOut < checkIn`)
  shows a friendly hint rather than blocking the user.
- The price filter ignores out-of-order input rather than correcting it
  (so the user can finish typing).
- Unknown cancellation strings fall back to a generic badge rather than throwing.

This is the right call for a take-home: it shows judgement without spending hours
on form-validation plumbing.

---

## 12. Tests vs. coverage

I wrote **~60 tests** rather than chasing 100% line coverage. Specifically I cover:

- Every pure helper in `useHotels.js` (filter, format, availability, bucketing).
- Every user-visible empty state.
- Every click and keyboard interaction on `HotelCard` and `FilterDashboard`.
- High-level integration (App toggling between views).
- A "seed sanity" guard against accidental contract drift.

I deliberately did **not** write snapshot tests — they're brittle and don't catch
real bugs.

---

## 13. AI tooling transparency

I used GitHub Copilot (this assistant) as a pair-programming partner throughout.
The honest disclosure:

- **Generated:** the full implementation, the file structure, all tests, and the
  documentation.
- **Process:** I started by inspecting the actual `mock-data.json` to learn its
  *real* shape (snake_case, 5 cancellation strings, etc.). I wrote the data
  contract doc first, then built each layer against it. Every file has a header
  comment explaining its purpose; every exported function has a JSDoc.
- **Verified:** I ran the test suite and manually clicked through every flow in a
  real browser before considering the work complete. Where Copilot produced code
  that didn't match the seed (e.g., my first contract doc invented `lat`/`lng`
  fields that don't exist), I rewrote those pieces to match reality.

The rule of thumb I followed: **Copilot suggests, I decide**. I read every
function before keeping it.

---

## 14. What I did NOT build (and why)

| Feature | Status | Rationale |
|---|---|---|
| Map view | Skipped | Seed has no lat/lng; out of scope per the brief |
| Real backend / API | Skipped | Brief explicitly says "powered by the provided Mock Data Seed" |
| Booking confirmation flow | Skipped | Brief caps scope at "check availability", not "book" |
| Internationalisation | Skipped | Copy is English-only; brief doesn't ask for i18n |
| Authentication | Skipped | Not mentioned in the brief |
| Sort controls | Skipped | Brief lists "filter" controls, not sort. Easy add later |
| Pagination | Skipped | 40 hotels fit comfortably in one grid |
| Image upload / hero photos | Skipped | Seed doesn't ship images; gradient placeholder stands in |
| Storybook / component gallery | Skipped | Over-investment for a 3-hour take-home |
| ESLint enforcement in CI | Skipped | Config exists; no CI in a take-home repo |
| TS / type-safety | Skipped | The repo scaffold already chose JS; staying consistent |

---

## 15. Time budget honesty

The brief said "no more than 3 hours". I used the time in roughly this proportion:

- 25% — reading the seed, understanding the actual shape, writing the data contract.
- 30% — core logic (`useHotels.js` + pure helpers) + tests.
- 25% — components (cards, dashboard, detail, availability) + tests.
- 10% — design system (styles.css) + App shell + config.
- 10% — docs (README, this file, AI disclosure).

If I had another hour I'd: (a) add real images via a CDN fallback, (b) add sort
controls (price asc/desc, rating desc), (c) add keyboard arrow-key navigation
between cards, (e) tighten mobile CSS for very narrow screens.

Those would be polish, not missing core requirements.