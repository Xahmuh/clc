import { Linking, Alert } from 'react-native';

/**
 * Normalizes a phone number to standard Saudi international format (9665XXXXXXXX)
 * Examples:
 *   "0501234567" -> "966501234567"
 *   "501234567"  -> "966501234567"
 *   "+966501234567" -> "966501234567"
 *   "00966501234567" -> "966501234567"
 */
export function normalizeSaudiPhone(phone: string): string {
  if (!phone) return '';
  // Remove spaces, hyphens, parentheses, plus
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

  // Remove leading 00
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // If starts with 05 (10 digits), replace 0 with 966
  if (cleaned.startsWith('05')) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }

  return cleaned;
}

/**
 * Opens a WhatsApp direct chat with the provided phone number.
 */
export async function openWhatsApp(phone: string, message?: string): Promise<void> {
  if (!phone) {
    Alert.alert('No Phone Number', 'This account has no phone number recorded.');
    return;
  }

  const normalized = normalizeSaudiPhone(phone);
  let url = `https://wa.me/${normalized}`;
  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback direct open
      await Linking.openURL(url);
    }
  } catch (err: any) {
    Alert.alert('Error Opening WhatsApp', err.message || 'Could not open WhatsApp.');
  }
}

/**
 * Initiates a regular phone call.
 */
export async function openPhoneCall(phone: string): Promise<void> {
  if (!phone) {
    Alert.alert('No Phone', 'No phone number available.');
    return;
  }
  const clean = phone.replace(/[\s\-]/g, '');
  try {
    await Linking.openURL(`tel:${clean}`);
  } catch (err: any) {
    Alert.alert('Error Calling', err.message || 'Could not initiate call.');
  }
}

/**
 * Composes an email.
 */
export async function openEmail(email: string, subject?: string): Promise<void> {
  if (!email) {
    Alert.alert('No Email', 'No email address available.');
    return;
  }
  let url = `mailto:${email.trim()}`;
  if (subject) {
    url += `?subject=${encodeURIComponent(subject)}`;
  }
  try {
    await Linking.openURL(url);
  } catch (err: any) {
    Alert.alert('Error Opening Email', err.message || 'Could not open email client.');
  }
}

/**
 * Opens Google Maps to navigate to coordinates or search a query (e.g. Riyadh district).
 */
export async function openGoogleMaps(options: {
  lat?: number | null;
  lng?: number | null;
  query?: string | null;
}): Promise<void> {
  const { lat, lng, query } = options;

  let mapsUrl = '';
  if (lat && lng) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  } else if (query) {
    const fullQuery = query.includes('Riyadh') || query.includes('الرياض') ? query : `${query}, Riyadh`;
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`;
  } else {
    Alert.alert('No Location', 'No coordinates or district specified for this account.');
    return;
  }

  try {
    await Linking.openURL(mapsUrl);
  } catch (err: any) {
    Alert.alert('Maps Error', err.message || 'Could not open navigation map.');
  }
}
