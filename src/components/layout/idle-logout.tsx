"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { logoutSession, refreshSession } from "@/features/session/session-actions";

// Ilang minutong WALANG GALAW bago mag-logout (5, 10 o 15, mula sa Settings).
// Habang ginagamit ang system (galaw ng mouse, pag-type, pag-scroll, pag-tap), hindi ito magla-logout.
const ALLOWED = [5, 10, 15];
const DEFAULT_MINUTES = 15;
// Pahabain ang session sa server nang hindi hihigit sa isang beses kada minuto.
const REFRESH_EVERY_MS = 60 * 1000;
// Huling galaw, ibinabahagi sa lahat ng nakabukas na tab ng system
const STORAGE_KEY = "bcas-last-activity";

function readShared(): number {
    try {
        return Number(window.localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
        return 0;
    }
}

function writeShared(value: number) {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
        // Private mode / naka-block ang storage: gagana pa rin sa tab na ito
    }
}

export default function IdleLogout({ minutes }: { minutes?: number | null }) {
    const router = useRouter();
    // Lumang setting (hal. 30 o 60): gawing 15
    const idleMinutes = ALLOWED.includes(Number(minutes)) ? Number(minutes) : DEFAULT_MINUTES;
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRefresh = useRef(0);
    const lastActivity = useRef(0);

    useEffect(() => {
        const idleMs = idleMinutes * 60 * 1000;
        lastActivity.current = Date.now();
        writeShared(lastActivity.current);

        // Lipat sa Log In gamit ang Next router (hindi window.location.href)
        const goToLogin = () => {
            router.replace("/login");
            router.refresh();
        };

        // Pinakabagong galaw sa KAHIT ANONG tab (hal. bukas ang dalawang tab)
        const latest = () => Math.max(lastActivity.current, readShared());

        const schedule = (ms: number) => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(check, ms);
        };

        // Bago mag-logout, siguraduhing talagang lumipas ang itinakdang minuto nang walang galaw
        // (baka may galaw sa ibang tab, o naantala lang ang timer)
        async function check() {
            const idleFor = Date.now() - latest();
            if (idleFor < idleMs) {
                schedule(idleMs - idleFor);
                return;
            }
            try {
                await logoutSession();
            } finally {
                goToLogin();
            }
        }

        // Habang ginagamit: i-reset ang oras at pahabain ang session
        const onActivity = () => {
            const now = Date.now();
            lastActivity.current = now;
            writeShared(now);
            schedule(idleMs);

            if (now - lastRefresh.current >= REFRESH_EVERY_MS) {
                lastRefresh.current = now;
                refreshSession()
                    .then((ok) => {
                        if (!ok) goToLogin();
                    })
                    .catch(() => { });
            }
        };

        // Galaw sa ibang tab: i-reset din ang oras dito
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) schedule(idleMs);
        };

        // capture: true para mabilang din ang pag-scroll sa loob ng content
        // (hindi umaabot sa window ang scroll ng isang div)
        const events = [
            "pointermove",
            "pointerdown",
            "mousemove",
            "mousedown",
            "keydown",
            "input",
            "wheel",
            "scroll",
            "touchstart",
            "click",
            "focusin",
        ];
        events.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));
        window.addEventListener("storage", onStorage);

        schedule(idleMs);

        return () => {
            if (timer.current) clearTimeout(timer.current);
            events.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
            window.removeEventListener("storage", onStorage);
        };
    }, [idleMinutes, router]);

    return null;
}