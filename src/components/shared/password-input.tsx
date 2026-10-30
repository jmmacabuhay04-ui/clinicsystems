"use client";

import { useRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, X } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    /** May "X" button para burahin agad ang na-type */
    clearable?: boolean;
    /** Class ng lalagyan (hal. lapad: "w-full sm:w-72") */
    wrapperClassName?: string;
};

export default function PasswordInput({ className = "", clearable = false, wrapperClassName = "", onChange, ...props }: Props) {
    const [visible, setVisible] = useState(false);
    const [hasValue, setHasValue] = useState(Boolean(props.defaultValue));
    const inputRef = useRef<HTMLInputElement>(null);
    const showClear = clearable && hasValue;

    return (
        <div className={`relative ${wrapperClassName}`}>
            <input
                {...props}
                ref={inputRef}
                type={visible ? "text" : "password"}
                onChange={(e) => {
                    setHasValue(e.target.value.length > 0);
                    onChange?.(e);
                }}
                className={`${className} ${showClear ? "pr-16" : "pr-10"}`}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                {showClear && (
                    <button
                        type="button"
                        onClick={() => {
                            const el = inputRef.current;
                            if (!el) return;
                            el.value = "";
                            setHasValue(false);
                            el.focus();
                        }}
                        aria-label="Clear password"
                        title="Clear"
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    title={visible ? "Hide password" : "Show password"}
                    className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}