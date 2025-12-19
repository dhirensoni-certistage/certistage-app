import mongoose, { Schema, Document } from "mongoose"

export interface ISettings extends Document {
  key: string
  value: any
  updatedAt: Date
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
)

export default mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema)
