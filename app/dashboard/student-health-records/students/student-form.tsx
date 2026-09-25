"use client";

import { useActionState } from "react";
import { createStudent, updateStudent, type StudentState } from "./actions";
import PasswordInput from "@/components/password-input";
import ConfirmSubmit from "@/components/confirm-submit";
import ConfirmLink from "@/components/confirm-link";

const initialState: StudentState = {};

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

export type StudentValues = {
    studentId?: number;
    studentNumber: string;
    lastName: string;
    firstName: string;
    middleName: string;
    gradeLevel: string;
    program: string;
    dateOfBirth: string;
    gender: string;
    // Optional so the new/edit pages keep working until they pass these too.
    contactNumber?: string;
    email?: string;
};

type Props = {
    mode: "create" | "edit";
    student: StudentValues;
    cancelHref: string;
};

export default function StudentForm({ mode, student, cancelHref }: Props) {
    const action = mode === "create" ? createStudent : updateStudent;
    const [state, formAction, pending] = useActionState(action, initialState);

    const { studentId, ...rest } = student;
    const v: Record<string, string> = { ...rest, ...(state.values ?? {}) };

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            {mode === "edit" && <input type="hidden" name="studentId" value={studentId} />}

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Student Details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Field label="Student Number *">
                        <input
                            name="studentNumber"
                            defaultValue={v.studentNumber}
                            placeholder="e.g. 2024-00123"
                            maxLength={20}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Grade/Level">
                        <input
                            name="gradeLevel"
                            defaultValue={v.gradeLevel}
                            placeholder="e.g. Grade 12"
                            maxLength={30}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Program">
                        <input
                            name="program"
                            defaultValue={v.program}
                            placeholder="e.g. STEM"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Last Name *">
                        <input
                            name="lastName"
                            defaultValue={v.lastName}
                            maxLength={50}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="First Name *">
                        <input
                            name="firstName"
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
                            defaultValue={v.middleName}
                            maxLength={50}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Date of Birth">
                        <input
                            name="dateOfBirth"
                            type="date"
                            defaultValue={v.dateOfBirth}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
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
                <h2 className="text-lg font-semibold text-gray-900">Student Portal Login</h2>
                <p className="mt-1 text-xs text-gray-500">
                    {mode === "create"
                        ? "The student signs in with their student number and this password."
                        : "Leave blank to keep the current password."}
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label={mode === "create" ? "Password *" : "New Password"}>
                        <PasswordInput
                            name="password"
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            minLength={8}
                            required={mode === "create"}
                            className={inputClass}
                        />
                    </Field>
                    <Field label={mode === "create" ? "Confirm Password *" : "Confirm New Password"}>
                        <PasswordInput
                            name="confirmPassword"
                            placeholder="Re-type the password"
                            autoComplete="new-password"
                            minLength={8}
                            required={mode === "create"}
                            className={inputClass}
                        />
                    </Field>
                </div>

                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Confirm it&apos;s you</p>
                    <p className="mt-1 text-xs text-amber-800">
                        Student passwords are confidential. Enter your own account password to save this
                        {mode === "create" ? " new account." : " password change."}
                    </p>
                    <div className="mt-3 max-w-sm">
                        <Field label="Your Password *">
                            <PasswordInput
                                name="staffPassword"
                                placeholder="Your own login password"
                                autoComplete="current-password"
                                required={mode === "create"}
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </div>
            </section>

            <div className="flex justify-end gap-3">
                <ConfirmLink
                    href={cancelHref}
                    title="Discard changes?"
                    message="The information you entered will not be saved."
                    confirmLabel="Discard"
                    className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </ConfirmLink>
                <ConfirmSubmit
                    title={mode === "create" ? "Save this student?" : "Save changes?"}
                    message={
                        mode === "create"
                            ? "Please make sure the student information is correct before saving."
                            : "The student's current information will be replaced with your changes."
                    }
                    confirmLabel="Save"
                    disabled={pending}
                    className="h-10 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                >
                    {pending ? "Saving..." : mode === "create" ? "Create Student" : "Save Changes"}
                </ConfirmSubmit>
            </div>
        </form>
    );
}