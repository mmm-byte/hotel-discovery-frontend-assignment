/**
 * amenityIcons.js
 * ----------------------------------------------------------------------------
 * Maps amenity strings to a small unicode glyph + a human-readable label.
 *
 * The glyphs are deliberately chosen from basic Unicode emoji so the icons
 * work without an icon font or SVG sprite. They render consistently across
 * modern browsers and degrade gracefully on older systems.
 *
 *   amenityIcon('pool')   → { glyph: '🏊', label: 'Pool' }
 *   amenityIcon('spa')    → { glyph: '💆', label: 'Spa' }
 *
 * Unknown amenities return a generic '✓' and the string with underscores
 * replaced by spaces, so every amenity in the seed still gets a chip.
 */

const ICON_MAP = {
  'pool':                      { glyph: '🏊', label: 'Pool' },
  'free Wi-Fi':                { glyph: '📶', label: 'Free Wi-Fi' },
  'fitness_center':            { glyph: '🏋️', label: 'Fitness center' },
  'spa':                       { glyph: '💆', label: 'Spa' },
  'valet_parking':             { glyph: '🅿️', label: 'Valet parking' },
  'pet_friendly':              { glyph: '🐾', label: 'Pet friendly' },
  'free_breakfast':            { glyph: '🥐', label: 'Free breakfast' },
  'traditional_breakfast':     { glyph: '🍱', label: 'Traditional breakfast' },
  'bicycle_rentals':           { glyph: '🚲', label: 'Bicycle rentals' },
  'luggage_storage':           { glyph: '🧳', label: 'Luggage storage' },
  'laundry_service':           { glyph: '🧺', label: 'Laundry service' },
  'restaurant':                { glyph: '🍽️', label: 'Restaurant' },
  'bar':                       { glyph: '🍸', label: 'Bar' },
  'rooftop_bar':               { glyph: '🌃', label: 'Rooftop bar' },
  'rooftop_wine_bar':          { glyph: '🍷', label: 'Rooftop wine bar' },
  'rooftop_terrace':           { glyph: '🌇', label: 'Rooftop terrace' },
  'sky_bar':                   { glyph: '🌌', label: 'Sky bar' },
  'on_site_pub':               { glyph: '🍻', label: 'On-site pub' },
  'courtyard_cafe':            { glyph: '☕', label: 'Courtyard café' },
  'courtyard_lounge':          { glyph: '🛋️', label: 'Courtyard lounge' },
  'fine_dining_terrace':       { glyph: '🥂', label: 'Fine dining terrace' },
  'harbour_restaurant':        { glyph: '⚓', label: 'Harbour restaurant' },
  'michelin_restaurant':       { glyph: '⭐', label: 'Michelin restaurant' },
  'afternoon_tea_lounge':      { glyph: '🫖', label: 'Afternoon tea' },
  'vending_galore':            { glyph: '🥤', label: 'Vending' },
  'free_parking':              { glyph: '🅿️', label: 'Free parking' },
  'hot_tub':                   { glyph: '♨️', label: 'Hot tub' },
  'public_hot_spring_bath':    { glyph: '♨️', label: 'Hot spring bath' },
  'beach_access':              { glyph: '🏖️', label: 'Beach access' },
  'marina_access':             { glyph: '⛵', label: 'Marina access' },
  'social_lounge':             { glyph: '🎶', label: 'Social lounge' },
  'gaming_lounge':             { glyph: '🎮', label: 'Gaming lounge' },
  'meeting_rooms':             { glyph: '💼', label: 'Meeting rooms' },
};

/**
 * Return a { glyph, label } pair for a given amenity string.
 * Falls back to a checkmark + the humanised string for unknown values.
 */
export function amenityIcon(amenity) {
  const known = ICON_MAP[amenity];
  if (known) return known;
  // Humanise: replace underscores with spaces, title-case each word.
  const label = amenity.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { glyph: '✓', label };
}