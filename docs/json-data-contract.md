# JSON Data Contract — `src/data/mock-data.json`

This document is the **single source of truth** for the mock dataset shape, invariants,
and rendering rules. Reviewers can read this file and predict exactly how the UI will
behave given any conforming JSON. The contract is derived from the actual seed at
`src/data/mock-data.json` (40 hotels, 10 cities, 47 rooms, 6 hotels with no available
rooms).

---

## 1. Top-level shape

The file is a **bare JSON array** of hotels (no wrapper object). Length is **40** in the
seed, but readers must not assume a fixed length — they should iterate.

```jsonc
[
  { /* hotel 1 */ },
  { /* hotel 2 */ }
]
```

---

## 2. `Hotel` object

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | Stable, unique. Format: `hotel-<2-digit-zero-padded>` (e.g., `hotel-01`) |
| `name` | `string` | yes | Display name |
| `description` | `string` | yes | Guest-focused marketing copy |
| `star_rating` | `integer` | yes | **2–5** (the seed contains 2-, 3-, 4-, and 5-star hotels; 1-star is reserved but not present) |
| `overall_rating` | `number` | yes | Range **3.9–4.9** in the seed, on a 0–5 scale. UI treats `< 7` style thresholds as out-of-range |
| `review_count` | `integer` | yes | `>= 0`. Format with thousands separator when `>= 1000` |
| `address` | `Address` | yes | See §3 |
| `contact` | `Contact` | yes | See §4 |
| `amenities` | `string[]` | yes | See §7 |
| `policies` | `Policies` | yes | See §5 |
| `rooms` | `Room[]` | yes | See §6 |

---

## 3. `Address` object

| Field | Type | Notes |
|---|---|---|
| `street` | `string` | |
| `city` | `string` | One of the 10 seed cities (see §8) |
| `state` | `string` | Region / province / state code |
| `zip_code` | `string` | (snake_case, not `postalCode`) |
| `country` | `string` | Full country name |

> Note: there is no `lat` / `lng` in this seed. Map rendering is out of scope.

---

## 4. `Contact` object

| Field | Type | Notes |
|---|---|---|
| `phone` | `string` | International format, e.g., `"+1-312-555-0199"` |
| `email` | `string` | Property email |

The contact block is **displayed in the detail view only**; the dashboard never shows it.

---

## 5. `Policies` object

| Field | Type | Notes |
|---|---|---|
| `check_in_time` | `string` | 24-hour `HH:mm`, e.g., `"15:00"` |
| `check_out_time` | `string` | 24-hour `HH:mm`, e.g., `"11:00"` |
| `cancellation` | `string` | One of the five values in §5.1 |

### 5.1 `cancellation` vocabulary

The seed uses these five free-text strings. The UI shortens them to the labels shown:

| Data value | UI badge |
|---|---|
| `"Free cancellation up to 24 hours before check-in"` | **Free cancellation · 24h** |
| `"Free cancellation up to 48 hours before check-in"` | **Free cancellation · 48h** |
| `"Free cancellation up to 72 hours before check-in"` | **Free cancellation · 72h** |
| `"Free cancellation up to 7 days before check-in"`  | **Free cancellation · 7 days** |
| `"Non-refundable booking"`                          | **Non-refundable** |

Anything not matching one of these strings falls back to a generic **Cancellation policy applies** badge.

---

## 6. `Room` object

| Field | Type | Required | Notes |
|---|---|---|---|
| `room_id` | `string` | yes | Stable, unique within its parent hotel. Format: `<hotel-id>-<a\|b\|c>` (e.g., `room-01a`) |
| `type` | `string` | yes | Display label, e.g., `"Deluxe King Room"`, `"Standard Queen"` |
| `bed_type` | `string` | yes | One of: `"King"`, `"Queen"`, `"Double"`, `"Full"`, `"Twin"`, `"Futon"` |
| `bed_count` | `integer` | yes | `>= 1` |
| `max_occupancy` | `integer` | yes | `>= 1` |
| `square_footage` | `integer` | yes | Square feet, `>= 80` |
| `price_per_night` | `number` | yes | USD, may be integer or `.00` decimal |
| `room_amenities` | `string[]` | yes | Drawn from the same vocabulary as hotel amenities (see §7) |
| `available_dates` | `string[]` | yes | Array of `YYYY-MM-DD`. May be **empty** to signal "no availability" (used in §9) |

### 6.1 `available_dates` semantics

A room is **available for a stay** `[checkIn, checkOut)` iff **every night** in that
range appears in `available_dates`. The check-out date is **not** a night (you leave in
the morning) so it does not need to be in the list. If either `checkIn` or `checkOut`
is missing from the UI input, the room is considered unavailable for filtering (the
component treats this as the "please pick dates" state, not an empty state).

This convention keeps availability checks O(nights × rooms) and matches what users
expect from real booking engines.

---

## 7. Amenity vocabulary

