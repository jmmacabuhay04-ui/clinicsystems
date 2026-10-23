"use client";

import { useEffect, useRef } from "react";
import { logoutSession, refreshSession } from "@/features/session/session-actions";

// Ilang minutong walang galaw bago mag-logout.
const IDLE_MINUTES = 15;
// Pahabain ang session nang hindi hihigit sa isang beses kada minuto.
const REFRESH_EVERY_MS = 60 * 1000;

// `minutes` ay hindi na ginagamit (laging 15 minuto), pero iniwan para hindi
// masira ang <IdleLogout minutes={...} /> sa layout.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function IdleLogout({ minutes }: { minutes?: number }) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRefresh = useRef(0);

    useEffect(() => {
        const idleMs = IDLE_MINUTES * 60 * 1000;

        const goToLogin = () => {
            window.location.href = "/login";
        };

        // 15 minutong walang galaw: logout
        const logout = async () => {
            try {
                await logoutSession();
            } finally {
                goToLogin();
            }
        };

        const startTimer = () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(logout, idleMs);
        };

        // Habang ginagamit: i-reset ang timer at pahabain ang session
        const onActivity = () => {
            startTimer();

            const now = Date.now();
            if (now - lastRefresh.current >= REFRESH_EVERY_MS) {
                lastRefresh.current = now;
                refreshSession()
                    .then((ok) => {
                        if (!ok) goToLogin();
                    })
                    .catch(() => { });
            }
        };

        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
        events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

        startTimer();

        return () => {
            if (timer.current) clearTimeout(timer.current);
            events.forEach((e) => window.removeEventListener(e, onActivity));
        };
    }, []);

    return null;
}