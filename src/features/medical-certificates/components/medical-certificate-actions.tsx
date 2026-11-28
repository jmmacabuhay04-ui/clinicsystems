"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/shared/confirm-button";
import { Archive, Download, Eye, RotateCcw, Trash2 } from "lucide-react";

type Props = {
    studentId: number;
    certId: number;
    archived: boolean;
    /** Ipakita ang Delete lang kapag hindi tugma ang file name sa estudyante */
    allowDelete?: boolean;
    /** Nurse lang: Archive, Restore, at Delete */
    canManage?: boolean;
};

const buttonClass =
    "inline-flex items-center gap-1.5 text-sm font-medium text-[#15664f] hover:underline disabled:opacity-60";
const archiveClass =
    "inline-flex items-center gap-1.5 text-sm font-medium text-[#b45309] hover:underline disabled:opacity-60";

const deleteClass =
    "inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline disabled:opacity-60";

// View, Download, at Archive/Restore ng isang medical certificate (nurse lang). Lahat may confirmation.
export default function MedicalCertificateActions({ studentId, certId, archived, allowDelete = false, canManage = true }: Props) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [, startTransition] = useTransition();
    const base = `/api/medical-certificate/${studentId}?id=${certId}`;

    async function toggleArchive() {
        setPending(true);
        setError(null);
        try {
            const res = await fetch(base, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ archived: !archived }),
            });
            if (!res.ok) {
                setError((await res.text()) || "Failed. Please try again.");
                return;
            }
            startTransition(() => router.refresh());
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setPending(false);
        }
    }

    // Permanenteng burahin (walang retention); para sa maling upload lang.
    async function removeCertificate() {
        setPending(true);
        setError(null);
        try {
            const res = await fetch(base, { method: "DELETE" });
            if (!res.ok) {
                setError((await res.text()) || "Failed. Please try again.");
                return;
            }
            startTransition(() => router.refresh());
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setPending(false);
        }
    }

    function openView() {
        window.open(`${base}&inline=1`, "_blank", "noopener,noreferrer");
    }

    function download() {
        const a = document.createElement("a");
        a.href = base;
        a.click();
    }

    return (
        <>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    openView();
                }}
            >
                <ConfirmButton
                    title="Open certificate?"
                    message="This certificate will open in a new tab."
                    confirmLabel="Open"
                    className={buttonClass}
                >
                    <Eye className="h-4 w-4" />
                    View
                </ConfirmButton>
            </form>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    download();
                }}
            >
                <ConfirmButton
                    title="Download certificate?"
                    message="This certificate will be saved to your device."
                    confirmLabel="Download"
                    className={buttonClass}
                >
                    <Download className="h-4 w-4" />
                    Download
                </ConfirmButton>
            </form>
            {canManage && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        toggleArchive();
                    }}
                >
                    <ConfirmButton
                        title={archived ? "Restore certificate?" : "Archive certificate?"}
                        message={
                            archived
                                ? "This certificate will be moved back to the active list."
                                : "This certificate will be moved to the Archived list. You can restore it later."
                        }
                        confirmLabel={archived ? "Restore" : "Archive"}
                        disabled={pending}
                        className={archiveClass}
                    >
                        {archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        {pending ? "Saving..." : archived ? "Restore" : "Archive"}
                    </ConfirmButton>
                </form>
            )}
            {allowDelete && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        removeCertificate();
                    }}
                >
                    <ConfirmButton
                        title="Delete certificate permanently?"
                        message="This permanently deletes the file, and it cannot be undone. It does not wait for the 5-year retention period. Use this only for an upload made by mistake."
                        confirmLabel="Delete"
                        danger
                        disabled={pending}
                        className={deleteClass}
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </ConfirmButton>
                </form>
            )}
            {error && <span className="self-center text-xs text-red-600">{error}</span>}
        </>
    );
}