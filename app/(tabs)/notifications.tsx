/**
 * app/(tabs)/notifications.tsx
 *
 * Premium notifications screen aligned with iOS / Android HIG.
 * ─ Grouped sections: "New" (unread) vs "Earlier" (read)
 * ─ Tap a notification → mark it as read (instant optimistic UI + backend call)
 * ─ "Mark All Read" pill in the header when unread exist
 * ─ Pull-to-refresh, infinite scroll, skeleton loading
 * ─ Native-feeling press feedback via spring animation
 * ─ Type-based colored icon pill
 * ─ Relative timestamps (2m ago, 1h ago, Yesterday, Apr 28)
 * ─ Consistent dark / light theme tokens matching the app design system
 */

import NotificationService, {
  NotificationItem,
} from "@/api/NotificationService";
import { timeAgo } from "@/utils/timeAgo";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — aligned with CustomHeader + Activities screen
// ─────────────────────────────────────────────────────────────────────────────
const light = {
  bg: "#F1F5FF",
  surface: "#FFFFFF",
  surfaceUnread: "#F0F4FF",
  surfacePressed: "#E8EFFE",
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textTertiary: "#B0B8C9",
  border: "#E8EDF5",
  accent: "#001F54",
  accentSoft: "#E8EFFE",
  accentText: "#001F54",
  danger: "#EF4444",
  skeleton: "#E5E7EB",
  sectionBg: "#F1F5FF",
  emptyIcon: "#D1D5DB",
};

const dark = {
  bg: "#0F172A",
  surface: "#161B22",
  surfaceUnread: "#1A2236",
  surfacePressed: "#1E293B",
  text: "#F0F6FC",
  textSecondary: "#8B949E",
  textMuted: "#484F58",
  textTertiary: "#30363D",
  border: "#21262D",
  accent: "#4A7CC7",
  accentSoft: "#1E293B",
  accentText: "#94B8E0",
  danger: "#F87171",
  skeleton: "#21262D",
  sectionBg: "#0F172A",
  emptyIcon: "#30363D",
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification type → icon + color mapping
// ─────────────────────────────────────────────────────────────────────────────
const NOTIFICATION_META: Record<
  string,
  { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; label: string }
> = {
  attendee_joined:  { icon: "account-plus",    color: "#8B5CF6", label: "New Attendee" },
  check_in:         { icon: "login",           color: "#22C55E", label: "Check-in" },
  check_out:        { icon: "logout",          color: "#F97316", label: "Check-out" },
  no_checkout:      { icon: "alert-circle",    color: "#EF4444", label: "No Checkout" },
  session_starting: { icon: "clock-outline",   color: "#3B82F6", label: "Starting" },
  session_active:   { icon: "play-circle",     color: "#22C55E", label: "Active" },
  session_ending:   { icon: "timer-sand",      color: "#F97316", label: "Ending" },
  session_ended:    { icon: "check-circle",    color: "#9CA3AF", label: "Ended" },
};

const DEFAULT_META = { icon: "bell-outline" as const, color: "#6B7280", label: "Notification" };

const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Spring-press wrapper for cards
// ─────────────────────────────────────────────────────────────────────────────
function SpringCard({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 400,
      friction: 15,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      android_ripple={{ color: "rgba(0,31,84,0.06)", borderless: false }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard({ T }: { T: typeof light }) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: T.surface,
          borderColor: T.border,
          opacity: pulseAnim,
        },
      ]}
    >
      <View style={[styles.iconPill, { backgroundColor: T.skeleton }]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: "55%", backgroundColor: T.skeleton }]} />
        <View style={[styles.skeletonLine, { width: "85%", backgroundColor: T.skeleton, marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: "30%", backgroundColor: T.skeleton, marginTop: 6 }]} />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification card component
