"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import {
  formButtonPrimaryClass,
  formInputClass,
  formLabelClass,
  formTextareaClass
} from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

type AdminSettings = {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowedDomains: string[];
  smtp: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    fromEmail?: string;
    fromName?: string;
  };
  updatedAt: string;
};

export default function AdminSettingsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AdminSettings>("/admin/settings", { token });
      setSettings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveGeneral = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !settings) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    setMessage(null);
    try {
      const domainsRaw = String(fd.get("allowedDomains") ?? "").trim();
      const allowedDomains = domainsRaw
        ? domainsRaw
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean)
        : [];
      await apiRequest<AdminSettings>("/admin/settings", {
        method: "PATCH",
        token,
        body: {
          maintenanceMode: fd.get("maintenanceMode") === "on",
          maintenanceMessage: String(fd.get("maintenanceMessage") ?? "").trim() || undefined,
          allowedDomains: allowedDomains.length ? allowedDomains : undefined
        }
      });
      setMessage("Settings saved.");
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveSmtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    setMessage(null);
    const host = String(fd.get("host") ?? "").trim();
    const portRaw = String(fd.get("port") ?? "").trim();
    const user = String(fd.get("user") ?? "").trim();
    const pass = String(fd.get("pass") ?? "").trim();
    const fromEmail = String(fd.get("fromEmail") ?? "").trim();
    const fromName = String(fd.get("fromName") ?? "").trim();
    if (!host && !portRaw && !user && !pass && !fromEmail && !fromName) {
      setMessage("Provide at least one SMTP field.");
      return;
    }
    try {
      await apiRequest<AdminSettings>("/admin/settings", {
        method: "PATCH",
        token,
        body: {
          smtp: {
            ...(host ? { host } : {}),
            ...(portRaw ? { port: Number(portRaw) } : {}),
            secure: fd.get("secure") === "on",
            ...(user ? { user } : {}),
            ...(pass ? { pass } : {}),
            ...(fromEmail ? { fromEmail } : {}),
            ...(fromName ? { fromName } : {})
          }
        }
      });
      setMessage("SMTP settings saved.");
      form.reset();
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    }
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error || !settings) return <p className="text-red-400">{error ?? "Unable to load settings."}</p>;

  return (
    <section className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white sm:text-2xl">Platform settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Last updated {new Date(settings.updatedAt).toLocaleString()}
        </p>
      </div>
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}

      <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" onSubmit={saveGeneral}>
        <h2 className="text-lg font-semibold text-white">General</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            className="h-4 w-4 rounded border-slate-300"
            defaultChecked={settings.maintenanceMode}
            name="maintenanceMode"
            type="checkbox"
          />
          Maintenance mode
        </label>
        <div>
          <label className={formLabelClass} htmlFor="settings-maintenance-msg">
            Maintenance message
          </label>
          <textarea
            className={formTextareaClass}
            defaultValue={settings.maintenanceMessage ?? ""}
            id="settings-maintenance-msg"
            name="maintenanceMessage"
          />
        </div>
        <div>
          <label className={formLabelClass} htmlFor="settings-domains">
            Allowed domains (comma-separated)
          </label>
          <input
            className={formInputClass}
            defaultValue={settings.allowedDomains.join(", ")}
            id="settings-domains"
            name="allowedDomains"
          />
        </div>
        <button className={formButtonPrimaryClass} type="submit">
          Save general
        </button>
      </form>

      <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" onSubmit={saveSmtp}>
        <h2 className="text-lg font-semibold text-white">SMTP overrides</h2>
        <p className="text-xs text-slate-500">
          Optional. Leave password blank to keep the current secret. At least one field is required per save.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={formLabelClass} htmlFor="smtp-host">
              Host
            </label>
            <input className={formInputClass} defaultValue={settings.smtp.host ?? ""} id="smtp-host" name="host" />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="smtp-port">
              Port
            </label>
            <input
              className={formInputClass}
              defaultValue={settings.smtp.port ?? ""}
              id="smtp-port"
              name="port"
              type="number"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 sm:col-span-2">
            <input className="h-4 w-4 rounded border-slate-300" defaultChecked={Boolean(settings.smtp.secure)} name="secure" type="checkbox" />
            TLS / secure
          </label>
          <div className="sm:col-span-2">
            <label className={formLabelClass} htmlFor="smtp-user">
              Username
            </label>
            <input className={formInputClass} defaultValue={settings.smtp.user ?? ""} id="smtp-user" name="user" />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass} htmlFor="smtp-pass">
              Password (optional)
            </label>
            <input className={formInputClass} id="smtp-pass" name="pass" type="password" autoComplete="new-password" />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="smtp-from-email">
              From email
            </label>
            <input
              className={formInputClass}
              defaultValue={settings.smtp.fromEmail ?? ""}
              id="smtp-from-email"
              name="fromEmail"
              type="email"
            />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="smtp-from-name">
              From name
            </label>
            <input className={formInputClass} defaultValue={settings.smtp.fromName ?? ""} id="smtp-from-name" name="fromName" />
          </div>
        </div>
        <button className={formButtonPrimaryClass} type="submit">
          Save SMTP
        </button>
      </form>
    </section>
  );
}
