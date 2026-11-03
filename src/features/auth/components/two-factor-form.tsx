"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import {
    cancelTwoFactor,
    resendTwoFactor,
    verifyTwoFactor,
    type TwoFactorState,
} from "@/features/auth/two-factor-actions";
// Kapareho ng itsura ng Log In page
const labelClass = "block text-sm font-semibold text-gray-800";
const inputClass =
    "h-12 w-full rounded-full border border-transparent bg-[#eef6f2] px-5 text-center text-2xl font-semibold tracking-[0.5em] text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-[#cfe5d9] focus:border-[#15664f] focus:bg-white focus:ring-4 focus:ring-[#15664f]/10";
const buttonClass =
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#15664f] px-4 text-sm font-semibold text-white shadow-lg shadow-[#15664f]/25 transition hover:bg-[#10523f] active:scale-[0.99] disabled:opacity-60";

const initialState: TwoFactorState = {};

export default function TwoFactorForm() {
    const [state, formAction, pending] = useActionState(verifyTwoFactor, initialState);
    const [resend, setResend] = useState<TwoFactorState>({});
    const [resending, startResend] = useTransition();

    const message = state.error ? { tone: "error", text: state.error } : resend.error
        ? { tone: "error", text: resend.error }
        : resend.success
            ? { tone: "ok", text: resend.success }
            : null;

    return (
        <div className="space-y-5">
            {message && (
                <div
                    role="alert"
                    className={`flex items-start gap-2 rounded-2xl border p-3 text-sm ${message.tone === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-green-200 bg-green-50 text-green-700"
                        }`}
                >
                    {message.tone === "error" ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            <form action={formAction} className="space-y-5">
                <div className="space-y-2">
                    <label htmlFor="code" className={labelClass}>
                        6-Digit Code
                    </label>
                    <input
                        id="code"
                        name="code"
                        inputMode="numeric"
                        pattern="\d{6}"
                        maxLength={6}
                        placeholder="000000"
                        autoComplete="one-time-code"
                        autoFocus
                        required
                        suppressHydrationWarning
                        className={inputClass}
                    />
                </div>

                <button type="submit" disabled={pending} suppressHydrationWarning className={buttonClass}>
                    <ShieldCheck className="h-4 w-4" />
                    {pending ? "Checking..." : "Verify and Sign In"}
                </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <form action={cancelTwoFactor}>
                    <button
                        type="submit"
                        className="inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-[#15664f] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign In
                    </button>
                </form>
                <button
                    type="button"
                    disabled={resending}
                    onClick={() => startResend(async () => setResend(await resendTwoFactor()))}
                    className="font-semibold text-[#15664f] hover:underline disabled:opacity-60"
                >
                    {resending ? "Sending..." : "Send a new code"}
                </button>
            </div>
        </div>
    );
}