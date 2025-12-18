import mongoose, { Schema, Document } from "mongoose"

export interface IAdmin extends Document {
  name: string
  email: string
  password: string
  role: "super_admin" | "admin"
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ["super_admin", "admin"],
      default: "admin"
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date }
  },
  { timestamps: true }
)

export default mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema)
