import { useEffect, useState } from 'react';
import { getAgentPreferences, type AgentPreferences } from '../lib/supabase';
import { TAG_NORMALIZE, CANONICAL_CATEGORIES } from '../data/events';
import { useAuth } from './useAuth';

export interface NormalizedPreferences {
  raw: AgentPreferences;
  // category_affinities normalised to canonical IDs (e.g. 'food' → 'food-drink')
  // and filtered to only known categories.
  canonicalCategories: string[];
}

function normalizeCategories(raw: string[]): string[] {
  return raw
    .map(c => {
      const lower = c.toLowerCase().trim();
      return TAG_NORMALIZE[lower] ?? lower;
    })
    .filter(c => CANONICAL_CATEGORIES.includes(c));
}

export function useAgentPreferences(): {
  preferences: NormalizedPreferences | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NormalizedPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setPreferences(null); return; }
    let active = true;
    setLoading(true);
    getAgentPreferences().then(raw => {
      if (!active) return;
      if (!raw) { setPreferences(null); setLoading(false); return; }
      setPreferences({
        raw,
        canonicalCategories: normalizeCategories(raw.category_affinities),
      });
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  return { preferences, loading };
}
