"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
    name: string;
    label: string;
    required?: boolean;
    placeholder?: string;
    /** "amber" matches the yellow confirmation boxes, "gray" the white cards. */
    tone?: "gray" | "amber";
    /** Start with the password visible (useful for temporary passwords). */
    defaultVisible?: boolean;
    hint?: string;
};

export default function PasswordField({
    name,
    label,
    required = false,
    placeholder,
    tone = "gray",
    defaultVisible = false,
    hint,
}: Props) {
    const [visible, setVisible] = useState(defaultVisible);

    const border = tone === "amber" ? "border-amber-300" : "border-gray-300";
    const labelColor = tone === "amber" ? "text-amber-900" : "text-gray-700";

    return (
        <div>
            <label className={`block text-sm font-medium ${labelColor}`}>{label}</label>

            <div className="relative mt-1">
                <input
                    type={visible ? "text" : "password"}
                    name={name}
                    required={required}
                    placeholder={placeholder}
                    autoComplete="new-password"
                    data-lpignore="true"
                    className={`w-full rounded-lg border ${border} bg-white py-2 pl-3 pr-10 text-sm outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20`}
                />

                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    title={visible ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>

            {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
        </div>
    );
}