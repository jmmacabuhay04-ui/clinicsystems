"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

// Mensahe na ipinapakita nang ilang segundo, tapos kusang babalik sa ibang page
// (hal. "No active student found..." -> babalik sa listahan pagkalipas ng 3 segundo).
export default function RedirectNotice({
    message,
    href,
    seconds = 3,
}: {
    message: string;
    href: string;
    seconds?: number;
}) {
    const router = useRouter();
    const [left, setLeft] = useState(seconds);

    useEffect(() => {
        const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
        const go = setTimeout(() => router.replace(href), seconds * 1000);
        return () => {
            clearInterval(tick);
            clearTimeout(go);
        };
    }, [href, router, seconds]);

    return (
        <div role="status" className="overflow-hidden rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            <div className="flex items-start gap-2 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                    {message} <span className="text-red-600">Going back to the list in {left}s...</span>
                </p>
            </div>
            {/* Guhit na lumiliit habang nagbibilang */}
            <div
                className="h-1 bg-red-300"
                style={{ animation: `redirect-bar ${seconds}s linear forwards` }}
            />
            <style>{`@keyframes redirect-bar { from { width: 100%; } to { width: 0%; } }`}</style>
        </div>
    );
}