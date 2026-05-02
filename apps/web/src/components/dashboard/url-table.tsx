"use client";

type UrlItem = {
  id: string;
  shortCode: string;
  shortUrl?: string;
  originalUrl: string;
  status: string;
  clickCount: number;
  createdAt: string;
};

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
    <path
      d="M6 14L14 6M14 6H8M14 6V12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
    <path
      d="M7 7.5V5.75C7 4.7835 7.7835 4 8.75 4H14.25C15.2165 4 16 4.7835 16 5.75V11.25C16 12.2165 15.2165 13 14.25 13H12.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <rect x="4" y="7" width="9" height="9" rx="1.75" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

const ActionButton = ({
  label,
  onClick,
  children,
  tone = "slate"
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "slate" | "emerald";
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-sm transition ${
      tone === "emerald"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
        : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
    }`}
  >
    {children}
  </button>
);

const copyText = async (value: string) => {
  await navigator.clipboard.writeText(value);
};

export const UrlTable = ({ items }: { items: UrlItem[] }) => {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm" key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-base font-semibold tracking-wide text-white">{item.shortCode}</p>
              <div className="flex items-center gap-2">
                <ActionButton
                  label={`Open destination for ${item.shortCode}`}
                  tone="emerald"
                  onClick={() => window.open(item.originalUrl, "_blank", "noopener,noreferrer")}
                >
                  <ArrowIcon />
                </ActionButton>
                <ActionButton
                  label={`Copy short link for ${item.shortCode}`}
                  onClick={() => void copyText(item.shortUrl ?? item.shortCode)}
                >
                  <CopyIcon />
                </ActionButton>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
              <span>{item.status}</span>
              <span>{item.clickCount} clicks</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800/80">
            <tr>
              <th className="px-3 py-2">Short Code</th>
              <th className="px-3 py-2">Actions</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-t" key={item.id}>
                <td className="px-3 py-2 font-mono text-white">{item.shortCode}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ActionButton
                      label={`Open destination for ${item.shortCode}`}
                      tone="emerald"
                      onClick={() => window.open(item.originalUrl, "_blank", "noopener,noreferrer")}
                    >
                      <ArrowIcon />
                    </ActionButton>
                    <ActionButton
                      label={`Copy short link for ${item.shortCode}`}
                      onClick={() => void copyText(item.shortUrl ?? item.shortCode)}
                    >
                      <CopyIcon />
                    </ActionButton>
                  </div>
                </td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{item.clickCount}</td>
                <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
