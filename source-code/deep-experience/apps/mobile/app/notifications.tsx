import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckCircle, RefreshCw, Megaphone, Ticket } from "lucide-react-native";
import { apiFetch } from "../lib/api";

interface NotificationItem {
  id: string;
  type: string;
  titleEn: string;
  messageEn: string;
  isRead: boolean;
  createdAt: string;
  booking: {
    id: string;
    status: string;
    tour: { title: string };
  } | null;
}

const TYPE_ICON_CONFIGS: Record<string, { icon: typeof CheckCircle; color: string }> = {
  BOOKING_CONFIRMED: { icon: CheckCircle, color: "#22c55e" },
  GUIDE_DECLINED: { icon: RefreshCw, color: "#f59e0b" },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation("mobile");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem("userEmail");
      if (!email) {
        setLoading(false);
        return;
      }
      const data = await apiFetch<{ notifications: NotificationItem[] }>(
        `/notifications?email=${encodeURIComponent(email)}`
      );
      setNotifications(data.notifications);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handlePress(item: NotificationItem) {
    // Mark as read
    if (!item.isRead) {
      try {
        await apiFetch(`/notifications/${item.id}/read`, { method: "POST" });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Continue navigation even if mark-read fails
      }
    }
    // Navigate to booking detail if linked
    if (item.booking) {
      router.push(`/booking/${item.booking.id}`);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{t("notifications.title")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>{t("notifications.empty")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.isRead && styles.cardUnread]}
            onPress={() => handlePress(item)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                {(() => {
                  const config = TYPE_ICON_CONFIGS[item.type];
                  const IconComp = config?.icon || Megaphone;
                  const iconColor = config?.color || "#6b7280";
                  return <IconComp size={18} color={iconColor} />;
                })()}
              </View>
              <Text style={[styles.title, !item.isRead && styles.titleUnread]}>
                {item.titleEn}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {item.messageEn}
            </Text>
            {item.booking && (
              <View style={styles.tourRow}>
                <Ticket size={12} color="#4b5563" />
                <Text style={styles.tourName}>{item.booking.tour.title}</Text>
              </View>
            )}
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleDateString(i18n.language, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#6b7280", fontSize: 16, marginTop: 40 },
  list: { padding: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: "#c62828",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  iconWrap: { marginRight: 8 },
  title: { fontSize: 15, fontWeight: "600", flex: 1, color: "#374151" },
  titleUnread: { color: "#111827", fontWeight: "bold" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c62828",
    marginLeft: 8,
  },
  message: { fontSize: 13, color: "#6b7280", marginBottom: 6, lineHeight: 18 },
  tourRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  tourName: { fontSize: 12, color: "#4b5563" },
  time: { fontSize: 11, color: "#9ca3af" },
});
