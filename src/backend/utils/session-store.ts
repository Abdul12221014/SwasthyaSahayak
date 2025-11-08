// Simple in-memory session store with optional Supabase persistence.
// Keeps recent N queries per sessionId for conversation context.

type SessionEntry = {
  timestamp: number;
  query: string;
};

const DEFAULT_MAX_HISTORY = 3;

class InMemorySessionStore {
  private historyBySession = new Map<string, SessionEntry[]>();
  private maxHistory: number;

  constructor(maxHistory: number = DEFAULT_MAX_HISTORY) {
    this.maxHistory = Math.max(1, maxHistory);
  }

  getHistory(sessionId: string): string[] {
    const entries = this.historyBySession.get(sessionId) || [];
    // return most recent first
    return entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.maxHistory)
      .map((e) => e.query);
  }

  append(sessionId: string, query: string): void {
    const entries = this.historyBySession.get(sessionId) || [];
    entries.push({ timestamp: Date.now(), query });
    // trim to max
    const trimmed = entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.maxHistory);
    this.historyBySession.set(sessionId, trimmed);
  }
}

// Singleton for the process lifetime
const store = new InMemorySessionStore();

function getEnvVar(name: string): string {
  try {
    // @ts-ignore - Deno types may not be available in IDE
    return (globalThis as any).Deno?.env.get(name) || '';
  } catch {
    return '';
  }
}

async function getSupabaseClient(url: string, key: string) {
  // @ts-ignore: Deno resolves this at runtime; IDE may not have types
  const mod = await import("https://esm.sh/@supabase/supabase-js@2.39.7");
  return mod.createClient(url, key);
}

export function getSessionHistory(sessionId?: string): string[] {
  if (!sessionId) return [];
  return store.getHistory(sessionId);
}

export function saveSessionQuery(sessionId?: string, query?: string): void {
  if (!sessionId || !query) return;
  store.append(sessionId, query);
}

// Async Supabase-backed helpers
export async function getSessionHistoryAsync(sessionId?: string, max: number = 3): Promise<string[]> {
  if (!sessionId) return [];
  const url = getEnvVar('SUPABASE_URL');
  const key = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return getSessionHistory(sessionId);
  }

  try {
    const supabase = await getSupabaseClient(url, key);
    const { data, error } = await supabase
      .from('health_session_history')
      .select('query, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(max);

    if (error) {
      console.warn('Session history fetch failed, using memory:', error.message);
      return getSessionHistory(sessionId);
    }
    const queries = (data || []).map((row: any) => row.query as string);
    // Warm memory cache
    queries.forEach(q => store.append(sessionId, q));
    return queries;
  } catch (e) {
    console.warn('Session history error, using memory:', (e as Error).message);
    return getSessionHistory(sessionId);
  }
}

export async function saveSessionQueryAsync(sessionId?: string, query?: string): Promise<void> {
  if (!sessionId || !query) return;
  // Always save to memory
  saveSessionQuery(sessionId, query);

  const url = getEnvVar('SUPABASE_URL');
  const key = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return; // Supabase optional

  try {
    const supabase = await getSupabaseClient(url, key);
    const { error } = await supabase
      .from('health_session_history')
      .insert({ session_id: sessionId, query });
    if (error) {
      console.warn('Session save failed (Supabase):', error.message);
    }
  } catch (e) {
    console.warn('Session save error (Supabase):', (e as Error).message);
  }
}


