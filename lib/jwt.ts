import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
    userId: number;
    username: string;
    role: string;
    mustChangePassword?: boolean;     // ← idagdag ito
};

const DEV_FALLBACK_SECRET = "bcas-clinic-dev-only-secret-change-this-before-deploying";

function getKey() {
    let secret = process.env.SESSION_SECRET?.trim();

    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("SESSION_SECRET is missing. Add it to your environment variables.");
        }
        console.warn("WARNING: SESSION_SECRET not found in .env, using a temporary development key.");
        secret = DEV_FALLBACK_SECRET;
    }

    return new TextEncoder().encode(secret);
}

export async function signToken(payload: SessionPayload, minutes = 480) {
    return new SignJWT(payload)
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