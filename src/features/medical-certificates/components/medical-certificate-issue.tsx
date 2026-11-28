"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus } from "lucide-react";
import ConfirmButton from "@/components/shared/confirm-button";
import CertificatePrintSheet, { type CertificateData } from "./certificate-print-sheet";

type Props = {
    studentId: number;
    studentLabel: string;
};

// Doctor/nurse: mag-isyu ng clinic medical certificate (PDF) para sa estudyante.
export default function MedicalCertificateIssue({ studentId, studentLabel }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [purpose, setPurpose] = useState("");
    const [remarks, setRemarks] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [printData, setPrintData] = useState<CertificateData | null>(null);
    const [, startTransition] = useTransition();

    // Pagkatapos ma-issue, lumalabas agad ang print dialog ng certificate.
    useEffect(() => {
        if (!printData) return;
        const t = setTimeout(() => window.print(), 150);
        return () => clearTimeout(t);
    }, [printData]);

    async function issue() {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/medical-certificate/${studentId}?clinic=1`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ purpose, remarks }),
            });
            if (!res.ok) {
                setError((await res.text()) || `Failed (HTTP ${res.status}). Please try again.`);
                return;
            }
            const data = (await res.json()) as { certificate?: CertificateData };
            setOpen(false);
            setPurpose("");
            setRemarks("");
            if (data.certificate) setPrintData(data.certificate);
            startTransition(() => router.refresh());
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {printData && <CertificatePrintSheet data={printData} />}

            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#15664f] hover:underline"
            >
                <FilePlus className="h-4 w-4" />
                Issue Clinic Certificate
            </button>

            {open && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9998,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px",
                        backgroundColor: "rgba(0,0,0,0.45)",
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-gray-900">Issue clinic certificate</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            For {studentLabel}. The certificate is saved to this record as a PDF.
                        </p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                issue();
                            }}
                            className="mt-4 space-y-3"
                        >
                            <label className="block space-y-1">
                                <span className="text-sm font-medium text-gray-700">Purpose *</span>
                                <input
                                    required
                                    maxLength={200}
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    placeholder="e.g. School clearance"
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                />
                            </label>
                            <label className="block space-y-1">
                                <span className="text-sm font-medium text-gray-700">Remarks</span>
                                <textarea
                                    maxLength={500}
                                    rows={3}
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Optional, e.g. advised to rest for 2 days"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                            </label>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <div className="mt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <ConfirmButton
                                    title="Issue this certificate?"
                                    message={`Issue a clinic medical certificate for ${studentLabel}?`}
                                    confirmLabel="Issue"
                                    disabled={saving || !purpose.trim()}
                                    className="h-10 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#0f5140] disabled:opacity-60"
                                >
                                    {saving ? "Issuing..." : "Issue"}
                                </ConfirmButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}