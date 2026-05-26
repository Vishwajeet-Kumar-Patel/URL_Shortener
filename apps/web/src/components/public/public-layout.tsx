import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog/digital-growth-2026", label: "Blog" },
  { href: "/contact", label: "Contact" }
];

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link className="text-lg font-bold tracking-tight text-slate-900" href="/">
          PurpleMerit Links
        </Link>
        <div className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
          {navItems.map((item) => (
            <Link className="hover:text-blue-600" key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <Link className="text-xs text-slate-600" href="/blog/digital-growth-2026">
            Blog
          </Link>
          <Link className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs text-white" href="/register">
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
        <p>© {new Date().getFullYear()} PurpleMerit Links. All rights reserved.</p>
        <div className="flex flex-wrap gap-4">
          <Link className="hover:text-blue-600" href="/terms">Terms</Link>
          <Link className="hover:text-blue-600" href="/privacy">Privacy</Link>
          <Link className="hover:text-blue-600" href="/status">Status</Link>
          <Link className="hover:text-blue-600" href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <PublicNavbar />
      {children}
      <PublicFooter />
    </div>
  );
}
