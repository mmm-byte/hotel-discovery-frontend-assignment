/**
 * images.js
 * ----------------------------------------------------------------------------
 * Per-city stock photo URLs (Unsplash). Each city has 2 alternates so cards
 * in the same city don't all show the same image.
 *
 * If the network is unavailable or Unsplash returns 404, the consuming
 * <img> fires `onError` and the parent falls back to the gradient placeholder
 * in styles.css. No production system should depend on a third-party image
 * service — but for a take-home demo it's perfect.
 *
 * Why Unsplash?
 *   Free, no API key required for the basic source URL, high-quality
 *   photographs that look like real hotel photography.
 */

const U = 'https://images.unsplash.com/photo-';

// Each entry maps a city to a small pool of stable photo IDs (chosen for
// subject matter: skylines, hotels, neighborhoods).
const CITY_PHOTOS = {
  'New York':   ['1564501049412-61c2a3083791', '1517541866997-12c5d4576d63', '1485871981521-5b1fd3805eee'],
  'London':     ['1513635269975-59663e0ac1ad',     '1533929736458-ca588d08c8be', '1505761671935-60b3a7427bad'],
  'Tokyo':      ['1540959733332-eab4deabeeaf',     '1542051841857-5f90071e7989', '1554797589-7241bb691973'],
  'Paris':      ['1502602898657-3e91760cbb34',     '1431277177585-9d4e222e0eb9', '1471625526027-0647a4c0e76c'],
  'Sydney':     ['1506973035872-a4ec16b8e8d9',     '1506973035872-a4ec16b8e8d9', '1495745966610-2a67f2297e5e'],
  'Chicago':    ['1494522855154-9297ac14b55f',     '1477959858617-67f85cf4f1df', '1514924013411-cbf25faa35bb'],
  'Austin':     ['1531218150217-54595bc2b934',     '1564013799919-ab600027ffc6', '1542314831-068cd1dbfeeb'],
  'Miami':      ['1535498730771-e735b998cd64',     '1514214246283-d427a95c5d2e', '1571896349842-33c89424de2d'],
  'Rome':       ['1552832230-c0197dd311b5',       '1525874684015-58379d421a52', '1531572753322-ad063cecc140'],
  'Seattle':    ['1502175353174-a7a44e84da10',     '1438401171849-74d3a7c57d54', '1542223616-740d5dff7f56'],
};

// Deterministic hash so the same hotel always picks the same image (instead
// of jumping around on each render). We just sum the char codes of the id.
function pickPhoto(hotel) {
  const pool = CITY_PHOTOS[hotel.address.city] || CITY_PHOTOS['New York'];
  const sum = (hotel.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return pool[sum % pool.length];
}

/**
 * Resolve a card-sized image URL for a hotel.
 * Returns null if the hotel has no city or no id.
 */
export function cardImageUrl(hotel) {
  if (!hotel?.address?.city || !hotel?.id) return null;
  const photoId = pickPhoto(hotel);
  return `${U}${photoId}?w=800&h=500&fit=crop&auto=format&q=70`;
}

/**
 * Resolve a larger hero image URL for a hotel detail view.
 */
export function heroImageUrl(hotel) {
  if (!hotel?.address?.city || !hotel?.id) return null;
  const photoId = pickPhoto(hotel);
  return `${U}${photoId}?w=1600&h=720&fit=crop&auto=format&q=75`;
}

/**
 * A 2-color gradient per city, used as a fallback when the image is missing.
 * The seed has no images, so this is the most reliable default.
 */
const CITY_GRADIENTS = {
  'New York':   ['#1e293b', '#475569'],
  'London':     ['#312e81', '#7c3aed'],
  'Tokyo':      ['#831843', '#f43f5e'],
  'Paris':      ['#1e3a8a', '#7dd3fc'],
  'Sydney':     ['#0c4a6e', '#22d3ee'],
  'Chicago':    ['#1f2937', '#6b7280'],
  'Austin':     ['#7c2d12', '#fb923c'],
  'Miami':      ['#0e7490', '#facc15'],
  'Rome':       ['#854d0e', '#fde68a'],
  'Seattle':    ['#134e4a', '#5eead4'],
};

export function cityGradient(city) {
  return CITY_GRADIENTS[city] || ['#475569', '#94a3b8'];
}