"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleButton } from "@/components/auth/google-button";
import {
  formButtonPrimaryClass,
  formCardClass,
  formFieldGroupClass,
  formInputClass,
  formLabelClass
} from "@/components/ui/form-classes";
import { getApiBaseUrl } from "@/lib/public-env";
import { useAuthStore } from "@/store/auth.store";

const API_BASE_URL = getApiBaseUrl();

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const [emailValue, setEmailValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(user.role === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    try {
      const email = String(formData.get("email") ?? "");
      await login({
        email,
        password: String(formData.get("password") ?? "")
      });
      const role = useAuthStore.getState().user?.role;
      router.push(role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <section className="relative hidden min-h-[40vh] bg-slate-900 md:block md:min-h-screen">
        <img
          alt="Analytics workspace"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop"
        />
      </section>
      <section className="mx-auto flex w-full max-w-md items-center px-4 py-10 sm:px-6">
        <div className={`w-full ${formCardClass}`}>
          <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">Welcome back</h1>
          <p className="mb-6 text-sm text-slate-300">Log in to manage your links and analytics.</p>
          <form className={formFieldGroupClass} onSubmit={handleSubmit} suppressHydrationWarning>
            <div>
              <label className={formLabelClass} htmlFor="login-email">
                Email
              </label>
              <input
                autoComplete="email"
                className={formInputClass}
                id="login-email"
                name="email"
                type="email"
                required
                value={emailValue}
                onChange={(event) => setEmailValue(event.target.value)}
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className={formLabelClass} htmlFor="login-password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className={formInputClass}
                id="login-password"
                name="password"
                type="password"
                required
                suppressHydrationWarning
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {error === "Email is not verified" ? (
              <p className="text-sm text-amber-300">
                Please verify your email.{" "}
                <Link className="underline" href={`/auth/resend-verification?email=${encodeURIComponent(emailValue)}`}>
                  Resend verification
                </Link>
              </p>
            ) : null}
            <button className={formButtonPrimaryClass} disabled={loading} type="submit" suppressHydrationWarning>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-3 text-right text-xs">
            <Link className="text-indigo-300 hover:text-indigo-200" href="/auth/forgot-password">
              Forgot password?
            </Link>
          </div>
          <div className="my-4 text-center text-xs text-slate-500">or</div>
          <GoogleButton href={`${API_BASE_URL}/auth/google`} />
          <p className="mt-5 text-sm text-slate-300">
            No account?{" "}
            <Link className="text-indigo-400" href="/register">
              Register
            </Link>
          </p>
          <Link
            className="mt-4 block w-full text-center text-sm text-indigo-400 underline underline-offset-4 hover:text-indigo-300"
            href="/"
          >
            ← Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
