// Organiser branding on public download pages.
//
// The organiser's name is always the hero. The small "Powered by CertiStage"
// line stays on Free and on the one-event plan (it is how recipients become
// organisers) and can be switched off on an annual plan from Settings. If the
// plan lapses the line comes back on its own, because the check happens at
// render time. Which plans may remove it is set per plan in Admin > Plans
// (limits.canRemoveBranding).
import User from "@/models/User"
import { getPlanById } from "@/lib/plan-config.server"

export interface IssuerBranding {
  organization: string | null
  logo: string | null
  /** With a logo, the name is shown only when the organiser asked for it */
  showName: boolean
  showPoweredBy: boolean
}

type PlanHolder = { plan?: string | null; planExpiresAt?: Date | string | null } | null | undefined

export function hasActivePaidPlan(user: PlanHolder): boolean {
  if (!user || !user.plan || user.plan === "free") return false
  if (user.planExpiresAt && new Date(user.planExpiresAt).getTime() < Date.now()) return false
  return true
}

export async function canHidePoweredBy(user: PlanHolder): Promise<boolean> {
  if (!hasActivePaidPlan(user)) return false
  const plan = await getPlanById(String(user?.plan))
  return !!plan?.limits?.canRemoveBranding
}

export async function getIssuerBranding(ownerId: unknown): Promise<IssuerBranding> {
  if (!ownerId) return { organization: null, logo: null, showName: true, showPoweredBy: true }
  const owner = await User.findById(ownerId)
    .select("organization logo showNameWithLogo plan planExpiresAt hidePoweredBy")
    .lean<{ organization?: string; logo?: string; showNameWithLogo?: boolean; plan?: string; planExpiresAt?: Date; hidePoweredBy?: boolean }>()
  const hidden = !!owner?.hidePoweredBy && (await canHidePoweredBy(owner))
  return {
    organization: owner?.organization?.trim() || null,
    logo: owner?.logo || null,
    showName: !owner?.logo || !!owner?.showNameWithLogo,
    showPoweredBy: !hidden
  }
}
