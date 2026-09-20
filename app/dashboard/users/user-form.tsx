"use client";

import { useActionState } from "react";
import { createUser, type CreateUserState } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PasswordInput from "@/components/password-input";

const initialState: CreateUserState = {};

export default function UserForm() {
    const [state, formAction, pending] = useActionState(createUser, initialState);

    return (
        <form action={formAction} className="space-y-4">
            {state.error && (
                <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}
            {state.success && (
                <Alert>
                    <AlertDescription>{state.success}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-2">
                <Label htmlFor="new-email">Email Address</Label>
                <Input
                    id="new-email"
                    name="email"
                    type="email"
                    placeholder="yourname@bcas.edu.ph"
                    autoComplete="off"
                    required
                    suppressHydrationWarning
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <PasswordInput
                    id="new-password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                    id="role"
                    name="role"
                    defaultValue="doctor"
                    required
                    suppressHydrationWarning
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                    <option value="dentist">Dentist</option>
                    <option value="nurse">Nurse</option>
                    <option value="ittech">IT Tech</option>
                </select>
            </div>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className="h-10 w-full rounded-lg bg-[#0d6e56] font-semibold text-white hover:bg-[#0a5a46] disabled:opacity-60"
            >
                {pending ? "Creating..." : "Create Account"}
            </button>
        </form>
    );
}