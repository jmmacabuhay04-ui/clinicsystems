"use client";

// Dropdown na kusang nagse-submit ng form pagkapili (para sa mga filter).
type Props = {
    name: string;
    defaultValue: string;
    options: string[];
    allLabel?: string;
    className?: string;
};

export default function AutoSubmitSelect({
    name,
    defaultValue,
    options,
    allLabel = "All",
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
                    {o}
                </option>
            ))}
        </select>
    );
}