"use client";

import { useActionState } from "react";
import { employeeLogin, type EmployeeLoginState } from "./actions";
import PasswordInput from "@/components/password-input";
import Image from "next/image";
import Link from "next/link";

const initialState: EmployeeLoginState = {};

export default function EmployeeLoginPage() {
    const [state, formAction, pending] = useActionState(employeeLogin, initialState);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4"
            style={{ background: "linear-gradient(180deg, #e8f5ef 0%, #f7fbf9 100%)" }}>
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
                <div className="flex flex-col items-center text-center">
                    <Image src="/bcas.jpg" alt="BCAS logo" width={100} height={100} priority />
                    <h1 className="text-2xl font-bold text-gray-900">BCAS Clinic</h1>
                    <p className="mt-1 text-sm text-gray-600">Employee Portal</p>
                </div>

                <form action={formAction} className="mt-8 space-y-4">
                    {state.error && (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {state.error}
                        </p>
                    )}

                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700">Employee Number</span>
                        <input
                            name="employeeNumber"
                            placeholder="e.g. EMP-001"
                            required
                            autoComplete="username"
                            suppressHydrationWarning
                            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-[#0d6e56] focus:ring-2 focus:ring-[#0d6e56]/20"
                        />
                    </label>

                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700">Password</span>
                        <PasswordInput
                            name="password"
                            required
                            autoComplete="current-password"
                            className="h-11 w-full rounded-lg border border-gray-300 px-3 pr-10 text-sm text-gray-900 outline-none focus:border-[#0d6e56] focus:ring-2 focus:ring-[#0d6e56]/20"
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={pending}
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg bg-[#0d6e56] text-sm font-semibold text-white hover:bg-[#0a5744] disabled:opacity-60"
                    >
                        {pending ? "Signing in..." : "Sign In"}
                    </button>

                    <p className="pt-2 text-center text-xs text-gray-500">
                        Your records are private and only visible to you and authorized clinic staff.
                    </p>

                    <div className=" text-center">
                        <p className="mt-6 text-sm text-gray-600">
                            Are you clinic staff?{" "}
                            <Link href="/login" className="font-semibold text-[#0d6e56] hover:underline">
                                Sign in to Staff Portal
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </main>
    );
}