"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowRight, Lock, UserRound } from "lucide-react";
import { login } from "@/features/auth/login-actions";
import PasswordInput from "@/components/shared/password-input";

// Modern na "filled" input: light gray, nagiging puti kapag naka-focus
const inputClass =
    "h-12 w-full rounded-2xl border border-transparent bg-gray-100 pl-11 text-base text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:bg-gray-100 focus:border-[#15664f] focus:bg-white focus:ring-4 focus:ring-[#15664f]/15 md:text-sm";

export default function LoginPage() {
    const [state, formAction, pending] = useActionState(login, undefined);
    const year = new Date().getFullYear();

    return (
        <main className="auth-bg flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
            {/* Glass card */}
            <section className="w-full max-w-[420px] rounded-[28px] border border-white bg-white p-7 shadow-2xl shadow-black/50 sm:p-9">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <Image
                        src="/bcas.jpg"
                        alt="BCAS logo"
                        width={128}
                        height={128}
                        priority
                        className="h-14 w-14 shrink-0 rounded-full bg-white object-contain shadow-md ring-2 ring-[#15664f]/20"
                    />
                    <div className="leading-tight">
                        <p className="text-sm font-bold tracking-wide text-[#15664f]">BCAS CLINIC</p>
                        <p className="text-xs text-gray-500">Health Record System</p>
                    </div>
                </div>

                <div className="mt-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sign in</h1>
                    <p className="mt-1.5 text-sm text-gray-500">Welcome back! Please enter your details.</p>
                </div>

                <form action={formAction} className="mt-7 space-y-4">
                    {state?.error && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{state.error}</span>
                        </div>
                    )}

                    <label htmlFor="email" className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700">Email or ID Number</span>
                        <span className="relative block">
                            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                            <input
                                id="email"
                                name="email"
                                type="text"
                                placeholder="Email, student or employee ID"
                                autoComplete="off"
                                required
                                suppressHydrationWarning
                                className={`${inputClass} pr-4`}
                            />
                        </span>
                    </label>

                    <label htmlFor="password" className="block space-y-1.5">
                        <span className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Password</span>
                            <Link href="/forgot-password" className="text-xs font-semibold text-[#15664f] hover:underline">
                                Forgot password?
                            </Link>
                        </span>
                        <span className="relative block">
                            <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                            <PasswordInput
                                id="password"
                                name="password"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                                className={inputClass}
                            />
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={pending}
                        suppressHydrationWarning
                        className="group mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#15664f] to-[#1d8565] px-4 text-base font-semibold text-white shadow-lg shadow-[#15664f]/35 transition-all hover:shadow-xl hover:shadow-[#15664f]/40 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                    >
                        {pending ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-7 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    <span className="h-px flex-1 bg-gray-200" />
                    How to sign in
                    <span className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-[#eef6f2] px-2 py-2.5">
                        <p className="font-semibold text-[#15664f]">Students &amp; Employees</p>
                        <p className="text-gray-600">ID number</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 px-2 py-2.5">
                        <p className="font-semibold text-amber-700">Clinic Staff</p>
                        <p className="text-gray-600">Email address</p>
                    </div>
                </div>
            </section>

            <p className="mt-6 rounded-full bg-black/30 px-4 py-1.5 text-center text-xs font-medium text-white backdrop-blur-sm">
                © {year} Batangas College of Arts and Sciences · School Clinic
            </p>
        </main>
    );
}