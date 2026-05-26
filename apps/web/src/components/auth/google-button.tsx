type Props = {
  href: string;
  label?: string;
};

export const GoogleButton = ({ href, label = "Continue with Google" }: Props) => {
  return (
    <a
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
      href={href}
    >
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M21.35 11.1H12v2.98h5.35c-.23 1.52-1.75 4.46-5.35 4.46-3.22 0-5.84-2.67-5.84-5.96s2.62-5.96 5.84-5.96c1.84 0 3.07.78 3.77 1.46l2.58-2.5C16.68 3.98 14.54 3 12 3 6.93 3 2.82 7.16 2.82 12.25S6.93 21.5 12 21.5c6.93 0 9.17-4.84 9.17-7.34 0-.49-.05-.84-.12-1.06z" fill="#4285F4" />
        <path d="M3.15 7.44l2.45 1.8A5.84 5.84 0 0 1 12 6.29c1.84 0 3.07.78 3.77 1.46l2.58-2.5C16.68 3.98 14.54 3 12 3 8.02 3 4.57 5.2 3.15 7.44z" fill="#EA4335" />
        <path d="M2.82 12.25c0 1.79.64 3.44 1.7 4.73l2.72-2.1a5.83 5.83 0 0 1 0-5.26l-2.72-2.1a9.22 9.22 0 0 0-1.7 4.73z" fill="#FBBC05" />
        <path d="M12 21.5c2.48 0 4.56-.82 6.08-2.22l-2.81-2.18c-.78.53-1.78.84-3.27.84a5.84 5.84 0 0 1-5.35-3.96l-2.72 2.1C4.57 19.3 8.02 21.5 12 21.5z" fill="#34A853" />
      </svg>
      {label}
    </a>
  );
};
