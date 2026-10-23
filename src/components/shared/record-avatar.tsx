"use client";

// Bilog na picture sa profile card ng Health Record.
// Kapag nurse (canEdit), puwedeng i-click para mag-upload, magpalit, o magtanggal ng picture.

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Check, Trash2, Upload, X } from "lucide-react";
import { removePersonPhoto, savePersonPhoto } from "@/features/students/photo-actions";

type Props = {
    type: "student" | "employee";
    id: number;
    current: string | null;
    initials: string;
    canEdit: boolean;
};

// I-crop sa gitna (square) at paliitin sa 256x256 bago i-upload
function resizeImage(file: File, size = 256): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const side = Math.min(img.width, img.height);
            const sx = (img.width - side) / 2;
            const sy = (img.height - side) / 2;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                URL.revokeObjectURL(url);
                return reject(new Error("Canvas not supported"));
            }
            ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Invalid image"));
        };
        img.src = url;
    });
}

export default function RecordAvatar({ type, id, current, initials, canEdit }: Props) {
    const [saved, setSaved] = useState<string | null>(current); // naka-save na picture
    const [pendingPhoto, setPendingPhoto] = useState<string | null>(null); // bagong pili, hindi pa naka-save
    const [menuOpen, setMenuOpen] = useState(false);
    const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
    const [busy, startTransition] = useTransition();
    const fileRef = useRef<HTMLInputElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Sundan ang bagong data galing sa server
    useEffect(() => setSaved(current), [current]);

    // Mawawala ang mensahe pagkalipas ng 3 segundo
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(null), 3000);
        return () => clearTimeout(t);
    }, [message]);

    // Isara ang menu kapag nag-click sa labas
    useEffect(() => {
        if (!menuOpen) return;
        function onDoc(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [menuOpen]);

    const shown = pendingPhoto ?? saved;

    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setMessage({ tone: "bad", text: "Please choose an image file (JPG or PNG)." });
            return;
        }
        try {
            setPendingPhoto(await resizeImage(file));
            setMessage(null);
        } catch {
            setMessage({ tone: "bad", text: "Could not read that image. Try another one." });
        }
    }

    function save() {
        if (!pendingPhoto) return;
        const photo = pendingPhoto;
        startTransition(async () => {
            const res = await savePersonPhoto(type, id, photo);
            if (res.error) {
                setMessage({ tone: "bad", text: res.error });
                return;
            }
            setSaved(photo);
            setPendingPhoto(null);
            setMessage({ tone: "ok", text: res.success ?? "Profile picture updated." });
        });
    }

    function remove() {
        setMenuOpen(false);
        if (!window.confirm("Remove this profile picture? The initials will be shown instead.")) return;
        startTransition(async () => {
            const res = await removePersonPhoto(type, id);
            if (res.error) {
                setMessage({ tone: "bad", text: res.error });
                return;
            }
            setSaved(null);
            setMessage({ tone: "ok", text: res.success ?? "Profile picture removed." });
        });
    }

    const circle = shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" className={`block h-20 w-20 rounded-full border-4 border-white bg-white object-cover shadow-md ring-2 ${type === "employee" ? "ring-amber-300" : "ring-[#15664f]/40"}`} />
    ) : (
        <span
            className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-2xl font-semibold shadow-md ring-2 ${type === "employee" ? "bg-amber-300 text-gray-900 ring-amber-300" : "bg-[#15664f] text-white ring-[#15664f]/40"
                }`}
        >
            {initials}
        </span>
    );

    if (!canEdit) return <div className="shrink-0">{circle}</div>;

    return (
        <div ref={wrapRef} className="relative flex shrink-0 flex-col items-center gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} className="hidden" />

            <button
                type="button"
                onClick={() => (pendingPhoto ? null : setMenuOpen((v) => !v))}
                title="Change profile picture"
                className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#15664f] focus-visible:ring-offset-2"
            >
                {circle}
                {!pendingPhoto && (
                    <>
                        <span
                            className={`absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow ${type === "employee" ? "bg-amber-400 text-[#14532D] ring-1 ring-amber-500" : "bg-[#15664f] text-white ring-1 ring-[#0f4d3b]"
                                }`}
                        >
                            <Camera className="h-3.5 w-3.5" />
                        </span>
                    </>
                )}
            </button>

            {/* Menu: upload / remove */}
            {menuOpen && (
                <div className="absolute left-0 top-[5.5rem] z-20 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                        type="button"
                        onClick={() => {
                            setMenuOpen(false);
                            fileRef.current?.click();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-[#eef6f2]"
                    >
                        <Upload className="h-4 w-4 text-[#15664f]" />
                        {saved ? "Change photo" : "Upload photo"}
                    </button>
                    {saved && (
                        <button
                            type="button"
                            onClick={remove}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4" />
                            Remove photo
                        </button>
                    )}
                </div>
            )}

            {/* Save / Cancel kapag may bagong pili */}
            {pendingPhoto && (
                // Nasa ilalim ng picture (hindi lumulutang) para hindi matakpan ang ibang laman
                <div className="flex gap-1.5 whitespace-nowrap">
                    <button
                        type="button"
                        onClick={save}
                        disabled={busy}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-[#15664f] px-2.5 text-xs font-semibold text-white shadow hover:bg-[#10523f] disabled:opacity-60"
                    >
                        <Check className="h-3.5 w-3.5" />
                        {busy ? "Saving..." : "Save"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setPendingPhoto(null)}
                        disabled={busy}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-semibold text-gray-700 shadow hover:bg-gray-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                    </button>
                </div>
            )}

            {message && (
                <p
                    className={`max-w-[14rem] rounded-md px-2.5 py-1.5 text-center text-xs ${message.tone === "ok" ? "bg-green-50 text-green-800 ring-1 ring-green-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"
                        }`}
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}