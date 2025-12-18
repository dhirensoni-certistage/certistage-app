import mongoose, { Schema, Document } from "mongoose"

export interface ITextField {
  id: string
  variable: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  color: string
  textAlign: string
}

export interface ICertificateType extends Document {
  name: string
  eventId: mongoose.Types.ObjectId
  templateImage?: string
  textFields: ITextField[]
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
  color: { type: String, default: "#000000" },
  textAlign: { type: String, default: "center" }
}, { _id: false })

const CertificateTypeSchema = new Schema<ICertificateType>(
  {
    name: { type: String, required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    templateImage: { type: String },
    textFields: [TextFieldSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

export default mongoose.models.CertificateType || mongoose.model<ICertificateType>("CertificateType", CertificateTypeSchema)
