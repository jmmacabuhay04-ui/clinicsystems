"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import FlashMessage from "@/components/shared/flash-message";

export type AvatarState = { error?: string; success?: string };

type Props = {
    current: string | null;
    initials: string;
    fullName: string;
    subtitle: string; // Employee Number / Student Number
    saveAction: (prev: AvatarState, formData: FormData) => Promise<AvatarState>;
    removeAction: () => void | Promise<void>;
    /** Kulay ng initials: green (student, default) o yellow (employee) */
    tone?: "student" | "employee";
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

// Camera icon (para hindi na kailangan ng ibang import)
function CameraIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
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
    tone = "student",
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
    // Nadadagdagan bawat save para lumabas ulit ang 3-second message.
    const [flashKey, setFlashKey] = useState(0);

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

    // Email: puwedeng bumaba sa "@" lang, hindi sa gitna ng salita
    const atIndex = fullName.indexOf("@");
    const namePart = atIndex > 0 ? fullName.slice(0, atIndex) : fullName;
    const domainPart = atIndex > 0 ? fullName.slice(atIndex) : "";

    return (
        <div className="rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
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
                <div className="relative h-16 w-16 shrink-0 md:h-20 md:w-20">
                    <button
                        type="button"
                        onClick={() => setShowCamera((v) => !v)}
                        aria-label="Profile picture options"
                        aria-expanded={showCamera}
                        title="Change profile picture"
                        className={`block h-full w-full overflow-hidden rounded-full shadow-md ring-2 focus:outline-none focus-visible:ring-[#15664f] focus-visible:ring-offset-2 ${tone === "employee" ? "ring-amber-300" : "ring-[#15664f]/40"
                            }`}
                    >
                        {preview ? (
                            <img src={preview} alt="" className="h-full w-full rounded-full border-2 border-white bg-white object-cover" />
                        ) : (
                            <div
                                className={`flex h-full w-full items-center justify-center rounded-full text-xl font-semibold md:text-2xl ${tone === "employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                    }`}
                            >
                                {initials}
                            </div>
                        )}
                    </button>

                    {/* Maliit na camera badge na laging kita */}
                    <button
                        type="button"
                        onClick={openPicker}
                        aria-label="Choose a photo"
                        title="Choose a photo"
                        className={`absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow ${tone === "employee"
                            ? "bg-amber-400 text-[#14532D] ring-1 ring-amber-500 hover:bg-amber-300"
                            : "bg-[#15664f] text-white ring-1 ring-[#0f4d3b] hover:bg-[#10523f]"
                            }`}
                    >
                        <CameraIcon className="h-3.5 w-3.5" />
                    </button>

                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-gray-900 [overflow-wrap:anywhere] md:text-2xl">
                        {namePart}
                        {domainPart && (
                            <>
                                <wbr />
                                {domainPart}
                            </>
                        )}
                    </p>
                    <p className="break-words text-sm capitalize text-gray-600 md:text-base">{subtitle}</p>

                    {(hasNewPick || showCamera) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {hasNewPick ? (
                                <>
                                    <form
                                        ref={saveFormRef}
                                        action={(formData) => {
                                            setFlashKey((k) => k + 1);
                                            formAction(formData);
                                        }}
                                    >
                                        <input type="hidden" name="avatar" value={data} />
                                        <button
                                            type="button"
                                            onClick={() => setConfirming("save")}
                                            disabled={pending}
                                            className="inline-flex h-8 items-center rounded-md bg-[#15664f] px-3 text-xs font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                                        >
                                            {pending ? "Saving..." : "Save picture"}
                                        </button>
                                    </form>
                                    <button
                                        type="button"
                                        onClick={cancelPick}
                                        disabled={pending}
                                        className="inline-flex h-8 items-center rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={openPicker}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#15664f] px-3 text-xs font-semibold text-white hover:bg-[#10523f]"
                                    >
                                        <CameraIcon className="h-3.5 w-3.5" />
                                        {preview ? "Change photo" : "Upload photo"}
                                    </button>
                                    {preview && (
                                        <button
                                            type="button"
                                            onClick={() => setConfirming("remove")}
                                            disabled={removing}
                                            className="inline-flex h-8 items-center rounded-md border border-red-300 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                                        >
                                            {removing ? "Removing..." : "Remove photo"}
                                        </button>
                                    )}
                                </>
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
                <FlashMessage
                    key={flashKey}
                    className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                >
                    {state.success}
                </FlashMessage>
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