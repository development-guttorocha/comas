/** JSON inside a script element must not contain an HTML closing tag. */
export function serializeJsonLd(value: unknown): string {
  return (JSON.stringify(value) ?? "null").replace(/</g, "\\u003c");
}
