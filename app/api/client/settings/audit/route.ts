import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";
import { getClientSession } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getClientSession();
        if (!session || !session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Enterprise Feature: Only Admin or specific roles might see ALL logs, 
        // but for this multi-tenant app, a user sees logs for THEIR account/actions.
        // Ideally, "Enterprise" has a "Team" concept, but for now we filter by userId.

        // In a real Enterprise app, an Admin would see logs for all users in their Organization.
        // Here, we just return the current user's logs for demonstration.

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const page = parseInt(searchParams.get("page") || "1");
        const skip = (page - 1) * limit;

        const logs = await AuditLog.find({ userId: session.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await AuditLog.countDocuments({ userId: session.userId });

        return NextResponse.json({
            logs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
