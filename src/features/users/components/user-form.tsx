"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { createUser, type CreateUserState } from "@/features/users/actions";
import PasswordInput from "@/components/shared/password-input";
import FlashMessage from "@/components/shared/flash-message";
import { ACADEMIC_CATEGORIES, ACADEMIC_CATEGORY_LABELS } from "@/lib/academic";

const initialState: CreateUserState = {};

const fieldClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

export default function UserForm({ allowAdmin = false }: { allowAdmin?: boolean }) {
    const [state, formAction, pending] = useActionState(createUser, initialState);
    // Nadadagdagan bawat submit para lumabas ulit ang 3-second message.
    const [submitKey, setSubmitKey] = useState(0);

    return (
        <form
            action={(formData) => {
                setSubmitKey((k) => k + 1);
                formAction(formData);
            }}
            // Nasa loob ng modal (New Account): patayo ang mga field
            className="grid gap-4"
        >
            {state.error && (
                <p className="col-span-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}
            {state.success && !state.error && (
                <div className="col-span-full">
                    <FlashMessage key={submitKey}>{state.success}</FlashMessage>
                </div>
            )}

            <label htmlFor="new-email" className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-800">Email Address *</span>
                <input
                    id="new-email"
                    name="email"
                    type="email"
                    placeholder="yourname@bcas.edu.ph"
                    autoComplete="off"
                    required
                    suppressHydrationWarning
                    className={fieldClass}
                />
            </label>

            <label htmlFor="new-password" className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-800">Password *</span>
                <PasswordInput
                    id="new-password"
                    name="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className={fieldClass}
                />
            </label>

            <label htmlFor="role" className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-800">Role *</span>
                <select
                    id="role"
                    name="role"
                    defaultValue="doctor"
                    required
                    suppressHydrationWarning
                    className={fieldClass}
                >
                    {/* Administrator lang ang puwedeng gumawa ng Administrator */}
                    {allowAdmin && <option value="admin">Administrator</option>}
                    <option value="doctor">Doctor</option>
                    <option value="dentist">Dentist</option>
                    <option value="nurse">Nurse</option>
                    <option value="ittech">IT Technician</option>
                    <option value="academic_head">Academic Head</option>
                </select>
            </label>

            {/* Category para sa Academic Head lang (ignored kapag ibang role) */}
            <label htmlFor="academic-category" className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-800">Academic Category (Academic Head only)</span>
                <select id="academic-category" name="academicCategory" defaultValue="" suppressHydrationWarning className={fieldClass}>
                    <option value="">Select category</option>
                    {ACADEMIC_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{ACADEMIC_CATEGORY_LABELS[c]}</option>
                    ))}
                </select>
            </label>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10523f] disabled:opacity-60"
            >
                <UserPlus className="h-4 w-4" />
                {pending ? "Creating..." : "Create Account"}
            </button>
        </form>
    );
}