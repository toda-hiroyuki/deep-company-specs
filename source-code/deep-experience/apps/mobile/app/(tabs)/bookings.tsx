import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../../lib/api";

interface BookingItem {
  id: string;
  status: string;
  numberOfGuests: number;
  tour: { title: string };
  schedule: { startDateTime: string; meetingPointName: string };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#22c55e",
  CANCELLED: "#ef4444",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#6b7280",
  EXPIRED: "#9ca3af",
};

const STATUS_KEYS: Record<string, string> = {
  PENDING: "status.pending",
  CONFIRMED: "status.confirmed",
  CANCELLED: "status.cancelled",
  IN_PROGRESS: "status.inProgress",
  COMPLETED: "status.completed",
  EXPIRED: "status.expired",
};

export default function BookingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation("mobile");
  const { t: tc } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searched, setSearched] = useState(false);

  // Restore saved email on mount
  useEffect(() => {
    AsyncStorage.getItem("userEmail").then((saved) => {
      if (saved) setEmail(saved);
    });
  }, []);

  async function searchBookings() {
    if (!email.trim()) {
      Alert.alert(tc("error"), t("bookings.enterEmail"));
      return;
    }
    try {
      const trimmed = email.trim();
      const data = await apiFetch<{ bookings: BookingItem[] }>(
        `/bookings?email=${encodeURIComponent(trimmed)}`
      );
      setBookings(data.bookings);
      setSearched(true);
      // Save email for notifications and future searches
      await AsyncStorage.setItem("userEmail", trimmed);
    } catch {
      Alert.alert(tc("error"), t("bookings.searchFailed"));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder={t("bookings.emailPlaceholder")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          onSubmitEditing={searchBookings}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchBookings}>
          <Text style={styles.searchBtnText}>{tc("search")}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          searched ? (
            <View style={styles.center}>
              <Text style={styles.empty}>{t("bookings.noBookings")}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/booking/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.tour.title}</Text>
              <Text
                style={[
                  styles.status,
                  { color: STATUS_COLORS[item.status] || "#6b7280" },
                ]}
              >
                {tc(STATUS_KEYS[item.status] || item.status)}
              </Text>
            </View>
            <Text style={styles.meta}>
              📍 {item.schedule.meetingPointName}
            </Text>
            <Text style={styles.meta}>
              📅{" "}
              {new Date(item.schedule.startDateTime).toLocaleDateString(i18n.language, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text style={styles.meta}>
              👥 {t("bookings.guestCount", { count: item.numberOfGuests })}
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
  searchBox: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    marginLeft: 8,
  },
  searchBtnText: { color: "white", fontWeight: "bold" },
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "bold", flex: 1 },
  status: { fontSize: 12, fontWeight: "bold" },
  meta: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
});
