import { STANDARD_COLUMNS } from "@/lib/event-categories"

/**
 * Checks an uploaded recipient Excel against the certificate before importing, so a field on
 * the design does not silently print blank:
 * - a column on the certificate that the Excel does not have
 * - a column on the certificate that is empty for some rows
 * - a near-miss heading ("hospital name" for "Hospital Name"), which is matched automatically
 * - the first six columns in a different order (import reads them by position)
 */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

// Other names people give the six standard columns, by position
const STANDARD_ALIASES: string[][] = [
  ["prefix", "title", "salutation"],
  ["firstname", "fname", "name", "fullname", "givenname"],
  ["lastname", "lname", "surname", "familyname"],
  ["email", "emailid", "emailaddress", "mail"],
  ["mobile", "mobileno", "mobilenumber", "phone", "phoneno", "phonenumber", "contact", "contactno", "whatsapp"],
  ["registrationno", "regno", "registrationnumber", "regnumber", "registrationid"],
]

const standardIndexOf = (heading: string) => {
  const n = norm(heading)
  return STANDARD_ALIASES.findIndex((aliases) => aliases.includes(n))
}

const columnLetter = (i: number) => String.fromCharCode(65 + i)

export interface ImportIssue {
  title: string
  detail?: string
}

export interface ImportCheck {
  issues: ImportIssue[]
  /** Excel heading -> certificate column it was matched to */
  renames: Record<string, string>
}

export function checkImport(
  headers: string[],
  rows: { customFields: Record<string, string> }[],
  designColumns: string[]
): ImportCheck {
  const issues: ImportIssue[] = []
  const renames: Record<string, string> = {}

  // First six columns are read by position
  const misplaced: string[] = []
  for (let i = 0; i < STANDARD_COLUMNS.length; i++) {
    const h = headers[i]
    if (!h) continue
    const at = standardIndexOf(h)
    if (at !== -1 && at !== i) misplaced.push(`Column ${columnLetter(i)} is "${h}", but it should be ${STANDARD_COLUMNS[i]}`)
  }
  if (misplaced.length > 0) {
    issues.push({
      title: "The first six columns are in a different order",
      detail: `${misplaced.join(". ")}. Keep them as: ${STANDARD_COLUMNS.join(", ")}.`,
    })
  }

  const extra = headers.slice(STANDARD_COLUMNS.length).filter(Boolean)
  for (const column of designColumns) {
    let key = extra.includes(column) ? column : null
    if (!key) {
      const close = extra.find((h) => norm(h) === norm(column) && !designColumns.includes(h))
      if (close) {
        renames[close] = column
        key = close
      }
    }
    if (!key) {
      issues.push({
        title: `"${column}" is missing`,
        detail: `It is on the certificate, but this Excel has no "${column}" column, so it will print blank.`,
      })
      continue
    }
    const blank = rows.filter((r) => !r.customFields[key]).length
    if (blank > 0) {
      issues.push({
        title: `"${column}" is empty for ${blank} of ${rows.length} recipient${rows.length === 1 ? "" : "s"}`,
        detail: "Their certificates will show nothing in that place.",
      })
    }
  }

  return { issues, renames }
}

/** Move values from near-miss headings to the certificate's column name */
export function applyRenames<T extends { customFields: Record<string, string> }>(rows: T[], renames: Record<string, string>): T[] {
  if (Object.keys(renames).length === 0) return rows
  return rows.map((r) => {
    const customFields: Record<string, string> = {}
    for (const [k, v] of Object.entries(r.customFields)) customFields[renames[k] ?? k] = v
    return { ...r, customFields }
  })
}
