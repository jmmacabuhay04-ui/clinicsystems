"use client";

// Dropdown na kusang nagse-submit ng form pagkapili (para sa mga filter).
type Props = {
    name: string;
    defaultValue: string;
    options: string[];
    allLabel?: string;
    /** Opsyonal na ipapakitang label bawat value (hal. { student: "Students (12)" }) */
    labels?: Record<string, string>;
    className?: string;
};

export default function AutoSubmitSelect({
    name,
    defaultValue,
    options,
    allLabel = "All",
    labels,
    className,
}: Props) {
    return (
        <select
            name={name}
            defaultValue={defaultValue}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            suppressHydrationWarning
            className={className}
        >
            <option value="">{allLabel}</option>
            {options.map((o) => (
                <option key={o} value={o}>
                    {labels?.[o] ?? o}
                </option>
            ))}
        </select>
    );
}