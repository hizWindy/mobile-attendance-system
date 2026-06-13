/**
 * utils/timeAgo.ts
 *
 * Human-friendly relative timestamps for notification cards.
 * Returns:
 *   - "Just now"      (< 1 minute)
 *   - "2m ago"        (< 60 minutes)
 *   - "3h ago"        (< 24 hours)
 *   - "Yesterday"     (previous calendar day)
 *   - "Apr 28"        (older than yesterday, same year)
 *   - "Apr 28, 2024"  (different year)
 */

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  // Check if it was yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }

  // Format as "Apr 28" or "Apr 28, 2024"
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  if (date.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${date.getFullYear()}`;
}
