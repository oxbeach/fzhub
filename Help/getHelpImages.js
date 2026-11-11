

import { supabase } from '../data/supabaseClient';

/**
 * Returns the public URL for an image stored in the 'help-images' bucket.
 * @param {string} imageName - File name stored in DB (e.g. 'rolling-matrix.png')
 * @returns {string|null}
 */
export function getHelpImageUrl(imageName) {
  if (!imageName) return null;
  
  const { data } = supabase
    .storage
    .from('help-images')
    .getPublicUrl(imageName);

  return data.publicUrl;
}