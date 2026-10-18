"use client";

import { useEffect, useRef } from "react";

const REFRESH_EVERY_MS = 60 * 1000; // hindi tatawag sa server nang mas madalas kaysa isang beses kada minuto

export default function IdleLogout({ minutes }: { minutes: number }) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRefresh = useRef(Date.now());

    useEffect(() => {
        const goToLogin = () => {
            window.location.href = "/login";
        };

        const logout = async () => {
            try {
                await fetch("/api/session/logout", { method: "POST" });
            } finally {
                goToLogin();
            }
        };

        const onActivity = () => {
            // I-reset ang inactivity timer
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(logout, minutes * 60 * 1000);

            // Pahabain ang session cookie (naka-throttle)
            const now = Date.now();
            if (now - lastRefresh.current >= REFRESH_EVERY_MS) {
                lastRefresh.current = now;
                fetch("/api/session/refresh", { method: "POST" })
                    .then((res) => {
                        if (res.status === 401) goToLogin();
                    })
                    .catch(() => { });
            }
        };

        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
        events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

        // Simulan ang bilang pagka-load ng page
        timer.current = setTimeout(logout, minutes * 60 * 1000);

        return () => {
            if (timer.current) clearTimeout(timer.current);
            events.forEach((e) => window.removeEventListener(e, onActivity));
        };
    }, [minutes]);

    return null;
}