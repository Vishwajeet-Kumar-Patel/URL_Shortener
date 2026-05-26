"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formButtonPrimaryClass,
  formCardClass,
  formFieldGroupClass,
  formInputClass,
  formLabelClass
} from "@/components/ui/form-classes";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type ProfilePayload = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export function ProfileForm() {
  const token = useAuthStore((state) => state.accessToken);
  const patchUser = useAuthStore((state) => state.patchUser);

  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ProfilePayload>("/users/me", { token });
      setProfile(data);
      setName(data.name);
      setEmail(data.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const emailDirty = profile && email.trim().toLowerCase() !== profile.email.toLowerCase();

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile) return;
    setSavingProfile(true);
    setMessage(null);
    setError(null);
    try {
      const body: { name?: string; email?: string; currentPassword?: string } = {};
      if (name.trim() !== profile.name) {
        body.name = name.trim();
      }
      if (emailDirty) {
        body.email = email.trim().toLowerCase();
        body.currentPassword = emailPassword;
      }
      if (Object.keys(body).length === 0) {
        setMessage("Nothing to update.");
        setSavingProfile(false);
        return;
      }
      const data = await apiRequest<ProfilePayload>("/users/me", { method: "PATCH", token, body });
      setProfile(data);
      setName(data.name);
      setEmail(data.email);
      setEmailPassword("");
      patchUser({ name: data.name, email: data.email });
      setMessage(
        emailDirty
          ? "Profile updated. Check your new inbox for a verification link before the next login."
          : "Profile updated."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    setMessage(null);
    setError(null);
    try {
      await apiRequest<null>("/users/me/password", {
        method: "PATCH",
        token,
        body: { currentPassword, newPassword }
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!token) {
    return <p className="text-sm text-slate-500">Sign in to manage your profile.</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading profile…</p>;
  }

  if (!profile) {
    return <p className="text-sm text-red-400">{error ?? "Profile unavailable."}</p>;
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <form className={`${formCardClass} ${formFieldGroupClass}`} onSubmit={saveProfile}>
        <div>
          <h2 className="text-lg font-semibold text-white">Account details</h2>
          <p className="mt-1 text-sm text-slate-500">
            Update your display name or email. Changing email requires your current password and sends a
            verification link to the new address.
          </p>
        </div>
        <div>
          <label className={formLabelClass} htmlFor="profile-name">
            Name
          </label>
          <input
            autoComplete="name"
            className={formInputClass}
            id="profile-name"
            onChange={(ev) => setName(ev.target.value)}
            value={name}
          />
        </div>
        <div>
          <label className={formLabelClass} htmlFor="profile-email">
            Email
          </label>
          <input
            autoComplete="email"
            className={formInputClass}
            id="profile-email"
            onChange={(ev) => setEmail(ev.target.value)}
            type="email"
            value={email}
          />
          <p className="mt-1 text-xs text-slate-500">
            Verified: {profile.isEmailVerified ? "yes" : "no"} · Role: {profile.role}
          </p>
        </div>
        {emailDirty ? (
          <div>
            <label className={formLabelClass} htmlFor="profile-email-pw">
              Current password (required to change email)
            </label>
            <input
              autoComplete="current-password"
              className={formInputClass}
              id="profile-email-pw"
              onChange={(ev) => setEmailPassword(ev.target.value)}
              type="password"
              value={emailPassword}
            />
          </div>
        ) : null}
        <button className={formButtonPrimaryClass} disabled={savingProfile} type="submit">
          {savingProfile ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form className={`${formCardClass} ${formFieldGroupClass}`} onSubmit={savePassword}>
        <div>
          <h2 className="text-lg font-semibold text-white">Password</h2>
          <p className="mt-1 text-sm text-slate-500">Use a strong password you do not reuse elsewhere.</p>
        </div>
        <div>
          <label className={formLabelClass} htmlFor="pw-current">
            Current password
          </label>
          <input
            autoComplete="current-password"
            className={formInputClass}
            id="pw-current"
            onChange={(ev) => setCurrentPassword(ev.target.value)}
            type="password"
            value={currentPassword}
          />
        </div>
        <div>
          <label className={formLabelClass} htmlFor="pw-new">
            New password
          </label>
          <input
            autoComplete="new-password"
            className={formInputClass}
            id="pw-new"
            onChange={(ev) => setNewPassword(ev.target.value)}
            type="password"
            value={newPassword}
          />
        </div>
        <div>
          <label className={formLabelClass} htmlFor="pw-confirm">
            Confirm new password
          </label>
          <input
            autoComplete="new-password"
            className={formInputClass}
            id="pw-confirm"
            onChange={(ev) => setConfirmPassword(ev.target.value)}
            type="password"
            value={confirmPassword}
          />
        </div>
        <button className={formButtonPrimaryClass} disabled={savingPassword} type="submit">
          {savingPassword ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
