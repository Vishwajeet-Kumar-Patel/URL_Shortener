"use client";

import { ProfileForm } from "@/components/profile/profile-form";

export default function AdminProfilePage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Same account settings as the user dashboard—update your name, email, and password while you are in
          the admin workspace.
        </p>
      </header>
      <ProfileForm />
    </section>
  );
}
