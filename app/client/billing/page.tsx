import { redirect } from "next/navigation"

// Billing lives in Settings > Billing. This path stays because receipts and older links point here.
export default function BillingPage() {
  redirect("/client/settings?tab=billing")
}
