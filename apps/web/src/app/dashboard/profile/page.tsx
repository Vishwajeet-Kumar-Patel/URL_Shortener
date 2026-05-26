"use client";

import { ProfileForm } from "@/components/profile/profile-form";

export default function DashboardProfilePage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Keep your account details accurate. Email changes require verification; password changes apply
          immediately.
        </p>
      </header>
      <ProfileForm />
    </section>
  );
}
