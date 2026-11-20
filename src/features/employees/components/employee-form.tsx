"use client";
import { useActionState, useEffect, useState } from "react";
import { Briefcase, Camera, KeyRound, Phone, Save, ShieldCheck, UserRound, X } from "lucide-react";
import { createEmployee, updateEmployee, type EmployeeState } from "@/features/employees/employee-actions";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import RedirectNotice from "@/components/shared/redirect-notice";
import ConfirmLink from "@/components/shared/confirm-link";
import BirthdateField from "@/components/shared/birthdate-field";
import PasswordInput from "@/components/shared/password-input";
import PasswordChecklist from "@/components/shared/password-checklist";
import RecordAvatar from "@/components/shared/record-avatar";

const initialState: EmployeeState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

// Pulang error na kusang nawawala pagkalipas ng ilang segundo (default 3s).
// May guhit sa ilalim na umiikli habang tumatakbo ang oras.
// `trigger`: ipasa ang state ng form (bagong object bawat submit) para lumabas ulit
// ang error kahit pareho ang mensahe.
const TIMED_ERROR_CSS = `@keyframes te-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`;

function TimedError({
    message,
    trigger,
    seconds = 3,
}: {
    message: string | null | undefined;
    trigger?: unknown;
    seconds?: number;
}) {
    // Aling submit na ang naitago na (hindi setState sa loob mismo ng effect)
    const [hiddenFor, setHiddenFor] = useState<unknown>(null);
    const key = trigger ?? message;
    const visible = Boolean(message) && hiddenFor !== key;

    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setHiddenFor(key), seconds * 1000);
        return () => clearTimeout(t);
    }, [key, message, seconds]);

    if (!visible) return null;
    return (
        <div role="alert" className="relative overflow-hidden rounded-lg border border-red-200 bg-red-50 p-3 pb-4 text-sm text-red-700">
            <style>{TIMED_ERROR_CSS}</style>
            {message}
            {/* Guhit sa ilalim: umiikli sa loob ng `seconds` */}
            <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1 origin-left bg-red-400"
                style={{ animation: `te-shrink ${seconds}s linear forwards` }}
            />
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
            {children}
            {hint && <span className="block text-sm text-gray-600">{hint}</span>}
        </label>
    );
}

// Header ng bawat card: icon + title + maikling paliwanag
function SectionHeader({
    title,
    description,
}: {
    /** Hindi na ipinapakita (inalis ang icon sa header); puwede pa ring ipasa */
    icon?: React.ReactNode;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 md:px-6">
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                {description && <p className="text-sm text-gray-600">{description}</p>}
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

type Props = {
    mode: "create" | "edit";
    employee: EmployeeValues;
    cancelHref: string;
    /** Saan babalik pagka-save (hal. Health Record ng employee) */
    returnTo?: string;
    /** Kasalukuyang profile picture (edit lang) */
    avatar?: string | null;
};

export default function EmployeeForm({ mode, employee, cancelHref, returnTo, avatar = null }: Props) {
    const action = mode === "create" ? createEmployee : updateEmployee;
    const [state, formAction, pending] = useActionState(action, initialState);
    // Na-type na portal password (para sa checklist sa ilalim)
    const [newPassword, setNewPassword] = useState("");

    const { employeeId, ...rest } = employee;
    // Maluwag na type para gumana kahit anong laman ng EmployeeState mo
    const extra = (state as { values?: Record<string, string> }).values ?? {};
    const v: Record<string, string> = { ...(rest as Record<string, string>), ...extra };

    return (
        <form action={formAction} className="space-y-6">
            {/* Error: kusang nawawala pagkalipas ng 3 segundo (may guhit sa ilalim) */}
            <TimedError message={state.error} trigger={state} />
            {/* Na-save: ipakita nang 3 segundo, tapos kusang babalik */}
            {(state as { success?: string }).success && (state as { redirectTo?: string }).redirectTo && (
                <RedirectNotice
                    tone="employee"
                    message={(state as { success?: string }).success ?? ""}
                    href={(state as { redirectTo?: string }).redirectTo ?? "/dashboard"}
                    backLabel={returnTo ? "the health record" : "the list"}
                />
            )}

            {mode === "edit" && <input type="hidden" name="employeeId" value={employeeId} />}
            {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

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
                            <input required
                                name="department"
                                defaultValue={v.department}
                                placeholder="e.g. College Department"
                                maxLength={100}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Position">
                            <input required
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
                                    initials={`${(employee.firstName[0] ?? "")}${(employee.lastName[0] ?? "")}`.toUpperCase()}
                                    canEdit
                                />
                            ) : (
                                <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#cfe5d9] bg-[#f6faf8] text-[#15664f]/50">
                                    <Camera className="h-7 w-7" />
                                </span>
                            )}
                            <span className="text-center text-sm text-gray-600">
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
                                <input required
                                    name="middleName"
                                    defaultValue={v.middleName}
                                    placeholder="Type N/A if none"
                                    maxLength={50}
                                    suppressHydrationWarning
                                    className={inputClass}
                                />
                            </Field>
                            {/* Dalawang cell ito: Date of Birth at Age */}
                            <BirthdateField name="dateOfBirth" defaultValue={v.dateOfBirth} inputClass={inputClass} />
                            <Field label="Gender">
                                <select required name="gender" defaultValue={v.gender} suppressHydrationWarning className={inputClass}>
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
                    description="Used by the clinic to reach the employee."
                />
                <div className="grid gap-4 p-5 sm:grid-cols-2 md:p-6">
                    <Field label="Contact Number">
                        <input required
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
                        <input required
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
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={inputClass}
                            />
                            {/* Requirement ng password (Edit: lalabas lang kapag nagta-type ng bago) */}
                            {(mode === "create" || newPassword) && <PasswordChecklist password={newPassword} className="mt-2" />}
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

                    <div className="flex flex-col gap-4 rounded-xl border-2 border-amber-200 bg-amber-50/70 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">Confirm it&apos;s you</p>
                                <p className="mt-0.5 text-sm text-amber-800">
                                    Employee passwords are confidential. Enter your own account password to save this
                                    {mode === "create" ? " new account." : " password change."}
                                </p>
                            </div>
                        </div>
                        <div className="w-full md:max-w-xs">
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
                </div>
            </section>

            {/* Mga button: nakadikit sa ibaba habang nag-i-scroll */}
            <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-[#cfe5d9] bg-[#e7f3e2]/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-end md:-mx-8 md:px-8">
                <ConfirmLink
                    href={cancelHref}
                    title="Discard changes?"
                    message="The information you entered will not be saved."
                    confirmLabel="Discard"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
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
                    disabled={pending}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {pending ? "Saving..." : mode === "create" ? "Create Employee" : "Save Changes"}
                </ConfirmSubmit>
            </div>
        </form>
    );
}