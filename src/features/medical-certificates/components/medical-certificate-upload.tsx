"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/shared/confirm-button";
import { Upload } from "lucide-react";

type Props = {
    studentId: number;
    /** Pangalan at student number para sa confirmation (hal. "Juan Dela Cruz (2022-001)") */
    studentLabel: string;
};

const MAX_BYTES = 5 * 1024 * 1024;

export default function MedicalCertificateUpload({ studentId, studentLabel }: Props) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [, startTransition] = useTransition();

    // Bubukas ang file picker; awtomatikong ina-upload ang napiling file.
    async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_BYTES) {
            setError("File is too large (max 5 MB).");
            e.target.value = "";
            return;
        }

        setError(null);
        setUploading(true);
        try {
            const body = new FormData();
            body.append("file", file);
            const res = await fetch(`/api/medical-certificate/${studentId}`, { method: "POST", body });
            if (!res.ok) {
                setError((await res.text()) || "Upload failed.");
                return;
            }
            startTransition(() => router.refresh());
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    return (
        <div className="flex flex-col items-start">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    inputRef.current?.click();
                }}
            >
                <ConfirmButton
                    title="Upload certificate?"
                    message={`Upload a medical certificate for ${studentLabel}? Make sure the certificate belongs to this student. Next, you will choose a PDF, JPG, or PNG file (max 5 MB).`}
                    confirmLabel="Choose file"
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#15664f] hover:underline disabled:opacity-60"
                >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload"}
                </ConfirmButton>
            </form>
            <input
                ref={inputRef}
                type="file"
                name="file"
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                onChange={onFileChosen}
                className="hidden"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
    );
}