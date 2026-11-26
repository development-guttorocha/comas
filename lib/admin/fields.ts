/** Formulários do admin descritos como dados: os mesmos campos servem aos componentes e ao case. */
/** `when`: the field shows only while another field of the same object has one of these values. */
export type When = { key: string; is: string[]; fallback?: string };

export type FieldDef = (
  | { key: string; label: string; type: "text" | "textarea" | "url" | "image" | "color" | "tags"; hint?: string; advanced?: boolean; readOnly?: boolean; toggle?: Toggle }
  | { key: string; label: string; type: "number"; hint?: string; advanced?: boolean }
  | { key: string; label: string; type: "select"; options: { value: string | number; label: string }[]; /** Name of the empty choice; "Padrão" when unset. */ defaultLabel?: string; hint?: string; advanced?: boolean }
  | { key: string; label: string; type: "boolean"; hint?: string; advanced?: boolean }
  /** One of the infographic icons, picked from a grid. */
  | { key: string; label: string; type: "icon"; hint?: string; advanced?: boolean }
  /** List of objects, each with its own fields. */
  | { key: string; label: string; type: "list"; item: FieldDef[]; itemLabel: string; hint?: string; advanced?: boolean }
  /** Nested object. */
  | { key: string; label: string; type: "group"; fields: FieldDef[]; hint?: string; advanced?: boolean }
  /** The point of the image in `of` that stays in view when it is cropped ("50% 30%"). */
  | { key: string; label: string; type: "focus"; of: string; hint?: string; advanced?: boolean }
  /** Which items of the list `of` are emphasised (indices). */
  | { key: string; label: string; type: "indices"; of: string; hint?: string; advanced?: boolean }
) & { when?: When };

/**
 * A text that can be switched off. `hidden: ""` stores an empty string (the site then shows
 * nothing instead of its default, given as `placeholder`); `hidden: null` drops the key and
 * switching back on starts from `text`.
 */
export type Toggle = { hidden: "" | null; text?: string; placeholder?: string };

export type Values = Record<string, unknown>;

/** Sets a value; an emptied text field drops the key, so the site falls back to its default. */
export function setValue(values: Values, key: string, value: unknown): Values {
  const next = { ...values };
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) delete next[key];
  else next[key] = value;
  return next;
}
