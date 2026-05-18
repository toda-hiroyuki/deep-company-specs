"use client";

import { useEffect, useState } from "react";
import { useGuestAuth } from "@/lib/guest-auth";
import { useI18n, SUPPORTED_LOCALES } from "@/lib/i18n";

interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  nationality: string | null;
  language: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { t } = useI18n();
  const { guestFetch, isLoggedIn, loading: authLoading, login, token } =
    useGuestAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationality, setNationality] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    setLoading(true);
    guestFetch("/guest/profile")
      .then((data: { guest: Profile }) => {
        setProfile(data.guest);
        setFirstName(data.guest.firstName);
        setLastName(data.guest.lastName);
        setNationality(data.guest.nationality ?? "");
        setLanguage(data.guest.language ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [authLoading, isLoggedIn, guestFetch]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const data = (await guestFetch("/guest/profile", {
        method: "PUT",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          nationality: nationality.trim() || null,
          language: language.trim() || null,
        }),
      })) as { guest: Profile };
      setProfile(data.guest);
      // Sync the cached guest_info so Header greeting reflects the new name.
      if (token) {
        login(token, {
          id: data.guest.id,
          email: data.guest.email,
          firstName: data.guest.firstName,
          lastName: data.guest.lastName,
        });
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-red-600">
        {error || "Profile not available"}
      </div>
    );
  }

  return (
    <section className="max-w-xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {t("guest.me.profile.title")}
      </h2>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("guest.auth.email")}
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t("guest.me.profile.emailReadOnly")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("guest.auth.lastName")}
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("guest.auth.firstName")}
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("guest.me.profile.nationality")}
          </label>
          <input
            type="text"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="JP / US / FR ..."
            maxLength={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t("guest.me.profile.nationalityHint")}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("guest.me.profile.language")}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">{t("guest.me.profile.languageNotSet")}</option>
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l} value={l}>
                {l === "ja" ? "日本語" : "English"}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
            {t("guest.me.profile.saved")}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
          >
            {saving ? t("loading") : t("save")}
          </button>
        </div>
      </form>
    </section>
  );
}
