"use client";

import { useActionState } from "react";
import { logVisitor, type VisitorState } from "./actions";

const initialState: VisitorState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-700">{label}</span>
            {children}
        </label>
    );
}

type Props = {
    today: string;
    timeNow: string;
};

export default function VisitorForm({ today, timeNow }: Props) {
    const [state, formAction, pending] = useActionState(logVisitor, initialState);

    return (
        <form action={formAction} className="space-y-5">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}
            {state.success && (
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {state.success}
                </p>
            )}

            <Field label="Visitor Name">
                <input
                    name="visitorName"
                    placeholder="Enter visitor name"
                    maxLength={100}
                    required
                    suppressHydrationWarning
                    className={inputClass}
                />
            </Field>

            <Field label="Purpose of Visit">
                <input
                    name="purpose"
                    placeholder="e.g., Parent visit, Guardian meeting"
                    maxLength={150}
                    required
                    suppressHydrationWarning
                    className={inputClass}
                />
            </Field>

            <Field label="Relation to Student">
                <input
                    name="relation"
                    placeholder="e.g., Parent, Guardian, Relative"
                    maxLength={50}
                    suppressHydrationWarning
                    className={inputClass}
                />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date">
                    <input
                        name="visitDate"
                        type="date"
                        defaultValue={today}
                        required
                        suppressHydrationWarning
                        className={inputClass}
                    />
                </Field>

                <Field label="Time In">
                    <input
                        name="timeIn"
                        type="time"
                        defaultValue={timeNow}
                        required
                        suppressHydrationWarning
                        className={inputClass}
                    />
                </Field>
            </div>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className="h-11 w-full rounded-lg bg-[#15664f] font-semibold text-white transition-colors hover:bg-[#10523f] disabled:opacity-60"
            >
                {pending ? "Saving..." : "Log Visitor"}
            </button>
        </form>
    );
}