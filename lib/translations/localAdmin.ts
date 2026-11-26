import { headers } from "next/headers";
import { translationAdminAvailable } from "@/lib/translations/access";

/**
 * Whether this request is the local admin's. Outside `next dev` the answer is always no, so the
 * request is never read there and the site's pages stay static (prerendered at build time).
 */
export async function localAdminRequest() {
  if (process.env.NODE_ENV !== "development") return false;
  return translationAdminAvailable((await headers()).get("host"));
}
