"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { login } from "@/features/auth/login-actions";
import PasswordInput from "@/components/shared/password-input";

// Outlined na input na bilugan, puting border sa madilim na background
const inputClass =
    "h-12 w-full rounded-full border border-white/35 bg-transparent px-5 text-base text-white outline-none transition-colors placeholder:text-white/40 hover:border-white/60 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 md:text-sm";

// Loading screen nang 3 segundo bago mag-sign in
const LOADING_MS = 2000;

async function loginWithDelay(prev: Awaited<ReturnType<typeof login>> | undefined, formData: FormData) {
    await new Promise((resolve) => setTimeout(resolve, LOADING_MS));
    return login(prev as Awaited<ReturnType<typeof login>>, formData);
}

// Loading screen: bilog na may outline na cross sa gitna,
// at may umiikot na guhit (arc) sa paligid ng bilog.
function LoadingScreen() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[#0b2a20]/95 backdrop-blur-sm"
        >
            <div className="relative h-28 w-28 sm:h-32 sm:w-32">
                {/* Bilog at cross (hindi gumagalaw) */}
                <svg viewBox="0 0 120 120" aria-hidden="true" className="absolute inset-0 h-full w-full">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/25" />
                    <path
                        d="M50 32h20v18h18v20H70v18H50V70H32V50h18z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinejoin="round"
                        className="text-amber-300"
                    />
                </svg>
                {/* Umiikot na guhit sa paligid */}
                <svg viewBox="0 0 120 120" aria-hidden="true" className="absolute inset-0 h-full w-full animate-spin">
                    <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="70 257"
                        className="text-amber-300"
                    />
                </svg>
            </div>
            <p className="text-sm font-medium tracking-wide text-white/80">Logging in...</p>
        </div>
    );
}

export default function LoginPage() {
    const [state, formAction, pending] = useActionState(loginWithDelay, undefined);
    const year = new Date().getFullYear();

    return (
        // Desktop (lg): kaliwa = form, kanan = campus photo.
        // Phone/tablet: photo bilang banner sa itaas, form sa ilalim.
        <main className="grid min-h-screen bg-[#0b2a20] lg:grid-cols-2 lg:p-3">
            {/* Lalabas nang 3 segundo pagka-click ng Login */}
            {pending && <LoadingScreen />}
            {/* LEFT: form */}
            <section className="flex min-h-screen flex-col lg:min-h-0">
                {/* Phone/tablet: banner na may campus photo at logo */}
                <div
                    className="relative h-48 shrink-0 overflow-hidden rounded-b-[2rem] bg-cover bg-center sm:h-60 lg:hidden"
                    style={{ backgroundImage: "url('/bg.jpg')" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b2a20] via-[#0b2a20]/30 to-black/10" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-6 pb-5 sm:px-10">
                        <Image
                            src="/bcas.jpg"
                            alt="BCAS logo"
                            width={96}
                            height={96}
                            priority
                            className="h-12 w-12 shrink-0 rounded-full bg-white object-contain ring-2 ring-white/40"
                        />
                        <div className="leading-tight">
                            <p className="text-base font-bold tracking-wide text-white">BCAS CLINIC</p>
                            <p className="text-xs text-white/80">Health Record System</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 flex-col px-6 pb-6 pt-6 sm:px-10 lg:px-12 lg:py-8 xl:px-20">
                    {/* Brand (desktop lang; nasa banner ito sa phone) */}
                    <div className="hidden items-center gap-3 lg:flex">
                        <Image
                            src="/bcas.jpg"
                            alt="BCAS logo"
                            width={96}
                            height={96}
                            priority
                            className="h-11 w-11 shrink-0 rounded-full bg-white object-contain ring-2 ring-white/20"
                        />
                        <div className="leading-tight">
                            <p className="text-sm font-bold tracking-wide text-white">BCAS CLINIC</p>
                            <p className="text-xs text-white/60">Health Record System</p>
                        </div>
                    </div>

                    {/* Form, nasa gitna ng taas (gitna rin ng screen sa tablet) */}
                    <div className="flex flex-1 items-center justify-center py-2 lg:justify-start lg:py-10">
                        <div className="w-full max-w-sm">
                            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Login</h1>
                            <p className="mt-2 text-sm text-white/70">Welcome back! Sign in to access the clinic records.</p>

                            <form action={formAction} className="mt-6 space-y-5 sm:mt-8">
                                {state?.error && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-2 rounded-2xl border border-red-400/40 bg-red-500/15 p-3 text-sm text-red-100"
                                    >
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{state.error}</span>
                                    </div>
                                )}

                                <label htmlFor="email" className="block space-y-2">
                                    <span className="text-sm font-medium text-white">Email or ID Number*</span>
                                    <input
                                        id="email"
                                        name="email"
                                        type="text"
                                        placeholder="Email, student or employee ID"
                                        autoComplete="off"
                                        required
                                        suppressHydrationWarning
                                        className={inputClass}
                                    />
                                </label>

                                <label htmlFor="password" className="block space-y-2">
                                    <span className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-white">Password*</span>
                                        <Link href="/forgot-password" className="text-xs font-semibold text-amber-300 hover:underline">
                                            Forgot password?
                                        </Link>
                                    </span>
                                    {/* Puting eye icon para kita sa madilim */}
                                    <span className="block [&_button]:text-white/60 [&_button:hover]:text-white">
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
                                    className="group mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-4 text-base font-semibold text-[#0b2a20] shadow-lg shadow-amber-400/20 transition-all hover:bg-amber-300 active:scale-[0.99] disabled:opacity-60"
                                >
                                    {pending ? (
                                        "Logging in..."
                                    ) : (
                                        <>
                                            Login
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Paano mag-sign in */}
                            <div className="mt-6 grid grid-cols-2 gap-2 text-center text-xs sm:mt-8">
                                <div className="rounded-2xl border border-white/15 px-2 py-2.5">
                                    <p className="font-semibold text-white">Students &amp; Employees</p>
                                    <p className="text-white/60">ID number</p>
                                </div>
                                <div className="rounded-2xl border border-white/15 px-2 py-2.5">
                                    <p className="font-semibold text-amber-300">Clinic Staff</p>
                                    <p className="text-white/60">Email address</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-white/60 lg:mt-0 lg:text-left">
                        © {year} Batangas College of Arts and Sciences · School Clinic
                    </p>
                </div>
            </section>

            {/* RIGHT: campus photo (desktop lang) */}
            <section
                aria-hidden
                className="relative hidden overflow-hidden rounded-3xl bg-cover bg-center lg:block"
                style={{ backgroundImage: "url('/bg.jpg')" }}
            >
                {/* Bahagyang dilim sa ibaba para mabasa ang text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 lg:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">School Clinic</p>
                    <p className="mt-2 max-w-md text-2xl font-bold leading-snug text-white lg:text-3xl">
                        Caring for the health of every BCAS student and employee.
                    </p>
                </div>
            </section>
        </main>
    );
}