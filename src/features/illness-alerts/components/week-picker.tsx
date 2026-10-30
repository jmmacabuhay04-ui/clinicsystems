"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Option = {
    value: string; // "m:YYYY-MM" (buwan) o "w:YYYY-MM-DD" (linggo)
    label: string;
};

type Props = {
    months: Option[];
    weeks: Option[];
    current: string;
};

const selectClass =
    "h-11 min-w-0 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 disabled:opacity-60";

// Dalawang dropdown:
//   1) View: Week o Month
//   2) Aling linggo / buwan (nagbabago ang laman depende sa View)
export default function WeekPicker({ months, weeks, current }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const isMonth = current.startsWith("m:");

    function go(value: string) {
        const [kind, v] = value.split(":");
        startTransition(() => {
            // Binabasa ng page ang ?month= o ?week= at kinukuha ulit ang data
            router.push(`/dashboard/illness-alerts?${kind === "m" ? "month" : "week"}=${v}`, { scroll: false });
        });
    }

    return (
        <div className="flex w-full items-center gap-2 sm:w-auto" aria-busy={pending}>
            <label htmlFor="view" className="text-sm font-semibold text-gray-600">
                View
            </label>
            <select
                id="view"
                value={isMonth ? "month" : "week"}
                disabled={pending}
                // Pagpalit ng View: ngayong linggo o ngayong buwan ang unang ipapakita
                onChange={(e) => go(e.target.value === "month" ? months[0].value : weeks[0].value)}
                suppressHydrationWarning
                className={`${selectClass} w-28 shrink-0`}
            >
                <option value="week">Week</option>
                <option value="month">Month</option>
            </select>

            <select
                id="period"
                aria-label={isMonth ? "Month" : "Week"}
                value={current}
                disabled={pending}
                onChange={(e) => go(e.target.value)}
                suppressHydrationWarning
                // Pirming lapad para hindi gumalaw kapag nagpalit ng Week/Month
                className={`${selectClass} w-full sm:w-64`}
            >
                {(isMonth ? months : weeks).map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>

        </div>
    );
}