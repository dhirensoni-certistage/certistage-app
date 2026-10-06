import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { mergeAddonConfig, type AddonConfig } from "@/lib/addons"

export const ADDON_CONFIG_KEY = "addon_config"

/** Add-on pack quantities and prices: Admin > Plans > Add-on packs, over the defaults in lib/addons */
export async function getAddonConfigFromDb(): Promise<AddonConfig> {
  await connectDB()
  const setting = await Settings.findOne({ key: ADDON_CONFIG_KEY }).lean()
  return mergeAddonConfig(setting?.value)
}
