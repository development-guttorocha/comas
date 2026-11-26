import survey from "@/content/recursos/pesquisa-salarial.json";
import { buildSurveyResults, emptySurveyResults, type SurveyResultsData } from "@/lib/salarySurveyResults";
import { fetchSalarySurveyResults, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Loads live aggregated cuts for `/recursos/pesquisa-salarial`, strictly enforcing `minGroup >= 5`.
 * Falls back cleanly to an empty waiting state when Supabase is unconfigured or unreachable.
 */
export async function getLiveSurveyResults(options?: { fresh?: boolean }): Promise<SurveyResultsData> {
  const edition = survey.edition;
  const minGroup = Math.max(5, survey.results.minGroup);
  const fallback = emptySurveyResults(edition, minGroup);
  if (!isSupabaseConfigured()) return fallback;

  try {
    const rows = await fetchSalarySurveyResults(edition, minGroup, options);
    if (!rows) return fallback;
    return buildSurveyResults(rows, { edition, minGroup });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[salarySurveyResults] Falling back to waiting state:", msg);
    return fallback;
  }
}
