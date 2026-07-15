export type Locale = "en" | "si";

export const LOCALE_STORAGE_KEY = "bakery_locale";

export type MessageKey = string;
export type Messages = Record<string, string>;

export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`,
  );
}
