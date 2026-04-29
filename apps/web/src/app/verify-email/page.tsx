import { redirect } from "next/navigation";

export default function VerifyEmailAliasPage() {
  redirect("/auth/verify-email");
}
