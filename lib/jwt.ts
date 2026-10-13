import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
    userId: number;
    username: string;
    role: string;
    mustChangePassword?: boolean;
    // Lifetime (minutes) this session was issued with. proxy.ts reuses it
    // when it renews the token, so the user's chosen auto-logout time sticks.
    sm?: number;
};

// Only ever used by `next dev`. Never a fallback anywhere else: it is
// committed to the repository, so anyone who can read the code could
// forge a session signed with it.
const DEV_FALLBACK_SECRET = "bcas-clinic-dev-only-secret-change-this-before-deploying";

// HS256 keys shorter than this are brute-forceable.
const MIN_SECRET_LENGTH = 32;

function getKey() {
    const secret = process.env.SESSION_SECRET?.trim();

    if (secret) {
        if (secret.length < MIN_SECRET_LENGTH) {
            throw new Error(
                `SESSION_SECRET is too short (${secret.length} characters). ` +
                `Use at least ${MIN_SECRET_LENGTH}.`,
            );
        }
        return new TextEncoder().encode(secret);
    }

    // No secret set. The development key is allowed ONLY while running
    // `next dev`. An unset or unexpected NODE_ENV refuses to start, because
    // that is exactly the case where a real deployment would silently fall
    // back to a key that is public.
    if (process.env.NODE_ENV !== "development") {
        throw new Error(
            "SESSION_SECRET is missing. Add it to your environment variables. " +
            "The development key is only available when running next dev.",
        );
    }

    console.warn("WARNING: SESSION_SECRET not found in .env, using a temporary development key.");
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

export async function signToken(payload: SessionPayload, minutes = 30) {
    return new SignJWT({ ...payload, sm: minutes })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${minutes}m`)
        .sign(getKey());
}

export async function verifyToken(token: string | undefined) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}