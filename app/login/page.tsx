"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { login } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PasswordInput from "@/components/password-input";

export default function LoginPage() {
    const [state, formAction, pending] = useActionState(login, undefined);

    return (
        <main
            className="auth-bg flex min-h-screen flex-col items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <Image src="/bcas.jpg" alt="BCAS logo" width={100} height={100} priority />
                    <h1 className="mt-4 text-3xl font-bold text-gray-900">BCAS Clinic System</h1>

                </div>

                <form action={formAction} className="mt-8 space-y-5">
                    {state?.error && (
                        <Alert variant="destructive">
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="font-semibold text-gray-700">
                            Email Address
                        </Label>

                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="yourname@bcas.edu.ph"
                            autoComplete="email"
                            required
                            suppressHydrationWarning
                            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-900 transition-colors hover:border-[#0d6e56] focus-visible:border-[#0d6e56] focus-visible:ring-2 focus-visible:ring-[#0d6e56]/20"
                        />

                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="font-semibold text-gray-700">
                            Password
                        </Label>
                        <PasswordInput
                            id="password"
                            name="password"
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-900 outline-none focus:border-[#0d6e56] focus:ring-2 focus:ring-[#0d6e56]/20"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={pending}
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg bg-[#0d6e56] px-4 text-left font-semibold text-white transition-colors hover:bg-[#0a5a46] disabled:opacity-60"
                    >
                        {pending ? "Signing in..." : "Sign In"}
                    </button>

                    <div className="text-center">
                        <Link href="/forgot-password" className="text-sm text-[#0d4a3a] hover:underline">
                            Forgot password?
                        </Link>
                    </div>


                    <div className="space-y-2">
                        <Link
                            href="/student/login"
                            className="block text-center text-sm font-semibold text-[#0d6e56] hover:underline"
                        >
                            Sign in to Student Portal
                        </Link>
                        <Link
                            href="/employee/login"
                            className="block text-center text-sm font-semibold text-[#0d6e56] hover:underline"
                        >
                            Sign in to Employee Portal
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
}