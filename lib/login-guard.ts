// lib/login-guard.ts
// Rate limiting that cannot be bypassed by rotating usernames,
// and that is not reset when login_logs is cleared.
//
// Two scopes:
//   user -> 5 failed attempts per username = 15 minute lock
//   ip   -> 10 failed attempts per IP address = 15 minute lock
//
// Use in every login action: admin, student, employee.

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const MAX_USER_ATTEMPTS = 5;
export const MAX_IP_ATTEMPTS = 10;
export const LOCK_MINUTES = 15;
export const WINDOW_MINUTES = 15;

type LockRow = {
    fails: number;
    locked_until: Date | null;
};

export async function getClientIp(): Promise<string> {
    try {
        const h = await headers();
        const forwarded = h.get("x-forwarded-for");
        if (forwarded) return forwarded.split(",")[0].trim();
        return h.get("x-real-ip") ?? "unknown";
    } catch {
        return "unknown";
    }
}

async function readLock(scope: string, key: string): Promise<LockRow | null> {
    const rows = await prisma.$queryRaw<LockRow[]>`
        SELECT fails, locked_until
        FROM login_lockouts
        WHERE scope = ${scope} AND lock_key = ${key}
        LIMIT 1
    `;
    return rows[0] ?? null;
}

export type GuardResult = {
    blocked: boolean;
    message?: string;
    attemptsLeft?: number;
};

/**
 * Call this BEFORE checking the password.
 * When blocked is true, stop the login.
 */
export async function checkLoginAllowed(
    username: string,
    ip: string,
): Promise<GuardResult> {
    const user = await readLock("user", username.toLowerCase());
    const addr = await readLock("ip", ip);
    const now = Date.now();

    for (const row of [user, addr]) {
        if (row?.locked_until && new Date(row.locked_until).getTime() > now) {
            const minutes = Math.max(
                1,
                Math.ceil((new Date(row.locked_until).getTime() - now) / 60000),
            );
            return {
                blocked: true,
                message: `Too many failed attempts. Please wait ${minutes} minute(s) before trying again.`,
            };
        }
    }

    const used = user?.locked_until ? 0 : (user?.fails ?? 0);
    return { blocked: false, attemptsLeft: Math.max(0, MAX_USER_ATTEMPTS - used) };
}

async function bump(scope: string, key: string, max: number): Promise<void> {
    await prisma.$executeRaw`
        INSERT INTO login_lockouts (scope, lock_key, fails, first_fail, updated_at)
        VALUES (${scope}, ${key}, 1, NOW(), NOW())
        ON CONFLICT (scope, lock_key) DO UPDATE SET
            fails = CASE
                WHEN login_lockouts.locked_until IS NOT NULL
                     AND login_lockouts.locked_until < NOW() THEN 1
                WHEN login_lockouts.first_fail < NOW() - (${WINDOW_MINUTES} || ' minutes')::interval THEN 1
                ELSE login_lockouts.fails + 1
            END,
            first_fail = CASE
                WHEN login_lockouts.first_fail < NOW() - (${WINDOW_MINUTES} || ' minutes')::interval THEN NOW()
                ELSE login_lockouts.first_fail
            END,
            locked_until = CASE
                WHEN login_lockouts.fails + 1 >= ${max}
                    THEN NOW() + (${LOCK_MINUTES} || ' minutes')::interval
                ELSE NULL
            END,
            updated_at = NOW()
    `;
}

/**
 * Call this when the password is WRONG.
 * Returns how many attempts are left.
 */
export async function recordLoginFailure(
    username: string,
    ip: string,
): Promise<number> {
    const key = username.toLowerCase();
    await bump("user", key, MAX_USER_ATTEMPTS);
    await bump("ip", ip, MAX_IP_ATTEMPTS);

    const row = await readLock("user", key);
    return Math.max(0, MAX_USER_ATTEMPTS - (row?.fails ?? 0));
}

/** Call this when the password is CORRECT. Clears the counter. */
export async function clearLoginFailures(
    username: string,
    ip: string,
): Promise<void> {
    await prisma.$executeRaw`
        DELETE FROM login_lockouts
        WHERE (scope = 'user' AND lock_key = ${username.toLowerCase()})
           OR (scope = 'ip'   AND lock_key = ${ip})
    `;
}