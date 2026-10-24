"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowLeft, Send } from "lucide-react";
import { requestOtp, type ForgotState } from "@/features/auth/forgot-password-actions";
import AuthShell, { authButtonClass, authInputClass } from "./auth-shell";

const initialState: ForgotState = {};

export default function ForgotPasswordPage() {
    const [state, formAction, pending] = useActionState(requestOtp, initialState);

    return (
        <AuthShell title="Forgot Password" subtitle="Enter your email and we'll send you a 6-digit code.">
            <form action={formAction} className="space-y-5">
                {state.error && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-2xl border border-red-400/40 bg-red-500/15 p-3 text-sm text-red-100"
                    >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{state.error}</span>
                    </div>
                )}

                <label htmlFor="email" className="block space-y-2">
                    <span className="text-sm font-medium text-white">Email Address*</span>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="yourname@bcas.edu.ph"
                        autoComplete="email"
                        required
                        suppressHydrationWarning
                        className={authInputClass}
                    />
                </label>

                <button type="submit" disabled={pending} suppressHydrationWarning className={`${authButtonClass} mt-3`}>
                    {pending ? (
                        <>
                            Sending...
                        </>
                    ) : (
                        <>
                            Send Code
                            <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                    )}
                </button>

                <Link
                    href="/login"
                    className="flex items-center justify-center gap-1.5 pt-2 text-sm font-medium text-white/70 hover:text-amber-300"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                </Link>
            </form>
        </AuthShell>
    );
}