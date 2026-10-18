"use client";

import { useActionState, useRef, useState } from "react";
import { saveAvatar, removeAvatar, type AvatarState } from "./actions";

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

export default function AvatarForm({
    current,
    username,
}: {
    current: string | null;
    username: string;
}) {
    const [state, formAction, pending] = useActionState(saveAvatar, initialState);
    const [preview, setPreview] = useState<string | null>(current);
    const [data, setData] = useState("");
    const [localError, setLocalError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

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

    return (
        <div className="max-w-md space-y-4">
            {(localError || state.error) && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {localError || state.error}
                </p>
            )}
            {state.success && !localError && (
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {state.success}
                </p>
            )}

            <div className="flex items-center gap-4">
                {preview ? (
                    <img
                        src={preview}
                        alt="Profile picture"
                        className="h-20 w-20 rounded-full object-cover ring-2 ring-[#15664f]/30"
                    />
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#14532D] text-2xl font-semibold text-white">
                        {username.charAt(0).toUpperCase()}
                    </div>
                )}

                <div className="space-y-2">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={onPick}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="h-10 rounded-lg border border-[#15664f] px-4 text-sm font-medium text-[#15664f] hover:bg-[#15664f]/5"
                    >
                        Choose Photo
                    </button>
                    <p className="text-xs text-gray-600">JPG, PNG, or WebP. It will be cropped to a square.</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <form action={formAction}>
                    <input type="hidden" name="avatar" value={data} />
                    <button
                        type="submit"
                        disabled={pending || !data}
                        className="h-11 rounded-lg bg-[#15664f] px-5 font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                    >
                        {pending ? "Saving..." : "Save Picture"}
                    </button>
                </form>

                {current && (
                    <form action={removeAvatar}>
                        <button
                            type="submit"
                            className="h-11 rounded-lg border border-red-200 bg-red-50 px-5 text-sm font-medium text-red-700 hover:bg-red-100"
                        >
                            Remove
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}   