"use client";

import { useEffect, useRef } from "react";
import { logoutSession, refreshSession } from "@/features/session/session-actions";

// Ilang minutong WALANG GALAW bago mag-logout. Habang ginagamit ang system
// (galaw ng mouse, pag-type, pag-scroll, pag-tap), hindi ito magla-logout.
const IDLE_MINUTES = 15;
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

// `minutes` ay hindi na ginagamit (laging 15 minuto), pero iniwan para hindi
// masira ang <IdleLogout minutes={...} /> sa layout.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function IdleLogout({ minutes }: { minutes?: number }) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRefresh = useRef(0);
    const lastActivity = useRef(0);

    useEffect(() => {
        const idleMs = IDLE_MINUTES * 60 * 1000;
        lastActivity.current = Date.now();
        writeShared(lastActivity.current);

        const goToLogin = () => {
            window.location.href = "/login";
        };

        // Pinakabagong galaw sa KAHIT ANONG tab (hal. bukas ang dalawang tab)
        const latest = () => Math.max(lastActivity.current, readShared());

        const schedule = (ms: number) => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(check, ms);
        };

        // Bago mag-logout, siguraduhing talagang 15 minutong walang galaw
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
    }, []);

    return null;
}