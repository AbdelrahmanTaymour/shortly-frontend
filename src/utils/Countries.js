/**
 * countries.js — ISO 3166-1 alpha-2 country code utilities.
 *
 * RESPONSIBILITY: Pure functions for working with country codes.
 * No side effects, no state, no domain knowledge.
 *
 * WHY THIS EXISTS:
 *   The Profile form's country <select> may be configured with option values
 *   that are display names ("Egypt") rather than ISO codes ("EG"), or the
 *   codes may be lowercase ("eg"). The backend requires uppercase 2–3 letter
 *   ISO codes. This utility normalises whatever the form sends into the correct
 *   format before it reaches the API.
 *
 * EXTENDING:
 *   Add entries to COUNTRY_NAMES_TO_CODE for any country names the form produces
 *   that are not already covered. Keep keys in Title Case (the most common format
 *   for HTML select option text) — the lookup is case-insensitive at runtime.
 */

/** @type {Record<string, string>} Maps common country display names → ISO alpha-2 codes */
const COUNTRY_NAMES_TO_CODE = {
    'Afghanistan': 'AF',
    'Albania': 'AL',
    'Algeria': 'DZ',
    'Argentina': 'AR',
    'Australia': 'AU',
    'Austria': 'AT',
    'Bangladesh': 'BD',
    'Belgium': 'BE',
    'Brazil': 'BR',
    'Canada': 'CA',
    'Chile': 'CL',
    'China': 'CN',
    'Colombia': 'CO',
    'Czech Republic': 'CZ',
    'Czechia': 'CZ',
    'Denmark': 'DK',
    'Egypt': 'EG',
    'Ethiopia': 'ET',
    'Finland': 'FI',
    'France': 'FR',
    'Germany': 'DE',
    'Ghana': 'GH',
    'Greece': 'GR',
    'Hungary': 'HU',
    'India': 'IN',
    'Indonesia': 'ID',
    'Iran': 'IR',
    'Iraq': 'IQ',
    'Ireland': 'IE',
    'Israel': 'IL',
    'Italy': 'IT',
    'Japan': 'JP',
    'Jordan': 'JO',
    'Kenya': 'KE',
    'Kuwait': 'KW',
    'Lebanon': 'LB',
    'Libya': 'LY',
    'Malaysia': 'MY',
    'Mexico': 'MX',
    'Morocco': 'MA',
    'Netherlands': 'NL',
    'New Zealand': 'NZ',
    'Nigeria': 'NG',
    'Norway': 'NO',
    'Pakistan': 'PK',
    'Palestine': 'PS',
    'Philippines': 'PH',
    'Poland': 'PL',
    'Portugal': 'PT',
    'Qatar': 'QA',
    'Romania': 'RO',
    'Russia': 'RU',
    'Russian Federation': 'RU',
    'Saudi Arabia': 'SA',
    'Senegal': 'SN',
    'Singapore': 'SG',
    'South Africa': 'ZA',
    'South Korea': 'KR',
    'Korea, Republic of': 'KR',
    'Spain': 'ES',
    'Sudan': 'SD',
    'Sweden': 'SE',
    'Switzerland': 'CH',
    'Syria': 'SY',
    'Taiwan': 'TW',
    'Tanzania': 'TZ',
    'Thailand': 'TH',
    'Tunisia': 'TN',
    'Turkey': 'TR',
    'Türkiye': 'TR',
    'Uganda': 'UG',
    'Ukraine': 'UA',
    'United Arab Emirates': 'AE',
    'UAE': 'AE',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'Great Britain': 'GB',
    'United States': 'US',
    'United States of America': 'US',
    'USA': 'US',
    'Vietnam': 'VN',
    'Viet Nam': 'VN',
    'Yemen': 'YE',
};

// Build a case-insensitive lookup at module load time.
// Key: lowercased display name → Value: ISO alpha-2 code
const _LOOKUP = Object.fromEntries(
    Object.entries(COUNTRY_NAMES_TO_CODE).map(([name, code]) => [name.toLowerCase(), code])
);

/**
 * Normalise a country value into an uppercase ISO 3166-1 alpha-2 code.
 *
 * Handles three common failure modes from HTML select options:
 *   1. Full display name: "Egypt"    → "EG"
 *   2. Lowercase code:   "eg"        → "EG"
 *   3. Already correct:  "EG"        → "EG"  (pass-through)
 *   4. null / undefined              → ""    (empty string, backend ignores)
 *
 * If the value is more than 3 characters and not found in the lookup table,
 * the original value is returned uppercased so the server error message is
 * still informative (the caller can surface it as a validation error).
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function normalizeCountryCode(value) {
    if (!value) return '';

    const trimmed = String(value).trim();

    // Already looks like a code (2-3 uppercase or lowercase letters)
    if (/^[a-zA-Z]{2,3}$/.test(trimmed)) {
        return trimmed.toUpperCase();
    }

    // Try the full-name lookup (case-insensitive)
    const code = _LOOKUP[trimmed.toLowerCase()];
    if (code) return code;

    // Unknown value — uppercase it and let the server reject it with a clear error
    return trimmed.toUpperCase();
}

/**
 * Get the display name for a given ISO country code.
 * * @param {string} code - The 2-letter ISO code (e.g., 'EG')
 * @returns {string} The full country name, or the original code if not found.
 */
export function getCountryName(code) {
    if (!code) return '';
    const normalizedCode = code.toUpperCase();

    // Find the matching name in our lookup table
    const entry = Object.entries(COUNTRY_NAMES_TO_CODE).find(
        ([name, isoCode]) => isoCode === normalizedCode
    );

    return entry ? entry[0] : code;
}

/**
 * Check whether a value is a valid ISO 3166-1 alpha-2 code.
 * Does NOT validate against an exhaustive list — just checks format.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isValidCountryCode(value) {
    return /^[A-Z]{2}$/.test(value);
}

/**
 * Returns an array of { code, name } objects sorted by name,
 * suitable for building a <select> options list.
 *
 * @returns {{ code: string, name: string }[]}
 */
export function getCountryOptions() {
    return Object.entries(COUNTRY_NAMES_TO_CODE)
        // De-duplicate codes (e.g., "UK" and "United Kingdom" both → "GB")
        .reduce((acc, [name, code]) => {
            if (!acc.some(item => item.code === code)) {
                acc.push({code, name});
            }
            return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name));
}