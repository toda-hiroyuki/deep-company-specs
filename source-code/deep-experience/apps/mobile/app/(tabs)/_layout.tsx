import { useEffect, useState, useCallback } from "react";
import { Tabs, useRouter } from "expo-router";
import { Image, Platform, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Bell, Map, List, Package } from "lucide-react-native";
import { apiFetch } from "../../lib/api";

const LOGO_URI =
  "https://storage.googleapis.com/studio-design-asset-files/projects/YPqren8wO5/s-140x102_1626c091-2258-4911-84d1-10d30e947a56.svg";

const EMAIL_STORAGE_KEY = "userEmail";

function LogoHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);
      if (!email) return;
      const data = await apiFetch<{
        notifications: { isRead: boolean }[];
      }>(`/notifications?email=${encodeURIComponent(email)}`);
      setUnreadCount(data.notifications.filter((n) => !n.isRead).length);
    } catch {
      // Silently fail — notification count is non-critical
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <View style={[headerStyles.container, { paddingTop: insets.top + 6 }]}>
      <View style={headerStyles.spacer} />
      <View style={headerStyles.logoWrap}>
        {Platform.OS === "web" ? (
          <img src={LOGO_URI} style={{ width: 100, height: 44 }} alt="DEEP Experience" />
        ) : (
          <Image
            source={require("../../assets/deepx.jpg")}
            style={{ width: 100, height: 44 }}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={headerStyles.bellWrap}>
        <TouchableOpacity onPress={() => router.push("/notifications")}>
          <Bell size={22} color="#fff" />
          {unreadCount > 0 && (
            <View style={headerStyles.badge}>
              <Text style={headerStyles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: "#c62828",
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: { width: 44 },
  logoWrap: { flex: 1, alignItems: "center" },
  bellWrap: { width: 44, alignItems: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#c62828",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default function TabLayout() {
  const { t } = useTranslation("mobile");
  return (
    <View style={{ flex: 1 }}>
      <LogoHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#c62828",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.map"),
            tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="list"
          options={{
            title: t("tabs.list"),
            tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: t("tabs.bookings"),
            tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
