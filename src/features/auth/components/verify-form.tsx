"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { verifyAndReset, type VerifyState } from "@/features/auth/verify-otp-actions";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import PasswordInput from "@/components/shared/password-input";
import { authToastWrap, authButtonClass, authErrorClass, authInputClass, authLabelClass, authLinkClass, authSuccessClass } from "./auth-shell";

const initialState: VerifyState = {};

const inputClass = authInputClass;
// Mata (show password) na kulay ng system
const eyeWrap = "block [&_button]:right-4 [&_button]:text-gray-600 [&_button:hover]:text-[#15664f]";

export default function VerifyForm({ email }: { email: string }) {
    const [state, formAction, pending] = useActionState(verifyAndReset, initialState);

    if (state.success) {
        return (
            <div className="space-y-5">
                <p className={authSuccessClass}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {state.success}
                </p>
                <Link href="/login" className={authButtonClass}>
                    Go to Sign In
                </Link>
            </div>
        );
    }

    return (
        <form
            // onSubmit (hindi action=) para HINDI mabura ang na-type kapag may error
            onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                startTransition(() => formAction(data));
            }}
            className="space-y-5"
            data-req-float
        >
            {/* Lumulutang ang error para hindi gumalaw ang form */}
            {state.error && (
                <div className={authToastWrap}>
                    <div role="alert" className={authErrorClass}>
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{state.error}</span>
                    </div>
                </div>
            )}

            <input type="hidden" name="email" value={email} />

            <div className="space-y-2">
                <label htmlFor="code" className={authLabelClass}>
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
                    required
                    suppressHydrationWarning
                    className={`${inputClass} text-center text-2xl font-semibold tracking-[0.5em] md:text-2xl`}
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="password" className={authLabelClass}>
                    New Password
                </label>
                <span className={eyeWrap}>
                    <PasswordInput
                        id="password"
                        name="password"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className={inputClass}
                    />
                </span>
            </div>

            <div className="space-y-2">
                <label htmlFor="confirm" className={authLabelClass}>
                    Confirm New Password
                </label>
                <span className={eyeWrap}>
                    <PasswordInput
                        id="confirm"
                        name="confirm"
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className={inputClass}
                    />
                </span>
            </div>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className={`${authButtonClass} mt-3`}
            >
                {pending ? "Verifying..." : "Reset Password"}
            </button>

            <p className="pt-2 text-center text-sm text-gray-600">
                Didn&apos;t get the code?{" "}
                <Link href="/forgot-password" className="font-semibold text-[#15664f] hover:underline">
                    Send again
                </Link>
            </p>
            <Link href="/login" className={`flex items-center justify-center gap-1.5 text-sm ${authLinkClass}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
            </Link>
        </form>
    );
}