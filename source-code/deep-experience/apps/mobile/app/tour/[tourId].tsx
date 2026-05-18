import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../lib/api";
import { useAlert } from "../../lib/alert";

function MeetingPointMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;

    // Load Google Maps script
    const loadAndInit = async () => {
      if (!window.google?.maps) {
        const { GOOGLE_MAPS_API_KEY } = await import("../../lib/config");
        await new Promise<void>((resolve, reject) => {
          if (window.google?.maps) { resolve(); return; }
          const existing = document.querySelector('script[src*="maps.googleapis.com"]');
          if (existing) { existing.addEventListener("load", () => resolve()); return; }
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Google Maps"));
          document.head.appendChild(script);
        });
      }

      if (!ref.current) return;

      const map = new google.maps.Map(ref.current, {
        center: { lat, lng },
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: "none",
        clickableIcons: false,
      });

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30" viewBox="0 0 20 30">
        <path d="M10 0C4.48 0 0 4.48 0 10c0 7.5 10 20 10 20s10-12.5 10-20C20 4.48 15.52 0 10 0z" fill="#2563eb" stroke="white" stroke-width="1.2"/>
        <circle cx="10" cy="10" r="3.5" fill="white"/>
      </svg>`;
      new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(20, 30),
          anchor: new google.maps.Point(10, 30),
        },
        title,
      });

      mapRef.current = map;
    };

    loadAndInit();

    return () => { mapRef.current = null; };
  }, [lat, lng, title]);

  return <div ref={ref} style={{ width: "100%", height: 200, borderRadius: 12, overflow: "hidden", margin: "0 20px" }} />;
}

interface TourDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  tourType: string;
  meetingPoint: { lat: number; lng: number; name: string };
  durationMinutes: number;
  pricePerPersonCents: number;
  maxParticipants: number;
  imageUrls: string[];
}

interface Schedule {
  id: string;
  startDateTime: string;
  endDateTime: string;
  remainingSlots: number;
  status: string;
  isCutoffClosed?: boolean;
}

export default function TourDetailScreen() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation("mobile");
  const { t: tc } = useTranslation("common");
  const alert = useAlert();
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking form state
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [tourData, schedData] = await Promise.all([
          apiFetch<TourDetail>(`/tours/${tourId}`),
          apiFetch<{ schedules: Schedule[] }>(`/tours/${tourId}/schedules`),
        ]);
        setTour(tourData);
        setSchedules(schedData.schedules.filter((s) => s.status === "OPEN"));
      } catch {
        alert(tc("error"), t("tour.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [tourId]);

  async function handleBook() {
    if (!selectedSchedule || !name.trim() || !email.trim()) {
      alert(tc("error"), t("tour.fillRequired"));
      return;
    }
    const chosen = schedules.find((s) => s.id === selectedSchedule);
    if (!chosen) {
      alert(tc("error"), t("tour.fillRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiFetch<{ id: string }>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          tourId,
          requestedStartDateTime: chosen.startDateTime,
          travelerName: name.trim(),
          travelerEmail: email.trim(),
          numberOfGuests: guests,
          specialRequests: note.trim() || undefined,
        }),
      });
      alert(t("tour.bookingRequested"), t("tour.waitingConfirmation"), [
        { text: t("tour.viewBooking"), onPress: () => router.push(`/booking/${result.id}`) },
      ]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("tour.bookingFailed");
      alert(tc("error"), message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !tour) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {tour.imageUrls?.[0] && (
        <Image source={{ uri: tour.imageUrls[0] }} style={styles.heroImage} />
      )}
      <Text style={styles.title}>{tour.title}</Text>

      <View style={styles.tags}>
        <Text style={styles.tag}>{tour.category}</Text>
        <Text style={styles.tag}>
          {tour.tourType === "PRIVATE" ? tc("tourType.private") : tc("tourType.group")}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.info}>📍 {tour.meetingPoint.name}</Text>
        <Text style={styles.info}>⏱ {tour.durationMinutes} min</Text>
      </View>
      <Text style={styles.price}>
        ${(tour.pricePerPersonCents / 100).toFixed(2)} {tc("perPerson")}
      </Text>

      <Text style={styles.sectionTitle}>{t("tour.description")}</Text>
      <Text style={styles.description}>{tour.description}</Text>

      <Text style={styles.sectionTitle}>{t("tour.meetingPoint")}</Text>
      <Text style={styles.meetingPointText}>📍 {tour.meetingPoint.name}</Text>
      {Platform.OS === "web" ? (
        <MeetingPointMap
          lat={tour.meetingPoint.lat}
          lng={tour.meetingPoint.lng}
          title={tour.meetingPoint.name}
        />
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>
            {tour.meetingPoint.lat.toFixed(4)}, {tour.meetingPoint.lng.toFixed(4)}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t("tour.availableTimes")}</Text>
      {schedules.length === 0 ? (
        <Text style={styles.empty}>{t("tour.noSchedules")}</Text>
      ) : (
        schedules.map((s) => {
          const closed = s.isCutoffClosed === true;
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.scheduleCard,
                selectedSchedule === s.id && styles.scheduleSelected,
                closed && styles.scheduleClosed,
              ]}
              onPress={() => {
                setSelectedSchedule(s.id);
                setShowForm(true);
              }}
              disabled={closed}
            >
              <Text
                style={[styles.scheduleTime, closed && styles.scheduleTimeClosed]}
              >
                {new Date(s.startDateTime).toLocaleDateString(i18n.language, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {closed ? (
                <Text style={styles.scheduleCutoffClosed}>
                  {t("tour.bookingCutoffClosed")}
                </Text>
              ) : (
                <Text style={styles.scheduleSlots}>
                  {t("map.spotsLeft", { count: s.remainingSlots })}
                </Text>
              )}
            </TouchableOpacity>
          );
        })
      )}

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>{t("tour.yourDetails")}</Text>

          <Text style={styles.label}>{t("tour.numberOfGuests")}</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setGuests(Math.max(1, guests - 1))}
            >
              <Text style={styles.counterBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{guests}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setGuests(guests + 1)}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t("tour.nameLabel")}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t("tour.namePlaceholder")}
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>{t("tour.emailLabel")}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t("tour.emailPlaceholder")}
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t("tour.specialRequests")}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={note}
            onChangeText={setNote}
            placeholder={t("tour.specialRequestsPlaceholder")}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.total}>
            {t("tour.total", { amount: ((tour.pricePerPersonCents * guests) / 100).toFixed(2) })}
          </Text>

          <TouchableOpacity
            style={[styles.bookBtn, submitting && styles.bookBtnDisabled]}
            onPress={handleBook}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.bookBtnText}>{t("tour.requestBooking")}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  content: { paddingBottom: 40 },
  heroImage: {
    width: "100%",
    height: 220,
    marginBottom: 16,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8, paddingHorizontal: 20 },
  tags: { flexDirection: "row", gap: 8, marginBottom: 12, paddingHorizontal: 20 },
  tag: {
    fontSize: 12,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoRow: { flexDirection: "row", gap: 16, marginBottom: 8, paddingHorizontal: 20 },
  info: { fontSize: 14, color: "#4b5563" },
  price: { fontSize: 18, fontWeight: "bold", color: "#2563eb", marginBottom: 16, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  description: { fontSize: 14, color: "#4b5563", lineHeight: 22, paddingHorizontal: 20 },
  meetingPointText: { fontSize: 14, color: "#4b5563", paddingHorizontal: 20, marginBottom: 8 },
  mapPlaceholder: {
    marginHorizontal: 20,
    height: 120,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  mapPlaceholderText: { fontSize: 13, color: "#9ca3af" },
  empty: { color: "#9ca3af", fontSize: 14 },
  scheduleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  scheduleSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  scheduleClosed: { backgroundColor: "#f3f4f6", opacity: 0.6 },
  scheduleTime: { fontSize: 14, fontWeight: "500" },
  scheduleTimeClosed: { color: "#6b7280" },
  scheduleSlots: { fontSize: 13, color: "#22c55e" },
  scheduleCutoffClosed: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  form: { marginTop: 16, paddingHorizontal: 20 },
  label: { fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textarea: { height: 80, textAlignVertical: "top" },
  counter: { flexDirection: "row", alignItems: "center", gap: 16 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnText: { fontSize: 18, fontWeight: "bold" },
  counterValue: { fontSize: 18, fontWeight: "bold", minWidth: 24, textAlign: "center" },
  total: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  bookBtn: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
