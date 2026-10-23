"use client";

import { useActionState } from "react";
import { BadgeCheck, IdCard, Save, UserRound, X } from "lucide-react";
import { createStaff, updateStaff, type StaffState } from "@/features/clinic-staff/actions";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import ConfirmLink from "@/components/shared/confirm-link";
import SuggestInput from "@/components/shared/suggest-input";

const initialState: StaffState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

// Mga karaniwang role. Puwede pa ring mag-type ng iba.
const COMMON_ROLES = ["Clinic Nurse", "School Physician", "School Dentist", "Clinic Aide", "Head Nurse"];

const STATUSES = [
    {
        value: "active",
        label: "Active",
        hint: "Currently working at the clinic",
        checked: "peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:text-green-700 peer-checked:ring-2 peer-checked:ring-green-500/20",
        dot: "bg-green-500",
    },
    {
        value: "inactive",
        label: "Inactive",
        hint: "On leave or no longer assigned",
        checked: "peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-700 peer-checked:ring-2 peer-checked:ring-red-400/20",
        dot: "bg-red-500",
    },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
            {children}
        </label>
    );
}

// Header ng bawat card: icon + title + maikling paliwanag
function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 md:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                {icon}
            </span>
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </div>
    );
}

export type StaffValues = {
    staffId?: number;
    fullName: string;
    position: string;
    email: string;
    contact: string;
    licenseNo: string;
    status: string;
};

type Props = {
    mode: "create" | "edit";
    staff: StaffValues;
    cancelHref: string;
};

export default function StaffForm({ mode, staff, cancelHref }: Props) {
    const action = mode === "create" ? createStaff : updateStaff;
    const [state, formAction, pending] = useActionState(action, initialState);

    const { staffId, ...rest } = staff;
    const v: Record<string, string> = { ...rest, ...(state.values ?? {}) };
    const currentStatus = v.status || "active";

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            {mode === "edit" && <input type="hidden" name="staffId" value={staffId} />}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Staff information */}
                <section className={`${card} min-w-0`}>
                    <SectionHeader
                        icon={<UserRound className="h-5 w-5" />}
                        title="Staff Information"
                        description="Name and role in the clinic."
                    />
                    <div className="space-y-4 p-5 md:p-6">
                        <Field label="Full Name *">
                            <input
                                name="fullName"
                                defaultValue={v.fullName}
                                placeholder="e.g. Maria Santos"
                                maxLength={100}
                                required
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Role *">
                            <SuggestInput
                                name="position"
                                defaultValue={v.position}
                                suggestions={COMMON_ROLES.map((r) => ({ value: r }))}
                                placeholder="Select or type a role..."
                                maxLength={100}
                                required
                                className={inputClass}
                            />
                        </Field>

                        <div className="space-y-1.5">
                            <span className="block text-sm font-semibold text-gray-800">Status</span>
                            <div className="grid grid-cols-2 gap-2">
                                {STATUSES.map((s) => (
                                    <label key={s.value} className="cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value={s.value}
                                            defaultChecked={currentStatus === s.value}
                                            className="peer sr-only"
                                        />
                                        <span
                                            className={`flex h-full flex-col rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#15664f]/30 ${s.checked}`}
                                        >
                                            <span className="flex items-center gap-2 text-sm font-semibold">
                                                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                                                {s.label}
                                            </span>
                                            <span className="mt-0.5 text-xs text-gray-500">{s.hint}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact & license */}
                <section className={`${card} min-w-0`}>
                    <SectionHeader
                        icon={<IdCard className="h-5 w-5" />}
                        title="Contact & License"
                        description="Optional. How to reach them and their PRC number."
                    />
                    <div className="space-y-4 p-5 md:p-6">
                        <Field label="Email">
                            <input
                                name="email"
                                type="email"
                                autoComplete="off"
                                defaultValue={v.email}
                                placeholder="name@bcas.edu.ph"
                                maxLength={100}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Contact Number">
                            <input
                                name="contact"
                                defaultValue={v.contact}
                                placeholder="+63 917 000 0000"
                                maxLength={30}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>

                        <Field label="License / PRC No.">
                            <span className="relative block">
                                <BadgeCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    name="licenseNo"
                                    defaultValue={v.licenseNo}
                                    placeholder="e.g. RN-2019-00123"
                                    maxLength={50}
                                    suppressHydrationWarning
                                    className={`${inputClass} pl-9`}
                                />
                            </span>
                        </Field>
                    </div>
                </section>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                    title={mode === "create" ? "Save this staff member?" : "Save changes?"}
                    message={
                        mode === "create"
                            ? "Please make sure the staff details are correct before saving."
                            : "The staff member's current information will be replaced with your changes."
                    }
                    confirmLabel="Save"
                    disabled={pending}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {pending ? "Saving..." : mode === "create" ? "Add Staff" : "Save Changes"}
                </ConfirmSubmit>
            </div>
        </form>
    );
}