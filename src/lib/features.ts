/**
 * Module feature flags (env).
 * Defaults to enabled when unset so existing installs keep all modules.
 *
 * Set to "false" | "0" | "off" | "no" to disable.
 * NEXT_PUBLIC_* so the same flags work in client UI, middleware, and APIs.
 */
function parseFlag(value: string | undefined, defaultEnabled = true): boolean {
  if (value === undefined || value.trim() === "") return defaultEnabled;
  const normalized = value.trim().toLowerCase();
  return !(
    normalized === "0" ||
    normalized === "false" ||
    normalized === "off" ||
    normalized === "no"
  );
}

export type AppFeatures = {
  map: boolean;
  calendar: boolean;
  messages: boolean;
};

export const features: AppFeatures = {
  map: parseFlag(process.env.NEXT_PUBLIC_ENABLE_MAP),
  calendar: parseFlag(process.env.NEXT_PUBLIC_ENABLE_CALENDAR),
  messages: parseFlag(process.env.NEXT_PUBLIC_ENABLE_MESSAGES),
};

export function getAppFeatures(): AppFeatures {
  return features;
}

/** Paths gated by feature flags (admin UI). */
export const FEATURE_ROUTE_GATES: Array<{
  prefix: string;
  enabled: keyof AppFeatures;
}> = [
  { prefix: "/tracking", enabled: "map" },
  { prefix: "/calendar", enabled: "calendar" },
  { prefix: "/conversations", enabled: "messages" },
];

export const FEATURE_DISABLED_MESSAGE = "This feature is disabled";
