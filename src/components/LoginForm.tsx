"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { getBusinessSettings, login } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("Bakery");

  useEffect(() => {
    void getBusinessSettings()
      .then((settings) => setBusinessName(settings.businessName))
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const { user } = await login(email, password);
      if (user.role !== "admin") {
        toast.error("This web portal is for admin only. Use the mobile app.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (loginError) {
      toast.error(
        loginError instanceof Error ? loginError.message : "Login failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page flex min-h-screen items-center justify-center bg-amber-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-sm"
      >
        <p className="text-sm uppercase tracking-[0.2em] text-amber-700">
          {businessName}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-black">Sign in</h1>
        <p className="mt-2 text-sm text-stone-600">
          Admin login only. Delivery guys use the mobile app.
        </p>

        <div className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" fullWidth className="mt-6" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
