import mongoose, { Schema } from "mongoose";

const AuditLogSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        userName: {
            type: String,
            default: "Unknown",
        },
        action: {
            type: String,
            required: true, // e.g., "LOGIN", "GENERATE_CERTIFICATE", "UPDATE_EVENT"
            index: true,
        },
        resourceId: {
            type: String, // e.g., Event ID or Certificate ID
        },
        details: {
            type: Object, // Flexible JSON details about the action
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        status: {
            type: String,
            enum: ["SUCCESS", "FAILURE", "WARNING"],
            default: "SUCCESS",
        },
    },
    {
        timestamps: true,
    }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
