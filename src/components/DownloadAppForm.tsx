"use client";

import { useEffect, useState } from "react";
import { HiOutlineDevicePhoneMobile } from "react-icons/hi2";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getAppDownloadInfo,
  loginAppDownload,
} from "@/lib/api";

export function DownloadAppForm() {
  const toast = useToast();
  const [businessName, setBusinessName] = useState("Bakery");
  const [enabled, setEnabled] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    void getAppDownloadInfo()
      .then((info) => {
        setBusinessName(info.businessName);
        setEnabled(info.enabled);
      })
      .catch(() => undefined)
      .finally(() => setLoadingInfo(false));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      await loginAppDownload(username, password);
      setAuthenticated(true);
      toast.success("Access granted. Tap download to install the app.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    window.location.href = "/api/app-download/apk";
  }

  return (
    <div className="login-page flex min-h-screen items-center justify-center bg-amber-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <HiOutlineDevicePhoneMobile className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-700">
              {businessName}
            </p>
            <h1 className="text-2xl font-bold text-black">Download mobile app</h1>
          </div>
        </div>

        <p className="mt-4 text-sm text-stone-600">
          Delivery guys: enter the username and password from your admin to
          download and install the Android app.
        </p>

        {loadingInfo ? (
          <p className="mt-6 text-sm text-stone-500">Loading...</p>
        ) : !enabled ? (
          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-stone-700">
            App download is not set up yet. Ask your admin to configure it in
            Settings.
          </div>
        ) : authenticated ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              You are signed in. Download the APK, then open it on your Android
              phone to install.
            </div>
            <Button fullWidth onClick={handleDownload}>
              Download APK
            </Button>
            <p className="text-center text-xs text-stone-500">
              Link expires after 1 hour. Sign in again if needed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Username"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Checking..." : "Continue to download"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