// ─────────────────────────────────────────────────────────────────────────────
function NotificationCard({
  item,
  T,
  onMarkRead,
}: {
  item: NotificationItem;
  T: typeof light;
  onMarkRead: (id: number) => void;
}) {
  const meta = NOTIFICATION_META[item.type] ?? DEFAULT_META;
  const isUnread = !item.is_read;

  return (
    <SpringCard
      onPress={() => {
        if (isUnread) onMarkRead(item.notification_id);
      }}
      style={[
        styles.card,
        {
          backgroundColor: isUnread ? T.surfaceUnread : T.surface,
          borderColor: isUnread ? `${meta.color}18` : T.border,
        },
      ]}
    >
      {/* Unread accent bar */}
      {isUnread && (
        <View style={[styles.unreadBar, { backgroundColor: meta.color }]} />
      )}

      {/* Icon pill */}
      <View style={[styles.iconPill, { backgroundColor: `${meta.color}14` }]}>
        <MaterialCommunityIcons
          name={meta.icon}
          size={18}
          color={meta.color}
        />
      </View>

      {/* Content */}
      <View style={styles.cardBody}>
        {/* Top row: title + time */}
        <View style={styles.cardTopRow}>
          <Text
            style={[
              styles.cardTitle,
              { color: T.text },
              isUnread && styles.cardTitleUnread,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.cardTime, { color: T.textMuted }]}>
            {timeAgo(item.created_at)}
          </Text>
        </View>

        {/* Message */}
        <Text
          style={[styles.cardMessage, { color: T.textSecondary }]}
          numberOfLines={2}
        >
          {item.message}
        </Text>

        {/* Bottom: type label + unread dot */}
        <View style={styles.cardBottomRow}>
          <View style={[styles.typeBadge, { backgroundColor: `${meta.color}12` }]}>
            <View style={[styles.typeDot, { backgroundColor: meta.color }]} />
            <Text style={[styles.typeLabel, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
          {isUnread && (
            <Text style={[styles.tapHint, { color: T.textTertiary }]}>Tap to read</Text>
          )}
        </View>
      </View>
    </SpringCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const T = isDark ? dark : light;
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const offsetRef = useRef(0);

  // ── Fetch initial ───────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await NotificationService.getNotifications(PAGE_SIZE, 0);
      setNotifications(res.data);
      offsetRef.current = res.data.length;
      setHasMore(res.data.length >= PAGE_SIZE);
    } catch (err) {
      console.warn("[Notifications] Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    };
    init();
  }, [fetchNotifications]);

  // ── Pull to refresh ─────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // ── Infinite scroll ─────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await NotificationService.getNotifications(
        PAGE_SIZE,
        offsetRef.current
      );
      if (res.data.length > 0) {
        setNotifications((prev) => [...prev, ...res.data]);
        offsetRef.current += res.data.length;
      }
      setHasMore(res.data.length >= PAGE_SIZE);
    } catch (err) {
      console.warn("[Notifications] Load more error:", err);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore]);

  // ── Mark single notification as read ────────────────────────────────
  const handleMarkRead = useCallback(async (notificationId: number) => {
    // Haptic feedback
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      )
    );

    // Backend call (fire-and-forget)
    try {
      await NotificationService.markAsRead(notificationId);
    } catch (err) {
      console.warn("[Notifications] Mark read error:", err);
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: false } : n
        )
      );
    }
  }, []);

  // ── Mark ALL as read ────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await NotificationService.markAllAsRead();
    } catch (err) {
      console.warn("[Notifications] Mark all read error:", err);
      // Refetch to restore actual state
      await fetchNotifications();
    }
    setMarkingAll(false);
  }, [fetchNotifications]);

  // ── Derived data ────────────────────────────────────────────────────
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const sections = useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read);
    const read = notifications.filter((n) => n.is_read);
    const result: { title: string; data: NotificationItem[] }[] = [];
    if (unread.length > 0) result.push({ title: "New", data: unread });
    if (read.length > 0) result.push({ title: "Earlier", data: read });
    return result;
  }, [notifications]);

  // ── Section header ──────────────────────────────────────────────────
  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; data: NotificationItem[] } }) => (
      <View style={[styles.sectionHeader, { backgroundColor: T.sectionBg }]}>
        <View style={[styles.sectionDot, {
          backgroundColor: section.title === "New" ? T.accent : T.textMuted,
        }]} />
        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>
          {section.title.toUpperCase()}
        </Text>
        <View style={[styles.sectionCountBadge, {
          backgroundColor: section.title === "New" ? T.accentSoft : `${T.textMuted}18`,
        }]}>
          <Text style={[styles.sectionCountText, {
            color: section.title === "New" ? T.accentText : T.textMuted,
          }]}>
            {section.data.length}
          </Text>
        </View>
      </View>
    ),
    [T]
  );

  // ── Render item ─────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <NotificationCard item={item} T={T} onMarkRead={handleMarkRead} />
    ),
    [T, handleMarkRead]
  );

  // ── Card separator ──────────────────────────────────────────────────
  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

  // ── List header: title + mark all ───────────────────────────────────
  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {/* Title row */}
        <View style={styles.headerLeft}>
          <Text style={[styles.screenTitle, isDark && styles.screenTitleDark]}>
            Notifications
          </Text>
          <Text style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]}>
            {loading
              ? "Loading…"
              : unreadCount > 0
              ? `${unreadCount} unread`
              : `${notifications.length} notifications`}
          </Text>
        </View>

        {/* Mark all read button */}
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markingAll}
            activeOpacity={0.7}
            style={[
              styles.markAllBtn,
              { backgroundColor: T.accentSoft },
              markingAll && { opacity: 0.6 },
            ]}
          >
            <Ionicons
              name="checkmark-done"
              size={14}
              color={T.accentText}
            />
            <Text style={[styles.markAllText, { color: T.accentText }]}>
              {markingAll ? "Marking…" : "Read All"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [isDark, unreadCount, loading, notifications.length, markingAll, T, handleMarkAllRead]
  );

  // ── Empty state ─────────────────────────────────────────────────────
  const EmptyState = useCallback(
    () => (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIconWrap, { backgroundColor: `${T.emptyIcon}20` }]}>
          <Ionicons name="notifications-off-outline" size={40} color={T.emptyIcon} />
        </View>
        <Text style={[styles.emptyTitle, { color: T.text }]}>
          All caught up!
        </Text>
        <Text style={[styles.emptySubtitle, { color: T.textSecondary }]}>
          No notifications right now.{"\n"}We'll let you know when something happens.
        </Text>
      </View>
    ),
    [T]
  );

  // ── Loading skeleton ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: T.bg }]}>
        <ListHeader />
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 5 }).map((_, i) => (
            <React.Fragment key={i}>
              <SkeletonCard T={T} />
              {i < 4 && <View style={styles.separator} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.notification_id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={ItemSeparator}
        SectionSeparatorComponent={() => <View style={styles.sectionSep} />}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={T.accent} />
              <Text style={[styles.footerText, { color: T.textMuted }]}>
                Loading more…
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
          notifications.length === 0 && { flex: 1 },
        ]}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={T.textMuted}
            colors={[T.accent]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── List header (title + mark all) ──
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  headerLeft: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    fontFamily: "Inter_700Bold",
  },
  screenTitleDark: {
    color: "#F9FAFB",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 3,
    letterSpacing: 0.1,
  },
  headerSubtitleDark: {
    color: "#475569",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  // ── Section headers (New / Earlier) ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sectionSep: {
    height: 4,
  },

  // ── Notification card ──
  card: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    position: "relative",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 3,
  },
  iconPill: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
    fontFamily: "Inter_700Bold",
  },
  cardTitleUnread: {
    fontWeight: "700",
  },
  cardTime: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  cardMessage: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 19,
    fontWeight: "400",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  tapHint: {
    fontSize: 10,
    fontWeight: "500",
    fontStyle: "italic",
  },

  // ── Separator ──
  separator: {
    height: 6,
  },

  // ── List content ──
  listContent: {
    paddingBottom: 40,
  },

  // ── Skeleton ──
  skeletonWrap: {
    paddingTop: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },

  // ── Empty state ──
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.3,
    fontFamily: "Inter_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 22,
    maxWidth: 280,
  },

  // ── Footer loader ──
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
