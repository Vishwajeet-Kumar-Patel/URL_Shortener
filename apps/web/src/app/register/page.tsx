"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useAuthStore((state) => state.register);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const referralCode = searchParams.get("ref")?.trim().toUpperCase();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    try {
      await register({
        name: String(formData.get("name") ?? ""),
        email,
        password: String(formData.get("password") ?? ""),
        referralCode
      });
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <section className="relative hidden min-h-[40vh] bg-slate-900 md:block md:min-h-screen">
        <img
          alt="Team sharing links"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1600&auto=format&fit=crop"
        />
      </section>
      <section className="mx-auto flex w-full max-w-md items-center px-4 py-10 sm:px-6">
        <div className={`w-full ${formCardClass}`}>
          <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">Create account</h1>
          <p className="mb-6 text-sm text-slate-300">Start shortening and tracking links today.</p>
          {referralCode ? (
            <div className="mb-4 rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              Referral code applied: <span className="font-semibold">{referralCode}</span>
            </div>
          ) : null}
          <form className={formFieldGroupClass} onSubmit={handleSubmit} suppressHydrationWarning>
            <div>
              <label className={formLabelClass} htmlFor="register-name">
                Full name
              </label>
              <input
                autoComplete="name"
                className={formInputClass}
                id="register-name"
                name="name"
                required
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className={formLabelClass} htmlFor="register-email">
                Email
              </label>
              <input
                autoComplete="email"
                className={formInputClass}
                id="register-email"
                name="email"
                type="email"
                required
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className={formLabelClass} htmlFor="register-password">
                Password
              </label>
              <input
                autoComplete="new-password"
                className={formInputClass}
                id="register-password"
                name="password"
                type="password"
                minLength={8}
                required
                suppressHydrationWarning
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button className={formButtonPrimaryClass} disabled={loading} type="submit" suppressHydrationWarning>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
          <div className="my-4 text-center text-xs text-slate-500">or</div>
          <GoogleButton href={`${API_BASE_URL}/auth/google`} />
          <p className="mt-5 text-sm text-slate-300">
            Already have an account?{" "}
            <Link className="text-indigo-400" href="/login">
              Login
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading...
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
