import * as Location from 'expo-location';
import { supabase } from './supabase';
import type { District } from '../types/database';

export interface LocationDistrictResult {
  latitude: number;
  longitude: number;
  districtId: number | null;
  district: District | null;
  error?: string;
}

/**
 * Requests location permissions, retrieves current GPS coordinates,
 * and calls the nearest_district() Supabase RPC to suggest a Riyadh district.
 */
export async function captureLocationAndSuggestDistrict(): Promise<LocationDistrictResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        latitude: 0,
        longitude: 0,
        districtId: null,
        district: null,
        error: 'Location permission was denied. You can select a district manually.',
      };
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const latitude = loc.coords.latitude;
    const longitude = loc.coords.longitude;

    // Call Supabase RPC nearest_district(lat, lng, p_city)
    const { data: districtId, error: rpcError } = await (supabase.rpc as any)('nearest_district', {
      lat: latitude,
      lng: longitude,
      p_city: 'Riyadh',
    });

    if (rpcError) {
      console.warn('nearest_district RPC warning:', rpcError.message);
      return {
        latitude,
        longitude,
        districtId: null,
        district: null,
        error: rpcError.message,
      };
    }

    if (districtId) {
      // Fetch district details
      const { data: distData } = await supabase
        .from('districts')
        .select('*')
        .eq('id', districtId)
        .single();

      return {
        latitude,
        longitude,
        districtId: districtId as number,
        district: (distData as unknown as District) || null,
      };
    }

    return {
      latitude,
      longitude,
      districtId: null,
      district: null,
    };
  } catch (err: any) {
    console.error('Location capture error:', err);
    return {
      latitude: 0,
      longitude: 0,
      districtId: null,
      district: null,
      error: err?.message || 'Failed to capture GPS location',
    };
  }
}
