"use client";

import { useActionState, useState } from "react";
import { LogIn } from "lucide-react";
import { logVisitor, type VisitorState } from "@/features/visitor-logs/actions";
import SuggestInput from "@/components/shared/suggest-input";
import FlashMessage from "@/components/shared/flash-message";

const initialState: VisitorState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

// Mga karaniwang sagot. Puwede pa ring mag-type ng iba.
const COMMON_PURPOSES = [
    "Parent visit",
    "Guardian meeting",
    "Fetch student",
    "Bring medicine",
    "Follow-up consultation",
    "Inquiry",
];
const COMMON_RELATIONS = ["Parent", "Guardian", "Sibling", "Relative", "Other"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
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
    // Nadadagdagan bawat submit, para lumabas ulit ang 3-second message
    // at para malinis ang mga field pagkatapos mag-save.
    const [submitKey, setSubmitKey] = useState(0);

    return (
        <form
            action={(formData) => {
                setSubmitKey((k) => k + 1);
                formAction(formData);
            }}
            className="space-y-5"
        >
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}
            {state.success && !state.error && <FlashMessage key={submitKey}>{state.success}</FlashMessage>}

            <Field label="Visitor Name *">
                <input
                    name="visitorName"
                    placeholder="Enter visitor name"
                    maxLength={100}
                    required
                    autoComplete="off"
                    suppressHydrationWarning
                    className={inputClass}
                />
            </Field>

            <Field label="Purpose of Visit *">
                <SuggestInput
                    key={`purpose-${submitKey}`}
                    name="purpose"
                    suggestions={COMMON_PURPOSES.map((p) => ({ value: p }))}
                    placeholder="Select or type the purpose..."
                    maxLength={150}
                    required
                    className={inputClass}
                />
            </Field>

            <Field label="Relation to Student">
                <SuggestInput
                    key={`relation-${submitKey}`}
                    name="relation"
                    suggestions={COMMON_RELATIONS.map((r) => ({ value: r }))}
                    placeholder="Select or type the relation..."
                    maxLength={50}
                    className={inputClass}
                />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date *">
                    <input
                        name="visitDate"
                        type="date"
                        defaultValue={today}
                        required
                        suppressHydrationWarning
                        className={inputClass}
                    />
                </Field>

                <Field label="Time In *">
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
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10523f] disabled:opacity-60"
            >
                <LogIn className="h-4 w-4" />
                {pending ? "Saving..." : "Log Visitor"}
            </button>
        </form>
    );
}