/** Consider a user online if they heartbeated within this window. */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function presenceFromLastSeen(lastSeenAt: Date | string | null | undefined): {
  isOnline: boolean;
  lastSeenAt: string | null;
} {
  if (!lastSeenAt) {
    return { isOnline: false, lastSeenAt: null };
  }
  const date = lastSeenAt instanceof Date ? lastSeenAt : new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) {
    return { isOnline: false, lastSeenAt: null };
  }
  return {
    isOnline: Date.now() - date.getTime() <= ONLINE_WINDOW_MS,
    lastSeenAt: date.toISOString(),
  };
}
