"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Activity, ClipboardCheck, HeartPulse, Ruler, Save, Thermometer, Weight, X } from "lucide-react";
import { updateEmployeeRecord, type RecordState } from "@/features/employee-health-records/record-actions";
import ConfirmButton from "@/components/shared/confirm-button";
import SuggestInput from "@/components/shared/suggest-input";

const initialState: RecordState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

// Mga karaniwang sakit. Puwede pa ring mag-type ng iba.
const COMMON_COMPLAINTS = [
    "Fever",
    "Headache",
    "Stomachache",
    "Cough and colds",
    "Dizziness",
    "Toothache",
    "Menstrual cramps",
    "Allergy",
    "Wound / Injury",
    "Asthma attack",
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

// Input na may icon sa kaliwa at unit sa kanan (hal. "cm", "kg")
function VitalInput({
    label,
    icon,
    tint,
    unit,
    children,
}: {
    label: string;
    icon: React.ReactNode;
    tint: string;
    unit?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span className={`flex h-6 w-6 items-center justify-center rounded-md ${tint}`}>{icon}</span>
                {label}
            </span>
            <span className="relative block">
                {children}
                {unit && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                        {unit}
                    </span>
                )}
            </span>
        </label>
    );
}

export type EditRecordValues = {
    recordId: number;
    employeeNumber: string;
    visitDate: string;
    complaint: string;
    actionTaken: string;
    attendingStaff: string;
    height: string;
    weight: string;
    heartRate: string;
    bloodPressure: string;
    temperature: string;
};

export default function EmployeeEditForm({ record, cancelHref }: { record: EditRecordValues; cancelHref: string }) {
    const [state, formAction, pending] = useActionState(updateEmployeeRecord, initialState);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { recordId, employeeNumber, ...rest } = record;
    const sv = state.values ?? {};
    // Ibinabalik ng action ang heightCm/weightKg; i-map sa height/weight ng form
    const v: Record<string, string> = {
        ...rest,
        ...sv,
        ...(sv.heightCm !== undefined ? { height: sv.heightCm } : {}),
        ...(sv.weightKg !== undefined ? { weight: sv.weightKg } : {}),
    };
    const [actionLength, setActionLength] = useState((v.actionTaken ?? "").length);

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            <input type="hidden" name="recordId" value={record.recordId} />
            <input type="hidden" name="employeeNumber" value={record.employeeNumber} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                {/* Visit details */}
                <section className={`${card} min-w-0`}>
                    <SectionHeader
                        icon={<ClipboardCheck className="h-5 w-5" />}
                        title="Visit Details"
                        description="When the employee came in and what was done."
                    />
                    <div className="space-y-4 p-5 md:p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Visit Date *">
                                <input
                                    name="visitDate"
                                    type="date"
                                    defaultValue={v.visitDate}
                                    required
                                    suppressHydrationWarning
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Attending Staff">
                                <input
                                    name="attendingStaff"
                                    defaultValue={v.attendingStaff}
                                    placeholder="e.g. Nurse Reyes"
                                    maxLength={100}
                                    suppressHydrationWarning
                                    className={inputClass}
                                />
                            </Field>
                        </div>

                        <Field label="Complaint *">
                            <SuggestInput
                                name="complaint"
                                defaultValue={v.complaint}
                                suggestions={COMMON_COMPLAINTS.map((c) => ({ value: c }))}
                                placeholder="Select or type a complaint..."
                                maxLength={255}
                                required
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Action Taken / Treatment">
                            <textarea
                                name="actionTaken"
                                defaultValue={v.actionTaken}
                                onChange={(e) => setActionLength(e.target.value.length)}
                                rows={4}
                                maxLength={255}
                                placeholder="e.g. Given paracetamol, advised to rest"
                                suppressHydrationWarning
                                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                            />
                            <span className="block text-right text-xs text-gray-400">{actionLength}/255</span>
                        </Field>
                    </div>
                </section>

                {/* Vital signs */}
                <section className={`${card} min-w-0`}>
                    <SectionHeader
                        icon={<HeartPulse className="h-5 w-5" />}
                        title="Vital Signs"
                        description="Optional. Leave blank if not taken."
                    />
                    <div className="grid gap-4 p-5 sm:grid-cols-2 md:p-6">
                        <VitalInput label="Height" unit="cm" tint="bg-[#eef6f2] text-[#15664f]" icon={<Ruler className="h-3.5 w-3.5" />}>
                            <input
                                name="heightCm"
                                type="number"
                                step="0.1"
                                defaultValue={v.height}
                                placeholder="0.0"
                                suppressHydrationWarning
                                className={`${inputClass} pr-10`}
                            />
                        </VitalInput>
                        <VitalInput label="Weight" unit="kg" tint="bg-amber-50 text-amber-700" icon={<Weight className="h-3.5 w-3.5" />}>
                            <input
                                name="weightKg"
                                type="number"
                                step="0.1"
                                defaultValue={v.weight}
                                placeholder="0.0"
                                suppressHydrationWarning
                                className={`${inputClass} pr-10`}
                            />
                        </VitalInput>
                        <VitalInput label="Heart Rate" unit="bpm" tint="bg-rose-50 text-rose-600" icon={<HeartPulse className="h-3.5 w-3.5" />}>
                            <input
                                name="heartRate"
                                type="number"
                                step="1"
                                defaultValue={v.heartRate}
                                placeholder="0"
                                suppressHydrationWarning
                                className={`${inputClass} pr-12`}
                            />
                        </VitalInput>
                        <VitalInput label="Blood Pressure" unit="mmHg" tint="bg-blue-50 text-blue-700" icon={<Activity className="h-3.5 w-3.5" />}>
                            <input
                                name="bloodPressure"
                                defaultValue={v.bloodPressure}
                                placeholder="110/70"
                                suppressHydrationWarning
                                className={`${inputClass} pr-14`}
                            />
                        </VitalInput>
                        <VitalInput label="Temperature" unit="°C" tint="bg-orange-50 text-orange-600" icon={<Thermometer className="h-3.5 w-3.5" />}>
                            <input
                                name="temperature"
                                type="number"
                                step="0.1"
                                defaultValue={v.temperature}
                                placeholder="36.5"
                                suppressHydrationWarning
                                className={`${inputClass} pr-10`}
                            />
                        </VitalInput>
                    </div>
                </section>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Link
                    href={cancelHref}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    <X className="h-4 w-4" />
                    Cancel
                </Link>
                <ConfirmButton
                    title="Save changes?"
                    message="Save your changes to this health record? The existing information will be replaced."
                    confirmLabel="Save"
                    disabled={pending}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {pending ? "Saving..." : "Save Changes"}
                </ConfirmButton>
            </div>
        </form>
    );
}