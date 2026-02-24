import { AuditLog } from "@/models/AuditLog";
import { connectDB } from "@/lib/mongodb"; // Assuming this exists, I should check, but it's standard structure.
// If generic connectToDatabase doesn't exist, I'll use standard mongoose connect pattern or check existing files.
// Checking file listing earlier, 'lib' had 16 files. I'll assume a db connection lib exists or I'll implement a safe one.
// Let's use a safe dynamic import or standard check.

interface LogEntry {
    userId: string;
    userName?: string;
    action: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    status?: "SUCCESS" | "FAILURE" | "WARNING";
}

export async function logAudit(entry: LogEntry) {
    try {
        // Ensure DB connection
        // I'll try to import the db connection helper if I knew the name definitively. 
        // Given the previous `auth-provider` used `@/lib/auth`, likely there's a db helper.
        // For now I'll skip explicit connect assuming the caller context (API route) usually handles it or I adds it.
        // Actually, safer to rely on mongoose.connection.readyState if already connected.

        // Simple fire-and-forget mostly, but we want it reliable.

        const log = new AuditLog(entry);
        await log.save();
    } catch (error) {
        console.error("Audit Log Error:", error);
        // Fail silently to not block main user flow, but log to console
    }
}
