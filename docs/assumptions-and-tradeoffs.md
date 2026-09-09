# Assumptions & Tradeoffs

This document captures every meaningful design decision I made while building
**Staylume**. If anything in the code seems strange, the answer is probably here.

---

## 1. The room-availability date bug — why I didn't ship native `<input type="date">`

**The bug:** the v1 implementation used native `<input type="date">` elements.
Reviewers (correctly) reported that the fields showed the entered date visually
but the app never transitioned out of the "Pick your dates" state.

**Root cause:** native `<input type="date">` only fires `change` when the value
is a **complete, valid ISO date**. Partial typing (`07`, `07/12`, even `07/12/2026`
in some locales) is silently swallowed and no event fires. In React this is
amplified because `onChange` is wired to the native `change` event, and the
state stays out of sync with the visible field. There's no good way to
reliably detect this in user code.

**The fix:** a custom two-month calendar built from scratch:

- Renders 6×7 day grids for two consecutive months, with prev/next nav.
- Each day is a `<button role="gridcell">` with `aria-label` and `aria-pressed`.
- Range selection works via two clicks: first sets the start, second sets the
  end. A `pendingIn` state tracks the in-progress start so the second click
  within the same render cycle is treated as a completion, not a new start.
- Hover preview shows the range the user is about to commit.
- Past dates are disabled; "Clear dates" resets the range.

**Tradeoff:** ~280 lines of custom calendar code instead of a 5-line native
input. The win is reliability, full keyboard support, visual integration with
the rest of the design system, and testability (no native-input quirks).

---

## 2. Filter scope — what I expose and why

The brief said "intuitive UI controls (e.g., dropdowns, sliders, or inputs) that
allow users to filter by city, star rating, or price range" plus free-text
search. Reviewer feedback asked for more. I now expose:

- **City** (single-select dropdown)
- **Star rating** (chips: 2★ / 3★ / 4★ / 5★, single-select)
- **Guest rating** (dropdown: Any / 4.7+ / 4.5+ / 4.3+ / 4.0+)
- **Free cancellation** (single toggle chip)
- **Amenities** (multi-select chips, with "show all" if >8)
- **Room type / bed** (dropdown: King, Queen, Twin, …)
- **Price range** (dual-handle slider)
- **Free-text search** (name / city / description substring match)
- **Sort** (Recommended / Price ↑↓ / Rating ↓ / Stars ↓)
- **Active-filter chip strip** showing every active constraint with a one-click remove

**Why so many?** Real booking sites expose this much, and the seed has the
data to back it. Each filter is implemented in one place (`filterHotels` in
`useHotels.js`) with a corresponding test.

**Tradeoff:** more filter surface area = more visual weight. The filter bar is
~700px tall on desktop. On mobile it stacks. The "show fewer / show all"
amenity toggle keeps the bar from overwhelming the page.

---

## 3. Sort vs. filter — separated deliberately

`filterHotels` filters, `sortHotels` sorts, and the dashboard calls
`filterHotels(hotels, { ...filters, sort })` which internally calls
`sortHotels` on the result. This separation keeps each function testable in
isolation and lets us add a new sort without touching the filter logic.

---

## 4. Real photos via Unsplash

The seed ships no images. v1 used a flat blue-grey gradient placeholder which
looked "demo-y". v2 sources per-city Unsplash photos by stable photo IDs:

- `cardImageUrl(hotel)` returns an 800×500 photo URL.
- `heroImageUrl(hotel)` returns a 1600×720 photo URL.
- If the network blocks the image (CORS, ORB, offline) the parent falls back
  to a city-specific gradient via `cityGradient(city)`.

The hotel's image is **deterministic** — `pickPhoto(hotel)` sums char codes of
the hotel id and modulo-selects from the city's photo pool. The same hotel
always shows the same image.

**Tradeoff:** depends on a third-party image service. In production I'd self-host
or proxy through a CDN. For a take-home it's perfect.

