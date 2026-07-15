"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HiOutlineBuildingStorefront,
  HiOutlineDevicePhoneMobile,
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineLockClosed,
} from "react-icons/hi2";

import { LocaleToggle } from "@/components/LocaleToggle";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { getBusinessSettings, login, type BusinessSettings } from "@/lib/api";

const fallbackSettings: BusinessSettings = {
  businessName: "Bakery",
  address: "",
  phone: "",
  email: null,
  ownerName: null,
};

export function LoginForm() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BusinessSettings>(fallbackSettings);

  useEffect(() => {
    void getBusinessSettings()
      .then(setSettings)
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { user } = await login(email.trim(), password);
      if (user.role !== "admin") {
        setError(t("login.adminOnlyError"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : t("login.failed"),
      );
    } finally {
      setLoading(false);
    }
  }

  const contactLine = [settings.phone, settings.email]
    .filter(Boolean)
    .join("  •  ");

  return (
    <div className="login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-50 via-amber-100/80 to-orange-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-orange-200/35 blur-3xl"
      />

      <div className="absolute right-4 top-4 z-10 sm:right-8 sm:top-8">
        <LocaleToggle />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-amber-200 bg-white/90 shadow-xl backdrop-blur-sm lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-amber-700 via-amber-600 to-orange-600 px-10 py-12 text-white lg:flex">
          <div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg">
              <HiOutlineBuildingStorefront className="h-8 w-8" aria-hidden />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">
              {t("login.adminPortal")}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">
              {settings.businessName}
            </h1>
            {settings.address ? (
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-amber-50/90">
                {settings.address}
              </p>
            ) : null}
            {contactLine ? (
              <p className="mt-3 text-sm text-amber-100/90">{contactLine}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <HiOutlineDevicePhoneMobile
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-100"
                aria-hidden
              />
              <div>
                <p className="text-sm font-semibold">
                  {t("login.deliveryPartnersTitle")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-amber-50/85">
                  {t("login.deliveryPartnersBlurb")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-50 shadow-md lg:hidden">
              <HiOutlineBuildingStorefront
                className="h-8 w-8 text-amber-700"
                aria-hidden
              />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 lg:mt-0">
              {settings.businessName}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-black">
              {t("login.welcomeBack")}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">
              {t("login.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="bakery-label">
                {t("login.email")}
              </label>
              <div className="login-input-wrap">
                <HiOutlineEnvelope
                  className="h-5 w-5 shrink-0 text-stone-400"
                  aria-hidden
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="bakery-label">
                {t("login.password")}
              </label>
              <div className="login-input-wrap">
                <HiOutlineLockClosed
                  className="h-5 w-5 shrink-0 text-stone-400"
                  aria-hidden
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="shrink-0 rounded-lg p-1 text-stone-500 transition hover:bg-amber-50 hover:text-amber-800"
                  aria-label={
                    showPassword
                      ? t("login.hidePasswordAria")
                      : t("login.showPasswordAria")
                  }
                >
                  {showPassword ? (
                    <HiOutlineEyeSlash className="h-5 w-5" aria-hidden />
                  ) : (
                    <HiOutlineEye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              className="min-h-11 rounded-xl py-2.5 text-base font-semibold"
            >
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-stone-500 lg:text-left">
            {t("login.footer")}
          </p>
        </section>
      </div>
    </div>
  );
}
