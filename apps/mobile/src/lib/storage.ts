import { supabase } from './supabase';

declare const atob: ((data: string) => string) | undefined;

/**
 * Uploads an activity photo (site visit / business card / quotation) to the
 * public 'activity-attachments' Supabase Storage bucket.
 * Returns the permanent public URL.
 */
export async function uploadActivityPhoto(
  imageUri: string,
  base64Data?: string | null
): Promise<string | null> {
  const fileName = `act_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

  let uploadBody: any;

  if (typeof atob !== 'undefined' && base64Data) {
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      uploadBody = bytes.buffer;
    } catch (e) {
      // Fallback to fetch blob
      const res = await fetch(imageUri);
      uploadBody = await res.blob();
    }
  } else {
    const res = await fetch(imageUri);
    uploadBody = await res.blob();
  }

  const { data, error } = await supabase.storage
    .from('activity-attachments')
    .upload(fileName, uploadBody, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('Upload to activity-attachments failed:', error);
    throw new Error('Photo upload failed: ' + error.message);
  }

  const { data: urlData } = supabase.storage
    .from('activity-attachments')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
