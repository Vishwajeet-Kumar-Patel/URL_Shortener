import { redirect } from "next/navigation";

export default async function MonetizedBlogPage({
  searchParams
}: {
  searchParams?: Promise<{ rs?: string; token?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sessionToken = String(resolvedSearchParams?.rs ?? resolvedSearchParams?.token ?? "");
  redirect(sessionToken ? `/monetize/blog/1?rs=${encodeURIComponent(sessionToken)}` : "/");
}