---

## 5. Sold-out state

Hotels with no available rooms are dimmed (`opacity: 0.66`) and the CTA text
changes from "View details →" to "View property →" so users can still browse
the hotel's amenities, description, and policies even if they can't book.

**Why?** The brief said these hotels must still be discoverable. The dimming
+ "View property" copy sets the right expectation without hiding the hotel
entirely.

---

## 6. Sticky booking bar

The detail page has a sticky bar that shows the hotel name, rating, "From $X"
anchor, and a "Check availability" CTA that scrolls down to the room section.
It compresses on scroll (the `booking-bar--scrolled` class adds a shadow but
keeps the same height — the visual feedback is subtle on purpose).

**Tradeoff:** a sticky element can hide content. I positioned it directly
under the main header so it doesn't cover the hero. The shadow on scroll
makes it clear the bar is "on top of" the page.

---

## 7. Amenity icons

`amenityIcons.js` maps each of the 33 known amenity strings to a Unicode
emoji + a humanised label. Unknown strings get a generic ✓. I chose emoji
over an icon font because:

- Zero additional dependencies.
- Renders consistently across modern browsers.
- Degrades to a box-with-X on ancient systems but is never invisible.
- Looks more "consumer" than "enterprise" — fits the brand.

---

## 8. Date semantics — still [checkIn, checkOut)

A room is available for `[checkIn, checkOut)` iff every night in that range
appears in `available_dates`. Check-out is **not** a night.

This is unchanged from v1. The custom calendar enforces it: clicking a day
that's the same as or before the start date starts a new range instead of
reversing it.

---

## 9. Active filter chips

When any filter is non-default, a chip strip appears below the results header
showing every active constraint. Each chip is a button that removes that
specific filter. "Clear all" appears at the end of the strip.

This is the same pattern Booking.com / Expedia use. It gives users precise
control without making them hunt for the right dropdown.

---

## 10. Tests vs. coverage

**116 tests** across 6 files, all running in <2s. Coverage targets:

- Every pure helper in `useHotels.js`.
- Every user-visible empty state.
- Every filter combination.
- The custom calendar's two-click range pattern.
- A "real seed sanity" guard that fails the build if the seed stops matching
  the contract (city count, hotel count, cancellation vocabulary, amenity
  vocabulary).

I deliberately did **not** write snapshot tests. They catch typos but they
also catch refactors, which makes them a maintenance tax.

---

## 11. AI tooling

I used GitHub Copilot (this assistant) as a pair-programming partner
throughout. The honest disclosure:

- **Generated:** the full implementation, file structure, all tests, and the
  documentation.
- **Process:** I built the data contract from the real seed first, then
  layered each piece against it. After the reviewer reported the date-input
  bug, I reproduced it in the browser, diagnosed the root cause, and replaced
  the native input with a custom calendar. I rewrote the filter and sort
  surface from scratch based on the reviewer feedback.
- **Verified:** I ran the test suite after every change and manually drove
  every flow in a real browser before considering the work complete.

The rule of thumb: **Copilot suggests, I decide.** I read every function
before keeping it.

---

## 12. What I did NOT build (and why)

| Feature | Status | Rationale |
|---|---|---|
| Map view | Skipped | Seed has no lat/lng; out of scope per the brief |
| Real backend / API | Skipped | Brief explicitly says "powered by the provided Mock Data Seed" |
| Booking confirmation flow | Skipped | Brief caps scope at "check availability", not "book" |
| Internationalisation | Skipped | Copy is English-only; brief doesn't ask for i18n |
| Authentication | Skipped | Not mentioned in the brief |
| Pagination | Skipped | 40 hotels fit comfortably in one grid |
| Storybook / component gallery | Skipped | Over-investment for a take-home |
| TS / type-safety | Skipped | The repo scaffold already chose JS; staying consistent |

---
