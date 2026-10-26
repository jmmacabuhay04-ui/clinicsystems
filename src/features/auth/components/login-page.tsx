"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowRight, HeartHandshake, LockKeyhole, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { login } from "@/features/auth/login-actions";
import PasswordInput from "@/components/shared/password-input";

// LOGIN PAGE NG SCHOOL CLINIC
// Kaliwa: BCAS logo, "School Clinic", tagline at tatlong feature icon.
// Kanan: puting card ng login form na may green na sulok.
// Phone/tablet: nasa itaas ang logo at pamagat, nasa ilalim ang card.
// Kulay: kapareho ng dashboard (green #15664f, mint #e7f3e2, amber na accent).

// Malambot na mint na input, bilugan
const inputClass =
    "h-12 w-full rounded-full border border-transparent bg-[#eef6f2] pl-12 pr-5 text-base text-gray-900 outline-none transition placeholder:text-gray-500! hover:border-[#cfe5d9] focus:border-[#15664f] focus:bg-white focus:ring-4 focus:ring-[#15664f]/10 md:text-sm";

const iconClass = "pointer-events-none absolute left-5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#15664f]";

const FEATURES = [
    { icon: ShieldCheck, label: "Quality Healthcare" },
    { icon: UsersRound, label: "Caring Support" },
    { icon: HeartHandshake, label: "A Healthier School Community" },
] as const;

// Loading screen nang 3 segundo bago mag-sign in
const LOADING_MS = 3000;

async function loginWithDelay(prev: Awaited<ReturnType<typeof login>> | undefined, formData: FormData) {
    await new Promise((resolve) => setTimeout(resolve, LOADING_MS));
    return login(prev as Awaited<ReturnType<typeof login>>, formData);
}

