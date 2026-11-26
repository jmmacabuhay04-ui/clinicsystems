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

/** BMI at kategorya (WHO): "Normal (BMI 21.3)". "—" kung kulang o mali ang height/weight. */
export function bmiLabel(heightCm: unknown, weightKg: unknown) {
    const h = Number(heightCm) / 100;
    const w = Number(weightKg);
    if (!h || !w || !Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return "—";
    const bmi = w / (h * h);
    const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
    return `${category} (BMI ${bmi.toFixed(1)})`;
}