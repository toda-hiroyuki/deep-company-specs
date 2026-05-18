import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../lib/api";

interface TourPin {
  id: string;
  title: string;
  category: string;
  tourType: string;
  imageUrl: string | null;
  meetingPoint: { lat: number; lng: number; name: string };
  pricePerPersonCents: number;
  nextSchedule: {
    id: string;
    startDateTime: string;
    remainingSlots: number;
    status: string;
  } | null;
  distanceKm: number;
}

// Well-known locations for quick search
const PRESETS: Record<string, [number, number]> = {
  "Tokyo Station": [35.6812, 139.7671],
  Asakusa: [35.7112, 139.7963],
  Shibuya: [35.6595, 139.7004],
  Shinjuku: [35.6896, 139.6921],
  Ginza: [35.6717, 139.7649],
  Ueno: [35.7141, 139.7774],
};

const DEFAULT_LAT = 35.6812;
const DEFAULT_LNG = 139.7671;

export default function MapScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation("mobile");
  const [tours, setTours] = useState<TourPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>([DEFAULT_LAT, DEFAULT_LNG]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchTours(DEFAULT_LAT, DEFAULT_LNG);
  }, []);

  async function fetchTours(lat: number, lng: number) {
    try {
      setFetchError(null);
      const data = await apiFetch<{ tours: TourPin[] }>(
        `/tours/search?lat=${lat}&lng=${lng}&radiusKm=20`
      );
      setTours(data.tours);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFetchError(`API error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const handleMapMove = useCallback((lat: number, lng: number) => {
    fetchTours(lat, lng);
  }, []);

  function handleSearch() {
    const query = searchText.trim().toLowerCase();
    if (!query) return;

    // Check presets
    for (const [name, coords] of Object.entries(PRESETS)) {
      if (name.toLowerCase().includes(query)) {
        setCenter([...coords]);
        fetchTours(coords[0], coords[1]);
        return;
      }
    }

    // Try parsing "lat, lng" format
    const match = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      setCenter([lat, lng]);
      fetchTours(lat, lng);
    }
  }

  function getDotColor(tour: TourPin): string {
    if (!tour.nextSchedule) return "#9ca3af";
    if (tour.nextSchedule.status === "FULL") return "#9ca3af";
    if (tour.nextSchedule.remainingSlots <= 2) return "#f97316";
    if (tour.tourType === "PRIVATE") return "#3b82f6";
    return "#22c55e";
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // --- Web: Google Maps ---
  if (Platform.OS === "web") {
    const WebMap = require("../../components/WebMap").default;

    const pins = tours.map((tour) => ({
      id: tour.id,
      lat: tour.meetingPoint.lat,
      lng: tour.meetingPoint.lng,
      title: tour.title,
      color: getDotColor(tour),
      detail: `$${(tour.pricePerPersonCents / 100).toFixed(2)} ${t("perPerson", { ns: "common" })}`,
    }));

    return (
      <View style={styles.container}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder={t("map.searchPlaceholder")}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>{t("go", { ns: "common" })}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick presets */}
        <View style={styles.presets}>
          {Object.entries(PRESETS).map(([name, coords]) => (
            <TouchableOpacity
              key={name}
              style={styles.presetChip}
              onPress={() => {
                setCenter([...coords]);
                fetchTours(coords[0], coords[1]);
                setSearchText(name);
              }}
            >
              <Text style={styles.presetText}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {fetchError && (
          <View style={[styles.errorBanner]}>
            <Text style={styles.errorText}>{fetchError}</Text>
          </View>
        )}

        {/* Map */}
        <View style={styles.mapWrap}>
          <WebMap
            center={center}
            pins={pins}
            onPinPress={(id: string) => router.push(`/tour/${id}`)}
            onMoveEnd={handleMapMove}
          />
          {/* Tour count overlay */}
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {t("map.tourCount", { count: tours.length })}
            </Text>
          </View>
        </View>

        {/* Bottom list */}
        {tours.length > 0 && (
          <View style={styles.bottomList}>
            {tours.slice(0, 4).map((tour) => (
              <TouchableOpacity
                key={tour.id}
                style={styles.bottomCard}
                onPress={() => router.push(`/tour/${tour.id}`)}
              >
                <View style={styles.bottomCardRow}>
                  {tour.imageUrl && (
                    <Image source={{ uri: tour.imageUrl }} style={styles.bottomCardImage} />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.bottomCardRow}>
                      <View style={[styles.dot, { backgroundColor: getDotColor(tour) }]} />
                      <Text style={styles.bottomCardTitle} numberOfLines={1}>
                        {tour.title}
                      </Text>
                      <Text style={styles.bottomCardPrice}>
                        ${(tour.pricePerPersonCents / 100).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.bottomCardMeta}>
                      📍 {tour.meetingPoint.name}
                      {tour.nextSchedule
                        ? ` · ${t("map.spotsCount", { count: tour.nextSchedule.remainingSlots })}`
                        : ""}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  // --- Native: list fallback (Expo Go) ---
  return (
    <View style={styles.container}>
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          {t("map.nativeFallback")}
        </Text>
      </View>
      {fetchError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      )}
      <FlatList
        data={tours}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("map.noToursNearby")}</Text>
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
            <View style={styles.cardHeader}>
              <View style={[styles.dot, { backgroundColor: getDotColor(item) }]} />
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>
                  {item.tourType === "PRIVATE"
                    ? t("tourType.private", { ns: "common" })
                    : t("tourType.group", { ns: "common" })}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              📍 {item.meetingPoint.name} · {t("map.kmAway", { distance: item.distanceKm })}
            </Text>
            <Text style={styles.meta}>
              ${(item.pricePerPersonCents / 100).toFixed(2)} {t("perPerson", { ns: "common" })}
            </Text>
            {item.nextSchedule && (
              <Text style={styles.schedule}>
                {t("map.next")}{" "}
                {new Date(item.nextSchedule.startDateTime).toLocaleDateString(i18n.language, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {t("map.spotsLeft", { count: item.nextSchedule.remainingSlots })}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  // Search
  searchBar: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    marginLeft: 8,
  },
  searchBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  // Presets
  presets: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  presetText: { fontSize: 12, color: "#2563eb" },
  // Error
  errorBanner: { backgroundColor: "#fee2e2", padding: 8, alignItems: "center" },
  errorText: { color: "#991b1b", fontSize: 12 },
  // Map
  mapWrap: { flex: 1, position: "relative" },
  countBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1000,
  },
  countText: { fontSize: 12, fontWeight: "bold", color: "#374151" },
  // Bottom list (web)
  bottomList: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    maxHeight: 200,
  },
  bottomCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  bottomCardImage: {
    width: 56,
    height: 42,
    borderRadius: 6,
    marginRight: 10,
  },
  bottomCardRow: { flexDirection: "row", alignItems: "center" },
  bottomCardTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  bottomCardPrice: { fontSize: 13, fontWeight: "bold", color: "#2563eb" },
  bottomCardMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  // Native fallback
  infoBanner: { backgroundColor: "#dbeafe", padding: 10, alignItems: "center" },
  infoBannerText: { color: "#1e40af", fontSize: 12 },
  list: { padding: 16 },
  emptyWrap: { paddingTop: 40, alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16 },
  cardImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, padding: 16, paddingBottom: 0 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: "bold", flex: 1 },
  badgeWrap: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 11, color: "#6b7280" },
  meta: { fontSize: 13, color: "#6b7280", marginBottom: 4, paddingHorizontal: 16 },
  schedule: { fontSize: 13, color: "#2563eb", marginTop: 4, paddingHorizontal: 16, paddingBottom: 16 },
});
