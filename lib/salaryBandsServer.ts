import survey from "@/content/recursos/pesquisa-salarial.json";
import { defaultSalaryBands, mergeSalaryBands, type SalaryBandsData } from "@/lib/salaryBands";
import { fetchSalaryBandStats, isSupabaseConfigured } from "@/lib/supabase";

export const SALARY_BANDS_TAG = "salary-bands";

/**
 * Loads the baseline salary bands merged with approved Supabase survey responses for the current
 * edition. Always falls back cleanly to `defaultSalaryBands` if Supabase is unconfigured or fails.
 */
export async function getLiveSalaryBands(options?: { fresh?: boolean }): Promise<SalaryBandsData> {
  const base: SalaryBandsData = { ...defaultSalaryBands, edition: survey.edition };
  if (!isSupabaseConfigured()) return base;

  try {
    const stats = await fetchSalaryBandStats(survey.edition, options);
    if (!stats) return base;
    return mergeSalaryBands(stats, base);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[salaryBands] Falling back to static baseline:", msg);
    return base;
  }
}
