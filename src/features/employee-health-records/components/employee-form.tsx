"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createEmployee, updateEmployee, type EmployeeState } from "@/features/employee-health-records/employee-actions";
import BirthdateField from "@/components/shared/birthdate-field";

const initialState: EmployeeState = {};

const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {children}
        </label>
    );
}

export type EmployeeValues = {
    employeeId?: number;
    employeeNumber: string;
    lastName: string;
    firstName: string;
    middleName: string;
    department: string;
    position: string;
    dateOfBirth: string;
    gender: string;
    // Optional so the new/edit pages keep working until they pass these too.
    contactNumber?: string;
    email?: string;
};

export default function EmployeeForm({
    mode,
    employee,
    cancelHref,
}: {
    mode: "create" | "edit";
    employee: EmployeeValues;
    cancelHref: string;
}) {
    const action = mode === "create" ? createEmployee : updateEmployee;
    const [state, formAction, pending] = useActionState(action, initialState);

    const { employeeId, ...rest } = employee;
    const v: Record<string, string> = { ...rest, ...(state.values ?? {}) };

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            {mode === "edit" && <input type="hidden" name="employeeId" value={employeeId} />}

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#15664f]">Employee Details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Field label="Employee Number *">
                        <input
                            name="employeeNumber"
                            defaultValue={v.employeeNumber}
                            placeholder="e.g. EMP-001"
                            maxLength={20}
                            required
                            suppressHydrationWarning
                            autoComplete="off"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Department">
                        <input
                            name="department"
                            defaultValue={v.department}
                            placeholder="e.g. College Department"
                            autoComplete="off"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Position">
                        <input
                            name="position"
                            defaultValue={v.position}
                            placeholder="e.g. Instructor"
                            autoComplete="off"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Last Name *">
                        <input
                            name="lastName"
                            defaultValue={v.lastName}
                            autoComplete="off"
                            maxLength={50}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="First Name *">
                        <input
                            name="firstName"
                            autoComplete="off"
                            defaultValue={v.firstName}
                            maxLength={50}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Middle Name">
                        <input
                            name="middleName"
                            autoComplete="off"
                            defaultValue={v.middleName}
                            maxLength={50}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <BirthdateField
                        name="dateOfBirth"
                        defaultValue={v.dateOfBirth}
                        inputClass={inputClass}
                    />
                    <Field label="Gender">
                        <select
                            name="gender"
                            defaultValue={v.gender}
                            suppressHydrationWarning
                            className={inputClass}
                        >
                            <option value="">Not specified</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </Field>
                    <Field label="Contact Number">
                        <input
                            name="contactNumber"
                            type="tel"
                            autoComplete="off"
                            defaultValue={v.contactNumber}
                            placeholder="09XXXXXXXXX"
                            maxLength={20}
                            inputMode="numeric"
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Email Address">
                        <input
                            name="email"
                            type="email"
                            defaultValue={v.email}
                            placeholder="name@example.com"
                            maxLength={120}
                            autoComplete="off"
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#15664f]">Employee Portal Login</h2>
                <p className="mt-1 text-xs text-gray-700">
                    {mode === "create"
                        ? "The employee signs in with their employee number and this password."
                        : "Leave blank to keep the current password."}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label={mode === "create" ? "Password *" : "New Password"}>
                        <input
                            name="password"
                            type="password"
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            minLength={8}
                            required={mode === "create"}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label={mode === "create" ? "Confirm Password *" : "Confirm New Password"}>
                        <input
                            name="confirmPassword"
                            type="password"
                            placeholder="Re-type the password"
                            autoComplete="new-password"
                            minLength={8}
                            required={mode === "create"}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                </div>

                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Confirm it&apos;s you</p>
                    <p className="mt-1 text-xs text-amber-800">
                        Employee passwords are confidential. Enter your own account password to save this
                        {mode === "create" ? " new account." : " password change."}
                    </p>
                    <div className="mt-3 max-w-sm">
                        <Field label={mode === "create" ? "Your Password *" : "Your Password"}>
                            <input
                                name="staffPassword"
                                type="password"
                                placeholder="Your own login password"
                                autoComplete="current-password"
                                required={mode === "create"}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </div>
            </section>

            <div className="flex justify-end gap-3">
                <Link
                    href={cancelHref}
                    className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={pending}
                    suppressHydrationWarning
                    className="h-10 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                >
                    {pending ? "Saving..." : mode === "create" ? "Create Employee" : "Save Changes"}
                </button>
            </div>
        </form>
    );
}