// Loading screen: BCAS logo sa puting bilog, may umiikot na amber na guhit sa paligid,
// kumikislap na liwanag sa likod, at progress bar na napupuno sa loob ng 3 segundo.
function LoadingScreen() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#e7f3e2] px-6"
        >
            <style>{`
                @keyframes clinic-progress { from { width: 0%; } to { width: 100%; } }
                @keyframes clinic-dot { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
            `}</style>

            {/* Background: campus photo na malabo, may maputing takip (kapareho ng login page) */}
            <div
                aria-hidden
                className="absolute inset-0 scale-110 bg-cover bg-center blur-md"
                style={{ backgroundImage: "url('/bg.jpg')" }}
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-white/85 via-[#eef6f2]/80 to-[#e7f3e2]/85 backdrop-blur-sm" />
            {/* Malambot na liwanag sa gitna */}
            <div aria-hidden className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-3xl" />
            {/* Alon sa kaliwang-ibaba, kapareho ng login page */}
            <svg
                aria-hidden
                viewBox="0 0 400 200"
                preserveAspectRatio="none"
                className="absolute bottom-0 left-0 h-28 w-2/3 sm:h-36 lg:h-44 lg:w-1/2"
            >
                <path d="M0 120 C 90 70, 190 90, 300 150 C 340 172, 370 188, 400 200 H0 Z" fill="#15664f" fillOpacity="0.9" />
                <path d="M0 96 C 100 46, 200 66, 310 130 C 350 154, 380 176, 400 190" fill="none" stroke="#fbbf24" strokeWidth="4" />
            </svg>

            <div className="relative flex w-full max-w-xs flex-col items-center text-center">
                {/* Emblem + umiikot na guhit */}
                <div className="relative h-36 w-36">
                    {/* Kumikislap na bilog sa likod */}
                    <span className="absolute inset-3 animate-ping rounded-full bg-[#15664f]/10 [animation-duration:2s]" />
                    {/* Track at umiikot na amber na guhit */}
                    <svg viewBox="0 0 120 120" aria-hidden="true" className="absolute inset-0 h-full w-full">
                        <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#15664f]/15" />
                    </svg>
                    <svg viewBox="0 0 120 120" aria-hidden="true" className="absolute inset-0 h-full w-full animate-spin [animation-duration:1.2s]">
                        <circle
                            cx="60"
                            cy="60"
                            r="55"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="80 266"
                            className="text-[#15664f]"
                        />
                    </svg>
                    {/* Puting bilog na may emblem */}
                    <span className="absolute inset-4 flex items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-[0_18px_40px_-12px_rgba(16,82,63,0.45)]">
                        <Image src="/bcas.jpg" alt="" width={200} height={200} className="h-full w-full rounded-full object-contain" />
                    </span>
                </div>

                <p className="mt-8 text-lg font-bold tracking-wide text-[#10523f]">
                    Signing you in
                    <span className="ml-0.5 inline-flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                            <span
                                key={i}
                                className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                                style={{ animation: `clinic-dot 1.2s ${i * 0.15}s infinite ease-in-out` }}
                            />
                        ))}
                    </span>
                </p>
                <p className="mt-1.5 text-sm text-gray-600">Preparing your clinic records</p>

                {/* Progress bar: napupuno sa loob ng 3 segundo */}
                <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[#15664f]/10">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#15664f] to-amber-400"
                        style={{ animation: `clinic-progress ${LOADING_MS}ms ease-out forwards` }}
                    />
                </div>

                <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#15664f]/60">BCAS School Clinic</p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [state, formAction, pending] = useActionState(loginWithDelay, undefined);
    const year = new Date().getFullYear();

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#e7f3e2]">
            {/* Lalabas nang 3 segundo pagka-click ng Log In */}
            {pending && <LoadingScreen />}

            {/* BACKGROUND: campus photo na may malambot na puti/mint na takip, para mabasa pa rin ang text */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 scale-105 bg-cover bg-center blur-[2px]"
                style={{ backgroundImage: "url('/bg.jpg')" }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/85 via-[#eef6f2]/75 to-[#e7f3e2]/70"
            />

            {/* Malambot na liwanag sa likod */}
            <div aria-hidden className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-white/60 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#15664f]/10 blur-3xl" />

            {/* Alon sa kaliwang-ibaba: green na may dilaw na guhit */}
            <svg
                aria-hidden
                viewBox="0 0 400 200"
                preserveAspectRatio="none"
                className="pointer-events-none absolute bottom-0 left-0 h-28 w-2/3 sm:h-36 lg:h-44 lg:w-1/2"
            >
                <path d="M0 120 C 90 70, 190 90, 300 150 C 340 172, 370 188, 400 200 H0 Z" fill="#15664f" fillOpacity="0.9" />
                <path d="M0 96 C 100 46, 200 66, 310 130 C 350 154, 380 176, 400 190" fill="none" stroke="#fbbf24" strokeWidth="4" />
            </svg>

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 py-8 sm:px-8 lg:flex-row lg:justify-between lg:gap-12 lg:px-12">
                {/* ===== KALIWA: LOGO AT PAMAGAT ===== */}
                <section className="flex max-w-md flex-col items-center text-center lg:flex-1">
                    {/* BCAS logo: walang border, may malambot na liwanag sa likod at lumulutang na anino */}
                    <div className="relative">
                        <span
                            aria-hidden
                            className="absolute -inset-4 rounded-full bg-gradient-to-br from-[#15664f]/25 via-white/60 to-amber-300/30 blur-2xl"
                        />
                        <Image
                            src="/bcas.jpg"
                            alt="BCAS logo"
                            width={320}
                            height={320}
                            priority
                            className="relative h-24 w-24 rounded-full bg-white object-contain shadow-[0_18px_40px_-12px_rgba(16,82,63,0.45)] sm:h-28 sm:w-28 lg:h-40 lg:w-40"
                        />
                    </div>

                    <h2 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                        <span className="text-[#15664f]">School</span> <span className="text-[#4f9a7c]">Clinic</span>
                    </h2>
                    <p className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#10523f] sm:text-xs">
                        Healthy Minds
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Brighter Futures
                    </p>

                    {/* Desktop/tablet lang: mensahe at mga icon */}
                    <span className="mt-6 hidden h-0.5 w-14 rounded-full bg-amber-400 sm:block" />
                    <p className="mt-6 hidden max-w-xs text-[15px] leading-relaxed text-gray-600 sm:block">
                        The BCAS school clinic is here to support your health and well-being.
                    </p>
                    <ul className="mt-8 hidden grid-cols-3 gap-4 sm:grid">
                        {FEATURES.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex flex-col items-center gap-2">
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e2efe8] text-[#15664f] ring-1 ring-[#cfe5d9]">
                                    <Icon className="h-6 w-6" />
                                </span>
                                <span className="max-w-[7.5rem] text-xs font-medium leading-snug text-gray-700">{label}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* ===== KANAN: LOGIN CARD ===== */}
                <section className="relative w-full max-w-[440px] overflow-hidden rounded-3xl bg-white p-6 shadow-2xl shadow-[#15664f]/15 sm:p-10 lg:flex-none">
                    {/* Green na sulok sa kanang-itaas */}
                    <span aria-hidden className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#4f9a7c]/80" />
                    <span aria-hidden className="absolute -right-6 -top-20 h-24 w-24 rounded-full bg-[#15664f]/20" />

                    <div className="relative">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#15664f]">Welcome back</p>
                        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#10523f] sm:text-5xl">Log In</h1>
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-600">
                            Access your account to continue to the School Clinic System.
                        </p>

                        <form action={formAction} className="mt-8 space-y-4">
                            {state?.error && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                >
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{state.error}</span>
                                </div>
                            )}

                            <label htmlFor="email" className="relative block">
                                <span className="sr-only">Email or ID Number</span>
                                <UserRound className={iconClass} />
                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    placeholder="Email or ID number"
                                    autoComplete="off"
                                    required
                                    suppressHydrationWarning
                                    className={inputClass}
                                />
                            </label>

                            <label
                                htmlFor="password"
                                className="relative block [&_button]:right-5 [&_button]:text-gray-500 [&_button:hover]:text-[#15664f]"
                            >
                                <span className="sr-only">Password</span>
                                <LockKeyhole className={iconClass} />
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    required
                                    className={inputClass}
                                />
                            </label>

                            <div className="flex justify-end">
                                <Link href="/forgot-password" className="text-sm font-semibold text-[#15664f] hover:text-[#10523f] hover:underline">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={pending}
                                suppressHydrationWarning
                                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#15664f] px-4 text-[15px] font-semibold text-white shadow-lg shadow-[#15664f]/25 transition hover:bg-[#10523f] active:scale-[0.99] disabled:opacity-60"
                            >
                                {pending ? (
                                    "Logging in..."
                                ) : (
                                    <>
                                        Log In
                                        <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="my-6 h-px bg-gray-200" />

                        {/* Paalala */}
                        <div className="flex items-start gap-3 rounded-2xl bg-[#eef6f2] p-4">
                            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 fill-[#15664f] text-white" />
                            <div>
                                <p className="text-sm font-semibold text-[#10523f]">Authorized users only</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                                    Students and employees sign in with their ID number. Clinic staff sign in with their email.
                                </p>
                            </div>
                        </div>

                        {/* Copyright sa loob ng form */}
                        <p className="mt-6 text-center text-[11px] leading-relaxed text-gray-400">
                            © {year} Batangas College of Arts and Sciences · School Clinic
                        </p>
                    </div>
                </section>
            </div>

        </main>
    );
}