"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createStaff, updateStaff, type StaffState } from "./actions";
import ConfirmSubmit from "@/components/confirm-submit";
import ConfirmLink from "@/components/confirm-link";
const initialState: StaffState = {};

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

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            {mode === "edit" && <input type="hidden" name="staffId" value={staffId} />}

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Staff Details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Name *">
                        <input
                            name="fullName"
                            defaultValue={v.fullName}
                            placeholder="e.g. Nurse Maria Santos"
                            maxLength={100}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Role *">
                        <input
                            name="position"
                            defaultValue={v.position}
                            placeholder="e.g. Clinic Nurse, School Physician"
                            maxLength={100}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Email">
                        <input
                            name="email"
                            type="email"
                            defaultValue={v.email}
                            placeholder="name@bcas.edu.ph"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Contact">
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
                        <input
                            name="licenseNo"
                            defaultValue={v.licenseNo}
                            placeholder="e.g. RN-2019-00123"
                            maxLength={50}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Status">
                        <select
                            name="status"
                            defaultValue={v.status}
                            suppressHydrationWarning
                            className={inputClass}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </Field>
                </div>
            </section>

            <div className="flex justify-end gap-3">
                <Link
                    href={cancelHref}
                    className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </Link>
                <ConfirmSubmit
                    title="Save this staff member?"
                    message="Please make sure the staff details are correct before saving."
                    confirmLabel="Save"
                    className="h-10 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f]"
                >
                    Add Staff
                </ConfirmSubmit>
            </div>
        </form>
    );
}