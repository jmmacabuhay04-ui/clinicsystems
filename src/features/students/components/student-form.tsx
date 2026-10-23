"use client";
import { useActionState } from "react";
import { Camera, GraduationCap, KeyRound, Phone, Save, ShieldCheck, UserRound, X } from "lucide-react";
import { createStudent, updateStudent } from "@/features/students/actions";
import type { StudentState } from "@/features/students/types";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import ConfirmLink from "@/components/shared/confirm-link";
import BirthdateField from "@/components/shared/birthdate-field";
import PasswordInput from "@/components/shared/password-input";
import RecordAvatar from "@/components/shared/record-avatar";

const initialState: StudentState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
            {children}
            {hint && <span className="block text-xs text-gray-500">{hint}</span>}
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                {icon}
            </span>
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                {description && <p className="text-sm text-gray-500">{description}</p>}
            </div>
        </div>
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
    photoUrl?: string;
};

type Props = {
    mode: "create" | "edit";
    student: StudentValues;
    cancelHref: string;
    /** Kasalukuyang profile picture (edit lang) */
    avatar?: string | null;
};

export default function StudentForm({ mode, student, cancelHref, avatar = null }: Props) {
    const action = mode === "create" ? createStudent : updateStudent;
    const [state, formAction, pending] = useActionState(action, initialState);

    const { studentId, ...rest } = student;
    const v: Record<string, string> = { ...rest, ...(state.values ?? {}) };

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            {mode === "edit" && <input type="hidden" name="studentId" value={studentId} />}

            <div className="grid gap-6 xl:grid-cols-3">
                {/* School information */}
                <section className={`${card} min-w-0 xl:col-span-1`}>
                    <SectionHeader
                        icon={<GraduationCap className="h-5 w-5" />}
                        title="School Information"
                        description="Student number and class."
                    />
                    <div className="grid gap-4 p-5 sm:grid-cols-2 md:p-6 xl:grid-cols-1">
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
                            {mode === "edit" && studentId ? (
                                <RecordAvatar
                                    type="student"
                                    id={studentId}
                                    current={avatar}
                                    initials={`${(student.firstName[0] ?? "")}${(student.lastName[0] ?? "")}`.toUpperCase()}
                                    canEdit
                                />
                            ) : (
                                <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#cfe5d9] bg-[#f6faf8] text-[#15664f]/50">
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
                    description="Optional. Used by the clinic to reach the student."
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
                    title="Student Portal Login"
                    description={
                        mode === "create"
                            ? "The student signs in with their student number and this password."
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

                    <div className="flex flex-col gap-4 rounded-xl border-2 border-amber-200 bg-amber-50/70 p-4 md:flex-row md:items-end md:justify-between">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">Confirm it&apos;s you</p>
                                <p className="mt-0.5 text-xs text-amber-800">
                                    Student passwords are confidential. Enter your own account password to save this
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
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    <X className="h-4 w-4" />
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
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {pending ? "Saving..." : mode === "create" ? "Create Student" : "Save Changes"}
                </ConfirmSubmit>
            </div>
        </form>
    );
}