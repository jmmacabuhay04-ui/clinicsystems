"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Mensahe na ipinapakita nang ilang segundo, tapos kusang babalik sa ibang page
// (hal. "No active student found..." -> babalik sa listahan pagkalipas ng 3 segundo).
export default function RedirectNotice({
    message,
    href,
    seconds = 3,
    tone = "error",
    backLabel = "the list",
}: {
    message: string;
    href: string;
    seconds?: number;
    /** "success" = green (hal. Student), "employee" = dilaw (Employee), "error" = pula */
    tone?: "error" | "success" | "employee";
    /** Kung saan babalik, para sa "Going back to ... in 3s" */
    backLabel?: string;
}) {
    const ok = tone === "success" || tone === "employee";
    const amber = tone === "employee";
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
        <div
            role="status"
            className={`overflow-hidden rounded-xl border text-sm ${amber
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : ok
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
        >
            <div className="flex items-start gap-2 p-4">
                {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <p>
                    {message}{" "}
                    <span className={amber ? "text-amber-800" : ok ? "text-green-700" : "text-red-600"}>
                        Going back to {backLabel} in {left}s...
                    </span>
                </p>
            </div>
            {/* Guhit na lumiliit habang nagbibilang */}
            <div
                className={`h-1 ${amber ? "bg-amber-300" : ok ? "bg-green-300" : "bg-red-300"}`}
                style={{ animation: `redirect-bar ${seconds}s linear forwards` }}
            />
            <style>{`@keyframes redirect-bar { from { width: 100%; } to { width: 0%; } }`}</style>
        </div>
    );
}