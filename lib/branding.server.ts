// Organiser branding on public download pages.
//
// The organiser's name is always the hero. The small "Powered by CertiStage"
// line stays on Free (it is how recipients become organisers) and can be
// switched off on any active paid plan from Settings. If the plan lapses the
// line comes back on its own, because the check happens at render time.
import User from "@/models/User"

export interface IssuerBranding {
  organization: string | null
  showPoweredBy: boolean
}

export function hasActivePaidPlan(user: { plan?: string | null; planExpiresAt?: Date | string | null } | null | undefined): boolean {
  if (!user || !user.plan || user.plan === "free") return false
  if (user.planExpiresAt && new Date(user.planExpiresAt).getTime() < Date.now()) return false
  return true
}

export function canHidePoweredBy(user: { plan?: string | null; planExpiresAt?: Date | string | null; hidePoweredBy?: boolean } | null | undefined): boolean {
  return hasActivePaidPlan(user)
}

export async function getIssuerBranding(ownerId: unknown): Promise<IssuerBranding> {
  if (!ownerId) return { organization: null, showPoweredBy: true }
  const owner = await User.findById(ownerId)
    .select("organization plan planExpiresAt hidePoweredBy")
    .lean<{ organization?: string; plan?: string; planExpiresAt?: Date; hidePoweredBy?: boolean }>()
  return {
    organization: owner?.organization?.trim() || null,
    showPoweredBy: !(owner?.hidePoweredBy && canHidePoweredBy(owner))
  }
}
