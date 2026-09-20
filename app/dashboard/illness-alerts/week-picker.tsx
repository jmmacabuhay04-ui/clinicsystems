"use client";

import { useRouter } from "next/navigation";

type Props = {
    weeks: { value: string; label: string }[];
    current: string;
};

export default function WeekPicker({ weeks, current }: Props) {
    const router = useRouter();

    return (
        <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Week:</span>
            <select
                defaultValue={current}
                onChange={(e) => router.push(`/dashboard/illness-alerts?week=${e.target.value}`)}
                suppressHydrationWarning
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f]"
            >
                {weeks.map((w) => (
                    <option key={w.value} value={w.value}>
                        {w.label}
                    </option>
                ))}
            </select>
        </label>
    );
}