import mongoose, { Schema } from "mongoose"

const schema = new Schema({
  token: { type: String, required: true, unique: true },
  answerHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})

export default mongoose.models.AdminCaptcha || mongoose.model("AdminCaptcha", schema)
