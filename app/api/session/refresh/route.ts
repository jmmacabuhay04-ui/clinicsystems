import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/session";

// Tinatawag kapag may galaw ang user: pinapahaba ulit ang session cookie.
export async function POST() {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { user_id: session.userId } });

    await createSession(
        { userId: session.userId, username: session.username, role: session.role },
        user?.session_minutes ?? 60
    );

    return NextResponse.json({ ok: true });
}