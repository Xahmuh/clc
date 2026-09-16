import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Activity } from '../types/database';

const QUEUE_STORAGE_KEY = '@clc/offline_activities';

export type QueuedActivity = Omit<Activity, 'id' | 'created_at'> & {
  queued_at: string;
};

/**
 * Saves an activity to the offline storage queue when offline or if network fails.
 */
export async function queueActivityOffline(activity: QueuedActivity): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const list: QueuedActivity[] = raw ? JSON.parse(raw) : [];
    list.push(activity);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error queuing activity offline:', err);
  }
}

/**
 * Gets count of pending offline activities.
 */
export async function getOfflineQueueCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const list: QueuedActivity[] = raw ? JSON.parse(raw) : [];
    return list.length;
  } catch {
    return 0;
  }
}

/**
 * Attempts to flush and sync all offline queued activities to Supabase.
 */
export async function syncOfflineActivities(): Promise<{ synced: number; remaining: number }> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return { synced: 0, remaining: 0 };

    const list: QueuedActivity[] = JSON.parse(raw);
    if (list.length === 0) return { synced: 0, remaining: 0 };

    const remaining: QueuedActivity[] = [];
    let synced = 0;

    for (const item of list) {
      const { queued_at, ...insertPayload } = item;
      const { error } = await supabase.from('activities').insert(insertPayload as any);

      if (error) {
        // Still failing, keep in queue
        remaining.push(item);
      } else {
        synced++;
      }
    }

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
    return { synced, remaining: remaining.length };
  } catch (err) {
    console.error('Error syncing offline activities:', err);
    return { synced: 0, remaining: 0 };
  }
}
