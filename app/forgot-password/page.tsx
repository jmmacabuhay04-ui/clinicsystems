"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { requestOtp, type ForgotState } from "./actions";

const initialState: ForgotState = {};

export default function ForgotPasswordPage() {
    const [state, formAction, pending] = useActionState(requestOtp, initialState);

    return (
        <main
            className="flex min-h-screen flex-col items-center justify-center p-4"
            style={{ background: "linear-gradient(180deg, #e8f5ef 0%, #f7fbf9 100%)" }}
        >
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <Image src="/bcas.jpg" alt="BCAS logo" width={100} height={100} priority />
                    <h1 className="mt-4 text-3xl font-bold text-gray-900">Forgot Password</h1>
                    <p className="mt-2 text-gray-500">
                        Enter your email and we&apos;ll send you a 6-digit code
                    </p>
                </div>

                <form action={formAction} className="mt-8 space-y-5">
                    {state.error && (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {state.error}
                        </p>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="yourname@bcas.edu.ph"
                            autoComplete="email"
                            required
                            suppressHydrationWarning
                            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-900 outline-none focus:border-[#0d6e56] focus:ring-2 focus:ring-[#0d6e56]/20"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={pending}
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg bg-[#0d6e56] font-semibold text-white transition-colors hover:bg-[#0a5a46] disabled:opacity-60"
                    >
                        {pending ? "Sending..." : "Send Code"}
                    </button>

                    <p className="pt-2 text-center text-sm text-gray-600">
                        Remember your password?{" "}
                        <Link href="/login" className="font-semibold text-[#0d6e56] hover:underline">
                            Back to Sign In
                        </Link>
                    </p>
                </form>
            </div>
        </main>
    );
}