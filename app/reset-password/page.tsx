import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Passwords were retired: signing in uses an emailed one-time code.
export default function Page() {
  redirect("/client/login")
}
