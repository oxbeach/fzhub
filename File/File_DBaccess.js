import { supabase } from '../Utils/supabase'; 

/**
 * Helper to fetch the active user's authenticated UUID directly from the Supabase session.
 * @returns {Promise<string|null>}
 */
async function getActiveUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Fetches all unique session names for the active user.
 * @returns {Promise<{ data: string[] | null, error: any }>}
 */
export async function fetchSessionNames() {
  try {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) throw new Error('No authenticated user session found.');

    const { data, error } = await supabase
      .from('sessions')
      .select('session_name, description')
      .eq('user_id', activeUserId)
      .abortSignal(AbortSignal.timeout(5000)); // Fails cleanly after 5 seconds

    if (error) throw error;

    // Deduplicate by session_name while keeping the object structure
    const uniqueSessions = Array.from(          
      new Map(data.map((row) => [row.session_name, row])).values()
    );

    // Sort alphabetically by session_name (case-insensitive)
    
    uniqueSessions.sort((a, b) => 
      a.session_name.localeCompare(b.session_name, undefined, { sensitivity: 'base' })
    );

    return { data: uniqueSessions, error: null };

  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Saves active portfolios under a session name for the active user.
 * @param {string} sessionName - Target session name
 * @param {string} description - Session description
 * @param {Array<Object>} portfolios - Array of active portfolio objects to save
 * @returns {Promise<{ success: boolean, error: any }>}
 */
export async function saveSession(sessionName, description, portfolios) {
  try {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) throw new Error('No authenticated user session found.');

    const payload = {
      user_id: activeUserId,
      session_name: sessionName,
      description: description,
      portfolio: portfolios,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('sessions')
      .upsert(payload, { onConflict: 'user_id, session_name' });

    if (error) throw error;

    return { success: true, error: null };
  } catch (err) {
    ///console.error('Error saving session:', err);            
    return { success: false, error: err };
  }
}

/**
 * Renames an existing session in the database for the active user.
 * @param {string} oldName - Current session name to target
 * @param {string} newName - New session name to apply
 * @returns {Promise<{ success: boolean, error: any }>}
 */
export async function renameSession(oldName, newName) {
  try {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) throw new Error('No authenticated user session found.');

    const { error } = await supabase
      .from('sessions')
      .update({ 
        session_name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', activeUserId)
      .eq('session_name', oldName);

    if (error) throw error;

    return { success: true, error: null };
  } catch (err) {
    //console.error('Error renaming session:', err);
    return { success: false, error: err };
  }
}

/**
 * Deletes a session by session name for the active user.
 * @param {string} sessionName - The name of the session to delete
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function deleteSession(sessionName) {
  try {
    const activeUserId = await getActiveUserId();
    if (!activeUserId || !sessionName) {
      //console.error('deleteSession: Missing required arguments.');
      return { success: false, error: 'Missing required parameters' };
    }

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', activeUserId)
      .eq('session_name', sessionName);

    if (error) {
      //console.error('deleteSession database error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    //console.error('deleteSession exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Pulls out the portfolio array directly for a specified session name.
 * @param {string} sessionName - Target session name to load
 * @returns {Promise<{ success: boolean, data: Array, error: any }>}
 */
export async function loadSession(sessionName) {
  try {
    const activeUserId = await getActiveUserId();
    if (!activeUserId || !sessionName) {
      return { success: false, data: [], error: 'Missing required parameters' };
    }

    const { data, error } = await supabase
      .from('sessions')
      .select('portfolio')
      .eq('user_id', activeUserId)
      .eq('session_name', sessionName)
      .single();

    if (error) throw error;

    const portfolioArray = Array.isArray(data?.portfolio) ? data.portfolio : [];

    return { 
      success: true, 
      data: portfolioArray, 
      error: null 
    };
  } catch (err) {
    return { 
      success: false, 
      data: [], 
      error: err 
    };
  }
}

/**
 * Extracts clean archive JSON payloads from active portfolio instances.
 * @param {Array<Object>} portfolios - Active portfolio objects with instance references
 * @returns {Array<Object>} Array of structured response objects ({ success, data, error })
 */
export function serializePortfolios(portfolios = []) {
  const serialize = [];

  portfolios.forEach((p) => {
    if (p?.instance && typeof p.instance.Serialize === 'function') {
      const serializeResult = p.instance.Serialize();
      if (serializeResult) {
        serialize.push(serializeResult);
      }
    } else {
      serialize.push({
        success:  false,
        data:     null,
        location: "serializePortfolios",
        error: {
          code: "ERR_SERIALIZE_MISSING_INSTANCE",
          ticker: p?.name || "Unknown portfolio"
        }
      });
    }
  });

  return serialize;
}

export function serializePortfolios_FORCED_FAILURE(portfolios = []) {
  const serialize = [];

  portfolios.forEach((p, idx) => {
    // TEST MOCK: Force error on odd-numbered indices (1, 3, 5...)
    if (idx % 2 !== 0) {
      serialize.push({
        success: false,
        data: null,
        location: "serializePortfolios_MOCK",
        error: {
          code: "ERR_SERIALIZE_MISSING_INSTANCE",
          ticker: p?.name || "Mocked Odd Portfolio"
        }
      });
      return;
    }

    if (p?.instance && typeof p.instance.Serialize === 'function') {
      const serializeResult = p.instance.Serialize();
      if (serializeResult) {
        serialize.push(serializeResult);
      }
    } else {
      serialize.push({
        success:  false,
        data:     null,
        location: "serializePortfolios",
        error: {
          code: "ERR_SERIALIZE_MISSING_INSTANCE",
          ticker: p?.name || "Unknown portfolio"
        }
      });
    }
  });

  return serialize;
}