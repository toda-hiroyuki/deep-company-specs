import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../lib/api";
import { useAlert } from "../../lib/alert";

interface BookingDetail {
  id: string;
  status: string;
  travelerName: string;
  numberOfGuests: number;
  specialRequests: string | null;
  totalPriceCents: number;
  createdAt: string;
  tour: { title: string };
  schedule: {
    startDateTime: string;
    endDateTime: string;
    meetingPoint: { lat: number; lng: number; name: string };
  };
  guide: { name: string; profileImageUrl: string | null } | null;
}

const STATUS_KEYS: Record<string, string> = {
  PENDING: "status.pending",
  CONFIRMED: "status.confirmed",
  CANCELLED: "status.cancelled",
  IN_PROGRESS: "status.inProgress",
  COMPLETED: "status.completed",
  EXPIRED: "status.expired",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#22c55e",
  CANCELLED: "#ef4444",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#6b7280",
  EXPIRED: "#9ca3af",
};

export default function BookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { t, i18n } = useTranslation("mobile");
  const { t: tc } = useTranslation("common");
  const alert = useAlert();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  async function loadBooking() {
    try {
      const data = await apiFetch<BookingDetail>(`/bookings/${bookingId}`);
      setBooking(data);
    } catch {
      alert(tc("error"), t("booking.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    alert(t("booking.cancelBooking"), t("booking.confirmCancel"), [
      { text: tc("no"), style: "cancel" },
      {
        text: t("booking.yesCancel"),
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/bookings/${bookingId}/cancel`, {
              method: "POST",
            });
            loadBooking();
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : t("booking.cancelFailed");
            alert(tc("error"), message);
          }
        },
      },
    ]);
  }

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const statusLabel = tc(STATUS_KEYS[booking.status] || booking.status);
  const statusColor = STATUS_COLORS[booking.status] || "#6b7280";
  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>

      <Text style={styles.tourTitle}>{booking.tour.title}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("booking.schedule")}</Text>
        <Text style={styles.value}>
          {new Date(booking.schedule.startDateTime).toLocaleDateString(i18n.language, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("booking.meetingPoint")}</Text>
        <Text style={styles.value}>📍 {booking.schedule.meetingPoint.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("booking.guests")}</Text>
        <Text style={styles.value}>
          {t("booking.guestCount", { count: booking.numberOfGuests })}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("booking.totalPayOnSite")}</Text>
        <Text style={styles.price}>
          ${(booking.totalPriceCents / 100).toFixed(2)}
        </Text>
      </View>

      {booking.guide && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("booking.yourGuide")}</Text>
          <Text style={styles.value}>👤 {booking.guide.name}</Text>
        </View>
      )}

      {booking.specialRequests && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("booking.specialRequests")}</Text>
          <Text style={styles.value}>{booking.specialRequests}</Text>
        </View>
      )}

      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>{t("booking.cancelBooking")}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statusBanner: { padding: 16, alignItems: "center" },
  statusText: { color: "white", fontSize: 16, fontWeight: "bold" },
  tourTitle: { fontSize: 22, fontWeight: "bold", padding: 20, paddingBottom: 0 },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 12, color: "#9ca3af", fontWeight: "600", marginBottom: 4 },
  value: { fontSize: 16 },
  price: { fontSize: 20, fontWeight: "bold", color: "#2563eb" },
  cancelBtn: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef4444",
    alignItems: "center",
  },
  cancelBtnText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },
});
