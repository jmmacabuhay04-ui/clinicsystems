"use client";

import { useEffect, useState } from "react";

type Props = {
    children: React.ReactNode;
    /** Ilang millisecond bago mawala. Default: 3000 (3 segundo). */
    duration?: number;
    /** Query param na tatanggalin sa URL para hindi na lumabas ulit pag nag-refresh. */
    clearParam?: string;
    className?: string;
};

export default function FlashMessage({
    children,
    duration = 3000,
    clearParam,
    className = "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800",
}: Props) {
    const [fading, setFading] = useState(false);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const fadeTimer = setTimeout(() => setFading(true), Math.max(0, duration - 300));
        const hideTimer = setTimeout(() => {
            setVisible(false);
            if (clearParam) {
                const url = new URL(window.location.href);
                url.searchParams.delete(clearParam);
                window.history.replaceState(window.history.state, "", url.toString());
            }
        }, duration);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(hideTimer);
        };
    }, [duration, clearParam]);

    if (!visible) return null;

    return (
        <p
            role="status"
            className={`${className} transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}
        >
            {children}
        </p>
    );
}