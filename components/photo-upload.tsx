"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
    /** Existing photo URL (edit mode). */
    defaultUrl?: string;
    /** Form field name for the file input. */
    name?: string;
    maxMB?: number;
};

const ACCEPT = ["image/jpeg", "image/png"];

function CameraIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a1 1 0 0 0 .8-.4l.9-1.2A1 1 0 0 1 9.2 4h5.6a1 1 0 0 1 .8.4l.9 1.2a1 1 0 0 0 .8.4h1.2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
            <circle cx="12" cy="12.5" r="3.5" />
        </svg>
    );
}

export default function PhotoUpload({ defaultUrl, name = "photo", maxMB = 5 }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(defaultUrl || null);
    const [removed, setRemoved] = useState(false);
    const [error, setError] = useState("");

    // Free the temporary blob URL when it changes or on unmount.
    useEffect(() => {
        return () => {
            if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        setError("");
        if (!file) return;

        if (!ACCEPT.includes(file.type)) {
            setError("Please choose a JPG or PNG image.");
            e.target.value = "";
            return;
        }
        if (file.size > maxMB * 1024 * 1024) {
            setError(`Image must be ${maxMB} MB or smaller.`);
            e.target.value = "";
            return;
        }
        setPreview(URL.createObjectURL(file));
        setRemoved(false);
    }

    function onRemove() {
        if (inputRef.current) inputRef.current.value = "";
        setPreview(null);
        setRemoved(true);
        setError("");
    }

    return (
        <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">Profile Photo</span>

            <div className="flex items-center gap-4">
                {/* Same avatar as the account header on the Settings page:
                    a dark green circle with a white camera icon. */}
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    aria-label={preview ? "Change profile photo" : "Choose profile photo"}
                    title={preview ? "Change photo" : "Upload photo"}
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0b2e22] text-white transition hover:bg-[#10412f] focus:outline-none focus:ring-2 focus:ring-[#15664f]/40"
                >
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                        <CameraIcon />
                    )}
                </button>

                <div className="space-y-1">
                    <p className="text-xs text-gray-500">JPG or PNG, up to {maxMB} MB</p>
                    {preview && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="text-xs font-medium text-red-700 hover:underline"
                        >
                            Remove photo
                        </button>
                    )}
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                name={name}
                accept="image/png,image/jpeg"
                onChange={onChange}
                className="hidden"
            />
            {/* Tells the server action to delete the saved photo (edit mode). */}
            {removed && defaultUrl && <input type="hidden" name="removePhoto" value="1" />}
        </div>
    );
}