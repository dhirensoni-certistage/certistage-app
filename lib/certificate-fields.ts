/**
 * Fields printed on a certificate besides the recipient's name.
 *
 * Built-in variables: EMAIL, MOBILE, REG_NO.
 * Excel columns: "COL:<heading>", read from the recipient's customFields. Any column after
 * "Registration No" in the import sheet is stored under its heading, so an organiser can
 * print e.g. Credit Hours, Designation or College without a code change.
 *
 * Every renderer (PDF, download pages, editor) goes through fieldValue so they agree.
 */
export const COLUMN_PREFIX = "COL:"

export const BUILT_IN_FIELDS: Record<string, string> = {
  EMAIL: "Email",
  MOBILE: "Mobile",
  REG_NO: "Registration No",
}

export const columnVariable = (heading: string) => `${COLUMN_PREFIX}${heading}`

export function columnHeading(variable: string): string | null {
  return variable.startsWith(COLUMN_PREFIX) ? variable.slice(COLUMN_PREFIX.length) : null
}

/** Readable name for a field variable: "Email", "Credit Hours", ... */
export function fieldLabel(variable: string): string {
  return BUILT_IN_FIELDS[variable] ?? columnHeading(variable) ?? variable
}

/** Storage key for an Excel heading. MongoDB map keys cannot contain "." or start with "$". */
export function columnKey(heading: unknown): string {
  return String(heading ?? "").replace(/[.$]/g, "").replace(/\s+/g, " ").trim().slice(0, 50)
}

const MAX_COLUMNS = 30
const MAX_VALUE_LENGTH = 300

/** Clean customFields from an import: string values, safe keys, bounded size. */
export function cleanCustomFields(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {}
  const out: Record<string, string> = {}
  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_COLUMNS) break
    const key = columnKey(rawKey)
    const value = rawValue == null ? "" : String(rawValue).trim().slice(0, MAX_VALUE_LENGTH)
    if (key && value) out[key] = value
  }
  return out
}

export interface FieldSource {
  email?: string
  mobile?: string
  regNo?: string
  certificateId?: string
  customFields?: Record<string, unknown> | Map<string, unknown> | null
}

/** The text a field prints for one recipient ("" when the recipient has no value). */
export function fieldValue(variable: string, recipient: FieldSource | null | undefined): string {
  if (!recipient) return ""
  switch (variable) {
    case "EMAIL": return recipient.email || ""
    case "MOBILE": return recipient.mobile || ""
    case "REG_NO": return recipient.regNo || recipient.certificateId || ""
  }
  const heading = columnHeading(variable)
  if (heading === null) return ""
  const fields = recipient.customFields
  const value = fields instanceof Map ? fields.get(heading) : fields?.[heading]
  return value == null ? "" : String(value)
}
