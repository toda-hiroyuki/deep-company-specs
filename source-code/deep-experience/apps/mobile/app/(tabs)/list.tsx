import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../lib/api";

interface TourItem {
  id: string;
  title: string;
  category: string;
  tourType: string;
  imageUrl: string | null;
  pricePerPersonCents: number;
  durationMinutes: number;
  meetingPoint: { name: string };
  nextSchedule: {
    startDateTime: string;
    remainingSlots: number;
  } | null;
  distanceKm: number;
}

export default function ListScreen() {
  const router = useRouter();
  const { t } = useTranslation("mobile");
  const { t: tc } = useTranslation("common");
  const [tours, setTours] = useState<TourItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTours();
  }, []);

  async function fetchTours() {
    try {
      // Default to Tokyo station area
      const data = await apiFetch<{ tours: TourItem[] }>(
        "/tours/search?lat=35.6812&lng=139.7671&radiusKm=20"
      );
      setTours(data.tours);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <FlatList
      data={tours}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>{t("list.noTours")}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/tour/${item.id}`)}
        >
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
          )}
          <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.badge}>
              {item.tourType === "PRIVATE" ? tc("tourType.private") : tc("tourType.group")}
            </Text>
          </View>
          <Text style={styles.meta}>
            📍 {item.meetingPoint.name} · {t("map.kmAway", { distance: item.distanceKm })}
          </Text>
          <Text style={styles.meta}>
            ⏱ {t("list.durationMin", { minutes: item.durationMinutes })} · $
            {(item.pricePerPersonCents / 100).toFixed(2)} {tc("perPerson")}
          </Text>
          {item.nextSchedule && (
            <Text style={styles.schedule}>
              {t("map.next")}{" "}
              {new Date(item.nextSchedule.startDateTime).toLocaleDateString(
                "en",
                {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}{" "}
              · {t("list.spotsLeft", { count: item.nextSchedule.remainingSlots })}
            </Text>
          )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#6b7280", fontSize: 16 },
  list: { padding: 16 },
  cardImage: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardBody: {
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "bold", flex: 1 },
  badge: {
    fontSize: 11,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  meta: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  schedule: { fontSize: 13, color: "#2563eb", marginTop: 4 },
});
