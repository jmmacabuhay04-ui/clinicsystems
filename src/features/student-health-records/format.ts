// Maliliit na helper sa pag-display ng data sa Student Health Records.

export function formatDate(date: Date | null, month: "short" | "long" = "short") {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month,
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });
}

export function show(value: number | string | null | undefined, unit = "") {
    return value === null || value === undefined || value === "" ? "—" : `${value}${unit}`;
}