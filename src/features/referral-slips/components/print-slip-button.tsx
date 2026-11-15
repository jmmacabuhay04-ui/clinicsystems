"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";

// Print button sa listahan ng slip (Teacher Referrals / Gate Passes).
// Ipi-print ang naka-save na slip; kapareho ng itsura ng dating Print Slip sa form.

export type PrintableSlip = {
    slipType: "teacher" | "gate";
    studentName: string;
    studentNumber: string;
    program: string;
    yearLevel: string;
    teacherName: string;
    subject: string;
    reason: string;
    /** YYYY-MM-DD */
    date: string;
    /** HH:MM */
    time: string;
};

function longDate(value: string) {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

function to12Hour(value: string) {
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h)) return value;
    return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function SlipLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-2">
            <span className="w-40 shrink-0 font-semibold">{label}</span>
            <span className="flex-1 border-b border-gray-400">{value || " "}</span>
        </div>
    );
}

export default function PrintSlipButton({ slip }: { slip: PrintableSlip }) {
    const [printing, setPrinting] = useState(false);
    // true lang sa browser (para sa createPortal)
    const mounted = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false,
    );

    function print() {
        setPrinting(true);
        const done = () => {
            setPrinting(false);
            window.removeEventListener("afterprint", done);
        };
        window.addEventListener("afterprint", done);
        // Hintayin munang lumabas ang slip bago mag-print
        window.setTimeout(() => window.print(), 50);
    }

    const teacher = slip.slipType === "teacher";

    return (
        <>
            <button
                type="button"
                onClick={print}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#15664f] bg-white px-3 text-sm font-semibold text-[#15664f] hover:bg-[#eef6f2]"
            >
                <Printer className="h-3.5 w-3.5" />
                Print
            </button>

            {mounted &&
                printing &&
                createPortal(
                    <div id="printable-slip" className="text-black">
                        <style>{`
                            #printable-slip { display: none; }
                            @media print {
                                @page { size: A4; margin: 15mm; }
                                html, body { height: auto !important; background: #fff !important; }
                                body > *:not(#printable-slip) { display: none !important; }
                                #printable-slip { display: block !important; }
                            }
                        `}</style>
                        <div className="text-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/bcas.jpg" alt="BCAS" className="mx-auto h-20 w-20 rounded-full object-cover" />
                            <p className="mt-2 text-lg font-bold uppercase">Batangas College of Arts and Sciences</p>
                            <p className="text-sm">School Clinic</p>
                            <p className="mt-4 text-xl font-bold tracking-wide underline">{teacher ? "REFERRAL SLIP" : "GATE PASS"}</p>
                        </div>

                        <div className="mt-8 space-y-4 text-base">
                            <div className="flex gap-8">
                                <span className="flex-1">
                                    <span className="font-semibold">Date:</span> {longDate(slip.date)}
                                </span>
                                <span className="flex-1">
                                    <span className="font-semibold">Time:</span> {to12Hour(slip.time)}
                                </span>
                            </div>

                            <SlipLine label="Student Name" value={slip.studentName} />
                            <SlipLine label="Student Number" value={slip.studentNumber} />
                            <SlipLine label="Program" value={slip.program} />
                            <SlipLine label="Year Level" value={slip.yearLevel} />
                            {teacher && (
                                <>
                                    <SlipLine label="Teacher" value={slip.teacherName} />
                                    <SlipLine label="Subject / Class" value={slip.subject} />
                                </>
                            )}

                            <div>
                                <p className="font-semibold">{teacher ? "Reason for Referral" : "Reason for Gate Pass"}</p>
                                <p className="mt-2 min-h-16 whitespace-pre-wrap border-b border-gray-400 pb-2">{slip.reason}</p>
                            </div>
                        </div>

                        <div className="mt-16 flex justify-between gap-10 text-center text-sm">
                            <div className="flex-1">
                                <p className="border-t border-gray-500 pt-2">{teacher ? "Teacher's Signature" : "Clinic Staff Signature"}</p>
                            </div>
                            <div className="flex-1">
                                <p className="border-t border-gray-500 pt-2">{teacher ? "Clinic Staff Signature" : "Guard / Gate Signature"}</p>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}