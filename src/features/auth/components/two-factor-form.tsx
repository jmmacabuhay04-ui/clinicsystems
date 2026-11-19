"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import OtpInput from "@/components/shared/otp-input";
import {
    cancelTwoFactor,
    resendTwoFactor,
    verifyTwoFactor,
    type TwoFactorState,
} from "@/features/auth/two-factor-actions";
// Kapareho ng itsura ng Log In page
const labelClass = "block text-sm font-semibold text-gray-800";
const buttonClass =
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#15664f] px-4 text-sm font-semibold text-white shadow-lg shadow-[#15664f]/25 transition hover:bg-[#10523f] disabled:opacity-60";

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
            {/* Lumulutang ang mensahe para hindi gumalaw ang form */}
            {message && (
                <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
                    <div
                        role="alert"
                        className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-2xl border p-3 text-sm shadow-lg ${message.tone === "error"
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
                </div>
            )}

            <form
                data-req-float
                // onSubmit (hindi action=) para HINDI mabura ang na-type kapag may error
                onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    startTransition(() => formAction(data));
                }}
                className="space-y-5"
            >
                <div className="space-y-2">
                    <label htmlFor="code" className={labelClass}>
                        6-Digit Code
                    </label>
                    {/* Hiwa-hiwalay na kahon bawat numero */}
                    <OtpInput id="code" name="code" autoFocus />
                    <p className="pt-1 text-center text-sm text-gray-600">
                        Didn&apos;t get the code?{" "}
                        <button
                            type="button"
                            disabled={resending}
                            onClick={() => startResend(async () => setResend(await resendTwoFactor()))}
                            className="font-semibold text-[#15664f] underline underline-offset-2 hover:text-[#10523f] disabled:opacity-60"
                        >
                            {resending ? "Sending..." : "Click to resend"}
                        </button>
                    </p>
                </div>

                <button type="submit" disabled={pending} suppressHydrationWarning className={buttonClass}>
                    <ShieldCheck className="h-4 w-4" />
                    {pending ? "Checking..." : "Verify and Sign In"}
                </button>
            </form>

            <div className="flex justify-center text-sm">
                <form action={cancelTwoFactor}>
                    <button
                        type="submit"
                        className="inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-[#15664f] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}