"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Briefcase, Camera, KeyRound, Phone, Save, ShieldCheck, UserRound, X } from "lucide-react";
import { createEmployee, updateEmployee, type EmployeeState } from "@/features/employees/employee-actions";
import BirthdateField from "@/components/shared/birthdate-field";
import PasswordInput from "@/components/shared/password-input";
import FlashMessage from "@/components/shared/flash-message";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import ConfirmLink from "@/components/shared/confirm-link";
import RecordAvatar from "@/components/shared/record-avatar";

/** Gaano katagal ipapakita ang success message bago lumipat ng page. */
const SUCCESS_DELAY_MS = 3000;

const initialState: EmployeeState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
            {children}
        </label>
    );
}

// Header ng bawat card: icon + title + maikling paliwanag
function SectionHeader({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 md:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                {icon}
            </span>
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                {description && <p className="text-sm text-gray-500">{description}</p>}
            </div>
        </div>
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
    photoUrl?: string;
};

export default function EmployeeForm({
    mode,
    employee,
    cancelHref,
    avatar = null,
}: {
    mode: "create" | "edit";
    employee: EmployeeValues;
    cancelHref: string;
    /** Kasalukuyang profile picture (edit lang) */
    avatar?: string | null;
}) {
    const action = mode === "create" ? createEmployee : updateEmployee;
    const [rawState, formAction, pending] = useActionState(action, initialState);
    const router = useRouter();

    // Maluwag na type: gumagana kahit wala ang success/redirectTo/values sa EmployeeState mo
    const state = rawState as {
        error?: string;
        success?: string;
        redirectTo?: string;
        values?: Record<string, string>;
    };

    // Pagkatapos ng successful save: hintayin ang 3 segundo bago lumipat.
    useEffect(() => {
        if (!state.success || !state.redirectTo) return;
        const timer = setTimeout(() => router.push(state.redirectTo!), SUCCESS_DELAY_MS);
        return () => clearTimeout(timer);
    }, [state, router]);

    const saved = Boolean(state.success);

    const { employeeId, ...rest } = employee;
    const v: Record<string, string> = { ...(rest as Record<string, string>), ...(state.values ?? {}) };

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            {state.success && (
                <FlashMessage key={state.success + String(state.redirectTo)} duration={SUCCESS_DELAY_MS}>
                    {state.success} Returning to the employee list...
                </FlashMessage>
            )}

            {mode === "edit" && <input type="hidden" name="employeeId" value={employeeId} />}

            <div className="grid gap-6 xl:grid-cols-3">
                {/* Work information */}
                <section className={`${card} min-w-0 xl:col-span-1`}>
                    <SectionHeader
                        icon={<Briefcase className="h-5 w-5" />}
                        title="Work Information"
                        description="Employee number and role."
                    />
                    <div className="grid gap-4 p-5 sm:grid-cols-2 md:p-6 xl:grid-cols-1">
                        <Field label="Employee Number *">
                            <input
                                name="employeeNumber"
                                defaultValue={v.employeeNumber}
                                placeholder="e.g. EMP-001"
                                maxLength={20}
                                required
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Department">
                            <input
                                name="department"
                                defaultValue={v.department}
                                placeholder="e.g. College Department"
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
                                maxLength={100}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </section>

                {/* Personal information */}
                <section className={`${card} min-w-0 xl:col-span-2`}>
                    <SectionHeader
                        icon={<UserRound className="h-5 w-5" />}
                        title="Personal Information"
                        description="Profile photo, full name, birthday, and gender."
                    />
                    <div className="flex flex-col gap-6 p-5 md:flex-row md:p-6">
                        {/* Profile photo */}
                        <div className="flex shrink-0 flex-col items-center gap-2 md:w-36">
                            <span className="text-sm font-semibold text-gray-800">Profile Photo</span>
                            {mode === "edit" && employeeId ? (
                                <RecordAvatar
                                    type="employee"
                                    id={employeeId}
                                    current={avatar}
                                    initials={`${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase()}
                                    canEdit
                                />
                            ) : (
                                <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-amber-300 bg-amber-50 text-amber-500">
                                    <Camera className="h-7 w-7" />
                                </span>
                            )}
                            <span className="text-center text-xs text-gray-500">
                                {mode === "edit"
                                    ? "Click the photo to upload or change it."
                                    : "You can add a photo after saving."}
                            </span>
                        </div>

                        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                            {/* Dalawang cell ito: Date of Birth at Age */}
                            <BirthdateField name="dateOfBirth" defaultValue={v.dateOfBirth} inputClass={inputClass} />
                            <Field label="Gender">
                                <select name="gender" defaultValue={v.gender} suppressHydrationWarning className={inputClass}>
                                    <option value="">Not specified</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </Field>
                        </div>
                    </div>
                </section>
            </div>

            {/* Contact */}
            <section className={`${card} min-w-0`}>
                <SectionHeader
                    icon={<Phone className="h-5 w-5" />}
                    title="Contact Information"
                    description="Optional. Used by the clinic to reach the employee."
                />
                <div className="grid gap-4 p-5 sm:grid-cols-2 md:p-6">
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

            {/* Portal login */}
            <section className={`${card} min-w-0`}>
                <SectionHeader
                    icon={<KeyRound className="h-5 w-5" />}
                    title="Employee Portal Login"
                    description={
                        mode === "create"
                            ? "The employee signs in with their employee number and this password."
                            : "Leave blank to keep the current password."
                    }
                />
                <div className="space-y-5 p-5 md:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={mode === "create" ? "Password *" : "New Password"}>
                            <PasswordInput
                                name="password"
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                                minLength={8}
                                required={mode === "create"}
                                suppressHydrationWarning
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
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <div className="flex flex-col gap-4 rounded-xl border-2 border-amber-200 bg-amber-50/70 p-4 md:flex-row md:items-end md:justify-between">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">Confirm it&apos;s you</p>
                                <p className="mt-0.5 text-xs text-amber-800">
                                    Employee passwords are confidential. Enter your own account password to save this
                                    {mode === "create" ? " new account." : " password change."}
                                </p>
                            </div>
                        </div>
                        <div className="w-full md:max-w-xs">
                            <Field label={mode === "create" ? "Your Password *" : "Your Password"}>
                                <PasswordInput
                                    name="staffPassword"
                                    placeholder="Your own login password"
                                    autoComplete="current-password"
                                    required={mode === "create"}
                                    suppressHydrationWarning
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mga button: nakadikit sa ibaba habang nag-i-scroll */}
            <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-[#cfe5d9] bg-[#e7f3e2]/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-end md:-mx-8 md:px-8">
                <ConfirmLink
                    href={cancelHref}
                    title="Discard changes?"
                    message="The information you entered will not be saved."
                    confirmLabel="Discard"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    <X className="h-4 w-4" />
                    Cancel
                </ConfirmLink>
                <ConfirmSubmit
                    title={mode === "create" ? "Save this employee?" : "Save changes?"}
                    message={
                        mode === "create"
                            ? "Please make sure the employee information is correct before saving."
                            : "The employee's current information will be replaced with your changes."
                    }
                    confirmLabel="Save"
                    disabled={pending || saved}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {pending ? "Saving..." : saved ? "Saved" : mode === "create" ? "Create Employee" : "Save Changes"}
                </ConfirmSubmit>
            </div>
        </form>
    );
}