"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Search, Send, X } from "lucide-react";
import { issueSlip, type SlipState } from "@/features/referral-slips/actions";
import FlashMessage from "@/components/shared/flash-message";
import { ComplaintSelect } from "@/components/shared/tab-select";

const initialState: SlipState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const readonlyClass =
    "h-11 w-full rounded-lg border border-[#cfe5d9] bg-[#f6faf8] px-3 text-sm font-medium text-gray-800";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
            {children}
        </label>
    );
}

export type StudentOption = {
    student_number: string;
    last_name: string;
    first_name: string;
    program: string | null;
    grade_level: string | null;
};

type Props = {
    slipType: "teacher" | "gate";
    students: StudentOption[];
    today: string;
    timeNow: string;
};

// Handang text para sa karaniwang kaso. Pagpindot: idinadagdag sa Reason (puwede pang i-edit).
const REFERRAL_TEMPLATES = [
    { label: "Fever", text: "Student has a fever and feels warm to the touch." },
    { label: "Flu", text: "Student shows flu-like symptoms (fever, body aches, and weakness)." },
    { label: "Cough & Colds", text: "Student has cough and colds (runny nose and sneezing)." },
    { label: "Sore Throat", text: "Student complains of a sore throat and pain when swallowing." },
    { label: "Headache", text: "Student complains of a headache and cannot focus in class." },
    { label: "Stomachache", text: "Student complains of stomach pain." },
    { label: "Dizziness", text: "Student feels dizzy and lightheaded." },
    { label: "Toothache", text: "Student complains of a toothache." },
    { label: "Minor Injury", text: "Student has a minor injury and needs first aid." },
] as const;

const GATE_PASS_TEMPLATES = [
    { label: "Fever", text: "Student has a fever and is advised to go home and rest." },
    { label: "Flu", text: "Student has flu-like symptoms and is advised to go home and rest." },
    { label: "Cough & Colds", text: "Student has cough and colds and is advised to go home to avoid spreading it." },
    { label: "Check-up", text: "Student is released to a parent/guardian for a medical check-up." },
    { label: "Needs Rest", text: "After clinic assessment, the student needs to rest at home." },
] as const;

