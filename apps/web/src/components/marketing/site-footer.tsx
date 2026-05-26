import Link from "next/link";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
        <p>© {new Date().getFullYear()} PurpleMerit Links. All rights reserved.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/status">Status</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
};
