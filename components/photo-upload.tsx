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
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    aria-label="Choose profile photo"
                    className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs text-gray-500 transition ${preview
                        ? "border-2 border-[#15664f]"
                        : "border-2 border-dashed border-gray-300 bg-gray-50 hover:border-[#15664f]"
                        }`}
                >
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                        "No photo"
                    )}
                </button>

                <div className="flex flex-col items-start gap-2">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="h-9 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                    >
                        {preview ? "Change photo" : "Upload photo"}
                    </button>
                    {preview && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                            Remove
                        </button>
                    )}
                    <p className="text-xs text-gray-500">JPG or PNG, up to {maxMB} MB</p>
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