export default function ReferralForm({ slipType, students, today, timeNow }: Props) {
    const [state, formAction, pending] = useActionState(issueSlip, initialState);
    const [query, setQuery] = useState("");
    const [teacherName, setTeacherName] = useState("");
    const [subject, setSubject] = useState("");
    const [reason, setReason] = useState("");
    const [selected, setSelected] = useState<StudentOption | null>(null);
    const [open, setOpen] = useState(false);
    const [submitKey, setSubmitKey] = useState(0);
    const boxRef = useRef<HTMLDivElement>(null);

    // Isara ang dropdown kapag nag-click sa labas
    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const match = selected;

    const term = query.trim().toLowerCase();
    const results = students
        .filter(
            (s) =>
                !term ||
                s.student_number.toLowerCase().includes(term) ||
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
                `${s.last_name} ${s.first_name}`.toLowerCase().includes(term)
        )
        .slice(0, 8);

    function pick(s: StudentOption) {
        setSelected(s);
        setQuery(`${s.first_name} ${s.last_name}`);
        setOpen(false);
    }

    function clearStudent() {
        setSelected(null);
        setQuery("");
    }

    const fullName = match ? `${match.first_name} ${match.last_name}` : "";
    // Hiwalay ang Program at Year Level
    const program = match?.program ?? "";
    const yearLevel = match?.grade_level ?? "";

    return (
        <>
            <form
                action={(formData) => {
                    setSubmitKey((k) => k + 1);
                    formAction(formData);
                }}
                // Huwag magmungkahi ang browser ng mga dating na-type (autofill bubble)
                autoComplete="off"
                className="space-y-5"
            >
                {state.error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {state.error}
                    </p>
                )}
                {state.success && !state.error && <FlashMessage key={submitKey}>{state.success}</FlashMessage>}

                <input type="hidden" name="slipType" value={slipType} />
                <input type="hidden" name="slipDate" value={today} />
                <input type="hidden" name="timeIssued" value={timeNow} />
                <input type="hidden" name="studentNumber" value={match?.student_number ?? ""} />

                <div ref={boxRef} className="relative space-y-1.5">
                    <span className="block text-sm font-semibold text-gray-800">Student *</span>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                        <input
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelected(null);
                                setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            placeholder="Search student name or number..."
                            autoComplete="off"
                            suppressHydrationWarning
                            className={`${inputClass} pl-9 pr-9 ${selected ? "border-[#15664f] bg-[#eef6f2]" : ""}`}
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={clearStudent}
                                aria-label="Clear student"
                                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {open && !selected && (
                        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            {results.length === 0 && (
                                <li className="px-3 py-3 text-center text-sm text-gray-600">No students found.</li>
                            )}
                            {results.map((s) => (
                                <li key={s.student_number}>
                                    <button
                                        type="button"
                                        onClick={() => pick(s)}
                                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#eef6f2]"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                            {`${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-gray-900">
                                                {s.first_name} {s.last_name}
                                            </span>
                                            <span className="block truncate text-sm text-gray-600">
                                                {s.student_number}
                                                {s.program || s.grade_level
                                                    ? ` · ${[s.program, s.grade_level].filter(Boolean).join(" ")}`
                                                    : ""}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {selected && (
                        <p className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f]">
                            <Check className="h-3.5 w-3.5" /> Student selected
                        </p>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full Name">
                        <input value={fullName} readOnly className={readonlyClass} />
                    </Field>
                    <Field label="Student Number">
                        <input value={match?.student_number ?? ""} readOnly className={readonlyClass} />
                    </Field>
                    <Field label="Program">
                        <input value={program} readOnly className={readonlyClass} />
                    </Field>
                    <Field label="Year Level">
                        <input value={yearLevel} readOnly className={readonlyClass} />
                    </Field>
                </div>

                {slipType === "teacher" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Teacher Name *">
                            <input
                                name="teacherName"
                                autoComplete="off"
                                value={teacherName}
                                onChange={(e) => setTeacherName(e.target.value)}
                                placeholder="Enter teacher name"
                                maxLength={100}
                                className={inputClass}
                                required
                            />
                        </Field>
                        <Field label="Subject/Class *">
                            <input
                                name="subject"
                                autoComplete="off"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Enter subject or class"
                                maxLength={100}
                                className={inputClass}
                                required
                            />
                        </Field>
                    </div>
                )}

                <Field
                    label={
                        slipType === "teacher" ? "Reason for referral / Student's complaint" : "Reason for gate pass"
                    }
                >
                    {/* Select ng karaniwang complaint: puwedeng pumili ng ilan; idinadagdag ang handang text sa ibaba */}
                    <ComplaintSelect
                        templates={slipType === "teacher" ? REFERRAL_TEMPLATES : GATE_PASS_TEMPLATES}
                        reason={reason}
                        onToggle={(text) =>
                            setReason((cur) => {
                                if (cur.includes(text)) return cur.replace(text, "").replace(/\s{2,}/g, " ").trim();
                                const next = cur.trim() ? `${cur.trim()} ${text}` : text;
                                return next.slice(0, 500);
                            })
                        }
                    />
                    <textarea
                        name="reason"
                        autoComplete="off"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        maxLength={500}
                        placeholder={
                            slipType === "teacher"
                                ? "Select a common complaint above or describe the reason for clinic referral"
                                : "Select a common reason above or describe why the student is being released"
                        }
                        suppressHydrationWarning
                        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                    />
                    <span className="block text-right text-sm text-gray-600">{reason.length}/500</span>
                </Field>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={pending || !match}
                        suppressHydrationWarning
                        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10523f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                        {pending ? "Issuing..." : slipType === "teacher" ? "Issue Referral Slip" : "Issue Gate Pass"}
                    </button>
                </div>

                {!match && <p className="text-sm text-gray-600">Select a student from the list to enable issuing.</p>}
            </form>
        </>
    );
}