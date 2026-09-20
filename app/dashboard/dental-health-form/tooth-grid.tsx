import { TOOTH_ROWS } from "./chart-data";

export type ChartMap = Record<string, { t?: string; e?: string } | undefined>;

function ToothIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#15664f]" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <ellipse cx="12" cy="12" rx="4.5" ry="10" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <ellipse cx="12" cy="12" rx="10" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </svg>
    );
}

function Cell({
    name,
    value,
    readOnly,
}: {
    name: string;
    value: string;
    readOnly: boolean;
}) {
    if (readOnly) {
        return (
            <div className="flex h-8 w-12 items-center justify-center rounded border border-gray-300 bg-gray-50 text-[11px] font-semibold text-gray-900">
                {value}
            </div>
        );
    }
    return (
        <input
            name={name}
            defaultValue={value}
            list="dental-codes"
            maxLength={4}
            autoComplete="off"
            suppressHydrationWarning
            className="h-8 w-12 rounded border border-gray-300 bg-white text-center text-[11px] font-semibold uppercase text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
        />
    );
}

function Tooth({
    number,
    chart,
    readOnly,
}: {
    number: number;
    chart: ChartMap;
    readOnly: boolean;
}) {
    const key = String(number);
    const entry = chart[key] ?? {};
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="h-4 text-[11px] font-semibold leading-4 text-gray-700">{number}</span>
            <ToothIcon />
            <Cell name={`t_${key}`} value={entry.t ?? ""} readOnly={readOnly} />
            <Cell name={`e_${key}`} value={entry.e ?? ""} readOnly={readOnly} />
        </div>
    );
}

export default function ToothGrid({
    chart,
    readOnly = false,
}: {
    chart: ChartMap;
    readOnly?: boolean;
}) {
    return (
        <div className="space-y-6 overflow-x-auto">
            {TOOTH_ROWS.map((row) => (
                <div key={row.key}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {row.label}
                    </p>
                    <div className="flex items-start">
                        <div className="flex shrink-0 flex-col items-end gap-1 pr-3 text-[11px] text-gray-600">
                            <span className="h-4" />
                            <span className="h-6" />
                            <span className="flex h-8 items-center whitespace-nowrap">Treatment Done</span>
                            <span className="flex h-8 items-center whitespace-nowrap">Existing Condition</span>
                        </div>

                        <div className="flex gap-1">
                            {row.left.map((n) => (
                                <Tooth key={n} number={n} chart={chart} readOnly={readOnly} />
                            ))}
                        </div>

                        <div className="mx-3 w-0.5 self-stretch bg-gray-900" />

                        <div className="flex gap-1">
                            {row.right.map((n) => (
                                <Tooth key={n} number={n} chart={chart} readOnly={readOnly} />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}