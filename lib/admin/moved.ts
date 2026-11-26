import { redirect } from "next/navigation";

type Query = Promise<Record<string, string | string[] | undefined>>;

/** An old admin address: sends to the new one and keeps the query (`?campo=`, `?aba=`). */
export async function moved(to: string, searchParams?: Query): Promise<never> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries((await searchParams) ?? {})) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  const [path, hash] = to.split("#");
  redirect(`${path}${query.size ? `?${query}` : ""}${hash ? `#${hash}` : ""}`);
}