The seed draws from 33 strings. The UI groups them under six informal buckets and
renders each as a chip with a small dot. Unknown values fall into "Other" and are
displayed verbatim.

| Bucket | Values |
|---|---|
| **Connectivity** | `free Wi-Fi`, `luggage_storage` |
| **Wellness** | `fitness_center`, `spa`, `pool`, `hot_tub`, `public_hot_spring_bath` |
| **Dining** | `restaurant`, `bar`, `free_breakfast`, `traditional_breakfast`, `michelin_restaurant`, `rooftop_bar`, `rooftop_wine_bar`, `sky_bar`, `on_site_pub`, `courtyard_cafe`, `harbour_restaurant`, `fine_dining_terrace`, `afternoon_tea_lounge`, `vending_galore` |
| **Parking & transit** | `valet_parking`, `free_parking` |
| **Family & pets** | `pet_friendly`, `bicycle_rentals` |
| **Spaces & extras** | `rooftop_terrace`, `courtyard_lounge`, `beach_access`, `marina_access`, `social_lounge`, `gaming_lounge`, `meeting_rooms`, `laundry_service` |

> Note: the data mixes snake_case (`fitness_center`) and space-separated (`free Wi-Fi`)
> strings. The contract preserves that quirk rather than mass-renaming, because changing
> the data would invalidate the seeds shipped in the assignment brief.

---

## 8. Seed distribution

40 hotels across 10 cities, **exactly 4 per city**:

| # | City | Country | Hotels |
|---|---|---|---|
| 1 | Austin | USA | 4 |
| 2 | Chicago | USA | 4 |
| 3 | London | United Kingdom | 4 |
| 4 | Miami | USA | 4 |
| 5 | New York | USA | 4 |
| 6 | Paris | France | 4 |
| 7 | Rome | Italy | 4 |
| 8 | Seattle | USA | 4 |
| 9 | Sydney | Australia | 4 |
| 10 | Tokyo | Japan | 4 |

**Star-rating mix:** 12 four-star, 12 three-star, 10 five-star, 6 two-star.

---

## 9. The "no rooms" test scenario

Exactly **6 of 40 hotels (15%)** have **no available rooms for any date**. These
hotels have `available_dates` empty across all rooms (or an empty `rooms` array). They
**still appear** in the dashboard list (so users can browse and click into them), but
the `RoomAvailability` component renders the documented empty state:

> 🛏 *No rooms available for these dates.*

A hotel-level badge on its card also reads **"No rooms"** when *all* of its rooms have
empty `available_dates`.

---

## 10. Rendering rules (data → UI)

These thresholds are duplicated in `src/store/useHotels.js` so reviewers can audit them
in one place.

| Signal | UI behavior |
|---|---|
| `star_rating === 5` | Gold star chip (`★★★★★`) |
| `star_rating === 4` | Blue-grey star chip |
| `star_rating === 3` | Muted star chip |
| `star_rating === 2` | "Budget" star chip (still honored, not hidden) |
| `overall_rating >= 4.7` | Rating chip tier **"Exceptional"** (top tier) |
| `overall_rating >= 4.5` | Rating chip tier **"Excellent"** |
| `overall_rating >= 4.3` | Rating chip tier **"Very good"** |
| `overall_rating < 4.3` | Raw number, no tier label |
| `review_count >= 1000` | Display as `1.2k` (one decimal, k-suffix) |
| Cheapest room `price_per_night` | Used as the hotel's "From $X" anchor on cards |
| All rooms have empty `available_dates` | Hotel card badge: **"No rooms"** (amber) |
| `cancellation` starts with `"Free"` | Green badge |
| `cancellation === "Non-refundable booking"` | Amber badge |
| `amenities.length === 0` | Amenity section hidden, not shown as an empty list |

---

## 11. Safe-expansion rules

Any validator or future migration script should enforce these:

1. `id` is unique across the array.
2. `rooms[].room_id` is unique within its parent hotel.
3. `star_rating ∈ [2, 5]`.
4. `overall_rating ∈ [0, 5]`.
5. `bed_count >= 1`, `max_occupancy >= bed_count`.
6. `square_footage >= 80`.
7. `price_per_night >= 0` (zero is allowed only for promotional/comps rooms).
8. `available_dates` entries are valid `YYYY-MM-DD` strings.
9. `check_in_time` and `check_out_time` are valid `HH:mm` strings.
10. In the curated 40-hotel seed, the share of hotels with **zero available rooms
    across all rooms** must be `0.15 ± 0.05`. For larger generated fixtures this
    relaxes to a floor of 10%.

---

## 12. Versioning & compatibility

- The contract is implicitly `v1.0.0`. Any **breaking** change to the shape (renaming a
  field, changing a vocabulary value) requires a major bump and a coordinated update
  in `src/store/useHotels.js` and the components that read it.
- **Additive, optional** fields (e.g., a new `sustainability_score`) do **not** require
  a bump — readers must treat unknown fields as ignored.
- Unknown `cancellation` strings must not crash the UI; they render the fallback badge.