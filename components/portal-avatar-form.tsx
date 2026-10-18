"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

export type AvatarState = { error?: string; success?: string };

type Props = {
    current: string | null;
    initials: string;
    fullName: string;
    subtitle: string; // Employee Number / Student Number
    saveAction: (prev: AvatarState, formData: FormData) => Promise<AvatarState>;
    removeAction: () => void | Promise<void>;
};

const initialState: AvatarState = {};

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

type ConfirmKind = "save" | "remove" | null;

const confirmCopy = {
    save: {
        title: "Save profile picture?",
        message: "Your current profile picture will be replaced with the new one.",
        confirmLabel: "Save",
        confirmClass: "bg-[#15664f] hover:bg-[#10523f]",
    },
    remove: {
        title: "Remove profile picture?",
        message: "Your profile picture will be removed and your initials will be shown instead.",
        confirmLabel: "Remove",
        confirmClass: "bg-red-600 hover:bg-red-700",
    },
} as const;

export default function PortalAvatarForm({
    current,
    initials,
    fullName,
    subtitle,
    saveAction,
    removeAction,
}: Props) {
    const [state, formAction, pending] = useActionState(saveAction, initialState);
    const [removing, startRemove] = useTransition();
    const [saved, setSaved] = useState<string | null>(current); // kung ano ang naka-save na
    const [preview, setPreview] = useState<string | null>(current); // kung ano ang nakikita
    const [data, setData] = useState(""); // bagong piniling picture na hindi pa naka-save
    const [localError, setLocalError] = useState("");
    const [confirming, setConfirming] = useState<ConfirmKind>(null);
    const [showCamera, setShowCamera] = useState(false); // lalabas ang camera kapag na-click ang profile
    const fileRef = useRef<HTMLInputElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const saveFormRef = useRef<HTMLFormElement>(null);

    // Kapag nag-success ang save, ituring na naka-save na ang preview
    useEffect(() => {
        if (state.success) {
            setSaved(preview);
            setData("");
            if (fileRef.current) fileRef.current.value = "";
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    // Isara ang camera kapag nag-click sa labas ng buong header row
    useEffect(() => {
        if (!showCamera) return;
        function onDocClick(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setShowCamera(false);
            }
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [showCamera]);

    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        setLocalError("");
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setLocalError("Please choose an image file (JPG or PNG).");
            return;
        }
        try {
            const resized = await resizeImage(file);
            setPreview(resized);
            setData(resized);
        } catch {
            setLocalError("Could not read that image. Try another one.");
        }
    }

    function openPicker() {
        setShowCamera(false);
        fileRef.current?.click();
    }

    function cancelPick() {
        setPreview(saved);
        setData("");
        setLocalError("");
        if (fileRef.current) fileRef.current.value = "";
    }

    function doRemove() {
        const before = saved;
        setLocalError("");
        setShowCamera(false);
        // Agad mawala ang picture sa screen
        setPreview(null);
        setSaved(null);
        setData("");
        startRemove(async () => {
            try {
                await removeAction();
            } catch (err) {
                // Hayaan ang Next.js ang mag-handle ng redirect
                const digest = (err as { digest?: string })?.digest;
                if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
                // Kung pumalya, ibalik ang picture at ipakita ang error
                setPreview(before);
                setSaved(before);
                setLocalError("Could not remove the picture. Please try again.");
            }
        });
    }

    function onConfirm() {
        const kind = confirming;
        setConfirming(null);
        if (kind === "save") saveFormRef.current?.requestSubmit();
        if (kind === "remove") doRemove();
    }

    const copy = confirming ? confirmCopy[confirming] : null;
    const hasNewPick = !!data;

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {/* Ang buong row ang "loob"; kasama ang Remove button para hindi magsara ang menu */}
            <div ref={wrapRef} className="flex items-center gap-4">
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onPick}
                    className="hidden"
                />

                {/* I-click ang profile para lumabas ang camera */}
                <div className="relative h-16 w-16 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowCamera((v) => !v)}
                        aria-label="Profile picture options"
                        aria-expanded={showCamera}
                        className="block h-16 w-16 overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#15664f] focus-visible:ring-offset-2"
                    >
                        {preview ? (
                            <img src={preview} alt="" className="h-16 w-16 rounded-full object-cover" />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#15664f] text-xl font-semibold text-white">
                                {initials}
                            </div>
                        )}
                    </button>

                    {showCamera && (
                        <button
                            type="button"
                            onClick={openPicker}
                            aria-label="Choose a photo"
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 hover:bg-black/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-7 w-7 text-white"
                                aria-hidden="true"
                            >
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="break-all text-lg font-semibold text-gray-900 md:text-2xl">{fullName}</p>
                    <p className="break-words text-md text-gray-600">{subtitle}</p>

                    {(hasNewPick || (showCamera && preview)) && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {hasNewPick ? (
                                <>
                                    <form ref={saveFormRef} action={formAction}>
                                        <input type="hidden" name="avatar" value={data} />
                                        <button
                                            type="button"
                                            onClick={() => setConfirming("save")}
                                            disabled={pending}
                                            className="rounded-md bg-[#15664f] px-3 py-1 text-xs font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                                        >
                                            {pending ? "Saving..." : "Save picture"}
                                        </button>
                                    </form>
                                    <button
                                        type="button"
                                        onClick={cancelPick}
                                        disabled={pending}
                                        className="text-xs font-medium text-gray-600 hover:underline disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirming("remove")}
                                    disabled={removing}
                                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                                >
                                    {removing ? "Removing..." : "Remove photo"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {(localError || state.error) && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {localError || state.error}
                </p>
            )}
            {state.success && !localError && !hasNewPick && (
                <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {state.success}
                </p>
            )}

            {copy && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="avatar-confirm-title"
                    onClick={() => setConfirming(null)}
                    onKeyDown={(e) => e.key === "Escape" && setConfirming(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="avatar-confirm-title" className="text-lg font-semibold text-gray-900">
                            {copy.title}
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">{copy.message}</p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setConfirming(null)}
                                className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`h-10 rounded-lg px-4 text-sm font-semibold text-white ${copy.confirmClass}`}
                            >
                                {copy.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}