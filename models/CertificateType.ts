import mongoose, { Schema, Document } from "mongoose"

export interface ITextField {
  id: string
  variable: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontBold: boolean
  fontItalic: boolean
  color: string
  textAlign: string
}

export interface ISignatureField {
  id: string
  image: string
  x: number
  y: number
  width: number
}

export interface ICustomField {
  id: string
  variable: string
  position: { x: number; y: number }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
}

export interface ICertificateType extends Document {
  name: string
  eventId: mongoose.Types.ObjectId
  templateImage?: string
  textFields: ITextField[]
  // Additional styling fields
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
  textPosition: { x: number; y: number }
  showNameField: boolean
  customFields: ICustomField[]
  signatures: ISignatureField[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const TextFieldSchema = new Schema<ITextField>({
  id: { type: String, required: true },
  variable: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  fontSize: { type: Number, default: 24 },
  fontFamily: { type: String, default: "Arial" },
  fontWeight: { type: String, default: "normal" },
  fontBold: { type: Boolean, default: false },
  fontItalic: { type: Boolean, default: false },
  color: { type: String, default: "#000000" },
  textAlign: { type: String, default: "center" }
}, { _id: false })

const SignatureFieldSchema = new Schema<ISignatureField>({
  id: { type: String, required: true },
  image: { type: String, required: true },
  x: { type: Number, default: 80 },
  y: { type: Number, default: 80 },
  width: { type: Number, default: 15 }
}, { _id: false })

const CustomFieldSchema = new Schema<ICustomField>({
  id: { type: String, required: true },
  variable: { type: String, required: true },
  position: {
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 }
  },
  fontSize: { type: Number, default: 24 },
  fontFamily: { type: String, default: "Arial" },
  fontBold: { type: Boolean, default: false },
  fontItalic: { type: Boolean, default: false }
}, { _id: false })

const CertificateTypeSchema = new Schema<ICertificateType>(
  {
    name: { type: String, required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    templateImage: { type: String },
    textFields: [TextFieldSchema],
    // Additional styling fields
    fontSize: { type: Number, default: 24 },
    fontFamily: { type: String, default: "Arial" },
    fontBold: { type: Boolean, default: false },
    fontItalic: { type: Boolean, default: false },
    textPosition: {
      x: { type: Number, default: 50 },
      y: { type: Number, default: 60 }
    },
    showNameField: { type: Boolean, default: true },
    customFields: [CustomFieldSchema],
    signatures: [SignatureFieldSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

export default mongoose.models.CertificateType || mongoose.model<ICertificateType>("CertificateType", CertificateTypeSchema)
