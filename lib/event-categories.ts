/**
 * What kind of event this is. Asked once when the event is created (optional) and used only to
 * suggest extra Excel columns: the sample Excel and the "Add recipient" form start with them.
 * Organisers can still add or remove any column; the Excel they import decides the fields.
 */
export interface EventCategory {
  id: string
  label: string
  /** Extra columns after the six standard ones (see lib/certificate-fields) */
  columns: string[]
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { id: "medical", label: "Medical conference / CME", columns: ["Credit Hours", "Council Reg No", "Accreditation No"] },
  { id: "college", label: "College / FDP / NSS", columns: ["Department", "Roll No"] },
  { id: "school", label: "School", columns: ["Class", "Section"] },
  { id: "webinar", label: "Workshop / Webinar", columns: [] },
  { id: "corporate", label: "Corporate training", columns: ["Employee ID", "Department"] },
  { id: "other", label: "Other", columns: [] },
]

/** The six columns every import starts with, in this order */
export const STANDARD_COLUMNS = ["Prefix", "First Name", "Last Name", "Email", "Mobile", "Registration No"]

export const isEventCategory = (value: unknown): value is string =>
  typeof value === "string" && EVENT_CATEGORIES.some((c) => c.id === value)

export const categoryColumns = (id?: string | null): string[] =>
  EVENT_CATEGORIES.find((c) => c.id === id)?.columns ?? []
