"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Week = {
    value: string;
    label: string;
};

type Props = {
    weeks: Week[];
    current: string;
};

export default function WeekPicker({ weeks, current }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    function onChange(value: string) {
        startTransition(() => {
            // The page reads ?week= and re-runs its query on the server.
            router.push(`/dashboard/illness-alerts?week=${value}`);
        });
    }

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="week" className="text-sm font-medium text-[#15664f]">
                Week:
            </label>

            <select
                id="week"
                value={current}
                disabled={pending}
                onChange={(e) => onChange(e.target.value)}
                suppressHydrationWarning
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 disabled:opacity-60"
            >
                {weeks.map((w) => (
                    <option key={w.value} value={w.value}>
                        {w.label}
                    </option>
                ))}
            </select>

            {pending ? <span className="text-xs text-gray-500">Loading…</span> : null}
        </div>
    );
}