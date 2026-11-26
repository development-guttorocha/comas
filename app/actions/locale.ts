"use server";

import { cookies } from "next/headers";
import { isSiteLocale, LOCALE_PREFERENCE_COOKIE, LOCALE_PREFERENCE_MAX_AGE } from "@/lib/localePreference";
import type { SiteLocale } from "@/lib/siteLocale";

export async function saveLocalePreference(locale: SiteLocale) {
  if (!isSiteLocale(locale)) throw new Error("Idioma inválido.");
  const store = await cookies();
  store.set(LOCALE_PREFERENCE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_PREFERENCE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
