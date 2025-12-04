// Phone number validation utilities

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  dialCode: string;
}

// Common country codes with flags (using emoji flags)
export const countryCodes: CountryCode[] = [
  { code: 'IN', country: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'US', country: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'GB', country: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'CA', country: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'AU', country: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'DE', country: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'FR', country: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'IT', country: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: 'ES', country: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: 'NL', country: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'BR', country: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'MX', country: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
  { code: 'JP', country: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: 'CN', country: 'China', flag: '🇨🇳', dialCode: '+86' },
  { code: 'KR', country: 'South Korea', flag: '🇰🇷', dialCode: '+82' },
  { code: 'SG', country: 'Singapore', flag: '🇸🇬', dialCode: '+65' },
  { code: 'AE', country: 'UAE', flag: '🇦🇪', dialCode: '+971' },
  { code: 'SA', country: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: 'ZA', country: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'NZ', country: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
];

// Default country code (India)
export const defaultCountryCode = countryCodes[0];

/**
 * Validate phone number with country code
 * Format: +{countryCode}{phoneNumber}
 * Country code: 1-3 digits
 * Phone number: 7-15 digits
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string; formatted?: string } {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove all spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, '');

  // Must start with +
  if (!cleaned.startsWith('+')) {
    return { valid: false, error: 'Phone number must include country code (e.g., +91 for India)' };
  }

  // Check format: + followed by 1-3 digits (country code) then 7-15 digits
  const phoneRegex = /^\+[1-9]\d{1,2}\d{7,15}$/;
  
  if (!phoneRegex.test(cleaned)) {
    return { 
      valid: false, 
      error: 'Invalid phone number format. Use format: +{country code}{phone number} (e.g., +919876543210)' 
    };
  }

  // Check total length (including +)
  if (cleaned.length < 8 || cleaned.length > 18) {
    return { 
      valid: false, 
      error: 'Phone number must be between 8-18 characters (including country code)' 
    };
  }

  return { valid: true, formatted: cleaned };
}

/**
 * Format phone number for display
 * Converts +919876543210 to +91 98765 43210
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || !phone.startsWith('+')) {
    return phone;
  }

  // Extract country code and number
  const match = phone.match(/^\+(\d{1,3})(\d+)$/);
  if (!match) {
    return phone;
  }

  const [, countryCode, number] = match;
  
  // Format number with spaces (group of 5, then remaining)
  let formattedNumber = '';
  for (let i = 0; i < number.length; i += 5) {
    if (formattedNumber) formattedNumber += ' ';
    formattedNumber += number.substring(i, i + 5);
  }

  return `+${countryCode} ${formattedNumber}`;
}

/**
 * Parse phone number to extract country code and number
 */
export function parsePhoneNumber(phone: string): { countryCode: string; number: string } | null {
  if (!phone || !phone.startsWith('+')) {
    return null;
  }

  const match = phone.match(/^\+(\d{1,3})(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    countryCode: `+${match[1]}`,
    number: match[2]
  };
}

/**
 * Get country code by dial code
 */
export function getCountryByDialCode(dialCode: string): CountryCode | undefined {
  return countryCodes.find(country => country.dialCode === dialCode);
}

/**
 * Check if existing phone number needs country code (legacy 10-digit numbers)
 */
export function needsCountryCode(phone: string): boolean {
  if (!phone) return false;
  // If it's already in international format, no need to add country code
  if (phone.startsWith('+')) return false;
  // If it's a 10-digit number, likely needs country code
  return /^\d{10}$/.test(phone);
}

