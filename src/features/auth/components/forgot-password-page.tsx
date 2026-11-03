"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowLeft, Mail, Send } from "lucide-react";
import { requestOtp, type ForgotState } from "@/features/auth/forgot-password-actions";
import AuthShell, { authButtonClass, authErrorClass, authInputClass, authLabelClass, authLinkClass } from "./auth-shell";

const initialState: ForgotState = {};

export default function ForgotPasswordPage() {
    const [state, formAction, pending] = useActionState(requestOtp, initialState);

    return (
        <AuthShell eyebrow="Account help" title="Forgot Password" subtitle="Enter your email and we'll send you a 6-digit code.">
            <form action={formAction} className="space-y-5">
                {state.error && (
                    <div role="alert" className={authErrorClass}>
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{state.error}</span>
                    </div>
                )}

                <label htmlFor="email" className="block space-y-2">
                    <span className={authLabelClass}>Email Address</span>
                    {/* Mail icon sa loob ng input, kapareho ng Login */}
                    <span className="relative block">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#15664f]" />
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="yourname@bcas.edu.ph"
                            autoComplete="email"
                            required
                            suppressHydrationWarning
                            className={`${authInputClass} pl-12!`}
                        />
                    </span>
                </label>

                <button type="submit" disabled={pending} suppressHydrationWarning className={`${authButtonClass} mt-3`}>
                    {pending ? (
                        "Sending..."
                    ) : (
                        <>
                            Send Code
                            <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                    )}
                </button>

                <Link
                    href="/login"
                    className={`flex items-center justify-center gap-1.5 pt-2 text-sm ${authLinkClass}`}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                </Link>
            </form>
        </AuthShell>
    );
}