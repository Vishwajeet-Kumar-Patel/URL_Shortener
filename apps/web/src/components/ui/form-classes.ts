/** Shared Tailwind classes for accessible, responsive forms (light SaaS theme). */

export const formLabelClass = "mb-1 block text-sm font-medium text-slate-700";

export const formInputClass =
  "w-full min-h-[2.75rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-500 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60";

export const formTextareaClass =
  "w-full min-h-[6.5rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-500 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60";

export const formSelectClass = formInputClass;

export const formButtonPrimaryClass =
  "inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60";

export const formButtonSecondaryClass =
  "inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200";

export const formCardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6";

export const formFieldGroupClass = "space-y-4 sm:space-y-5";
