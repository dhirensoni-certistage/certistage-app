export interface Recipient {
  id: string
  name: string
  email: string
  mobile: string
  certificateId: string
  status: "generated" | "pending" | "downloaded"
  createdAt: string
}

export interface CertificateSettings {
  title: string
  eventName: string
  dateFormat: string
  enableName: boolean
  enableEmail: boolean
  enableMobile: boolean
  enableDate: boolean
}

export interface FontSettings {
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontColor: string
  letterSpacing: number
  textAlign: "left" | "center" | "right"
}

export interface TextPosition {
  x: number
  y: number
  width: number
  height: number
}

export const dummyRecipients: Recipient[] = [
  {
    id: "1",
    name: "John Anderson",
    email: "john.anderson@email.com",
    mobile: "+1 234 567 8901",
    certificateId: "CERT-2024-001",
    status: "generated",
    createdAt: "2024-12-10",
  },
  {
    id: "2",
    name: "Sarah Mitchell",
    email: "sarah.mitchell@email.com",
    mobile: "+1 234 567 8902",
    certificateId: "CERT-2024-002",
    status: "downloaded",
    createdAt: "2024-12-10",
  },
  {
    id: "3",
    name: "Michael Chen",
    email: "michael.chen@email.com",
    mobile: "+1 234 567 8903",
    certificateId: "CERT-2024-003",
    status: "pending",
    createdAt: "2024-12-11",
  },
  {
    id: "4",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@email.com",
    mobile: "+1 234 567 8904",
    certificateId: "CERT-2024-004",
    status: "generated",
    createdAt: "2024-12-11",
  },
  {
    id: "5",
    name: "David Thompson",
    email: "david.thompson@email.com",
    mobile: "+1 234 567 8905",
    certificateId: "CERT-2024-005",
    status: "downloaded",
    createdAt: "2024-12-12",
  },
  {
    id: "6",
    name: "Jessica Williams",
    email: "jessica.williams@email.com",
    mobile: "+1 234 567 8906",
    certificateId: "CERT-2024-006",
    status: "generated",
    createdAt: "2024-12-12",
  },
  {
    id: "7",
    name: "Robert Garcia",
    email: "robert.garcia@email.com",
    mobile: "+1 234 567 8907",
    certificateId: "CERT-2024-007",
    status: "pending",
    createdAt: "2024-12-13",
  },
  {
    id: "8",
    name: "Amanda Lee",
    email: "amanda.lee@email.com",
    mobile: "+1 234 567 8908",
    certificateId: "CERT-2024-008",
    status: "downloaded",
    createdAt: "2024-12-13",
  },
]

export const googleFonts = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Raleway",
  "Nunito",
  "Source Sans Pro",
  "PT Serif",
  "Oswald",
  "Dancing Script",
  "Pacifico",
  "Great Vibes",
  "Cormorant Garamond",
  "Libre Baskerville",
]
