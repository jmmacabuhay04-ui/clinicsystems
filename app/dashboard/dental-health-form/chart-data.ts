export type ToothRow = {
    key: string;
    label: string;
    left: number[];
    right: number[];
};

export const TOOTH_ROWS: ToothRow[] = [
    {
        key: "upper-permanent",
        label: "Upper Permanent",
        left: [18, 17, 16, 15, 14, 13, 12, 11],
        right: [21, 22, 23, 24, 25, 26, 27, 28],
    },
    {
        key: "upper-primary",
        label: "Upper Primary",
        left: [55, 54, 53, 52, 51],
        right: [61, 62, 63, 64, 65],
    },
    {
        key: "lower-primary",
        label: "Lower Primary",
        left: [85, 84, 83, 82, 81],
        right: [71, 72, 73, 74, 75],
    },
    {
        key: "lower-permanent",
        label: "Lower Permanent",
        left: [48, 47, 46, 45, 44, 43, 42, 41],
        right: [31, 32, 33, 34, 35, 36, 37, 38],
    },
];

export const ALL_TEETH: string[] = TOOTH_ROWS.flatMap((row) =>
    [...row.left, ...row.right].map(String)
);

export const LEGEND: { code: string; meaning: string }[] = [
    { code: "C", meaning: "Dental Caries" },
    { code: "RF", meaning: "Roof Fragment" },
    { code: "I", meaning: "Impacted" },
    { code: "A", meaning: "Abrasions (Cervical)" },
    { code: "X", meaning: "Missing Extracted" },
    { code: "AM", meaning: "Amalgam" },
    { code: "CO", meaning: "Composite" },
    { code: "S", meaning: "Sealants" },
    { code: "MO", meaning: "Metal Onlay" },
    { code: "CEO", meaning: "Ceramic Onlay" },
    { code: "MI", meaning: "Metal Inlay" },
    { code: "CEL", meaning: "Ceramic Inlay" },
    { code: "GJC", meaning: "Gold Jacket Crown" },
    { code: "AJC", meaning: "Acrylic Jacket Crown" },
    { code: "PJC", meaning: "Porcelain Jacket Crown" },
    { code: "MJC", meaning: "Metal Jacket Crown" },
    { code: "CD", meaning: "Complete Dentures" },
    { code: "RPD", meaning: "Removable Partial Denture" },
];

export const PERIODONTAL: { key: string; label: string }[] = [
    { key: "soft_plaque", label: "Presence of Soft Plaque" },
    { key: "periodontitis", label: "Presence of Periodontitis" },
    { key: "gingivitis", label: "Presence of Gingivitis" },
    { key: "calcular_deposits", label: "Presence of Calcular Deposits" },
    { key: "crossbite", label: "Crossbite" },
];

export const OCCLUSION: { key: string; label: string }[] = [
    { key: "class_molar", label: "Class (Molar)" },
    { key: "overjet", label: "Overjet" },
    { key: "overbite", label: "Overbite" },
    { key: "midline", label: "Midline" },
    { key: "extraction_needed", label: "Extraction Needed" },
];

export const TREATMENT: { key: string; label: string }[] = [
    { key: "oral_prophylaxis", label: "Oral Prophylaxis Needed" },
    { key: "fluoride_application", label: "Fluoride Application" },
    { key: "sealant_application", label: "Sealant Application" },
    { key: "tooth_restoration", label: "Tooth Restoration" },
    { key: "orthodontic_treatment", label: "Orthodontic Treatment" },
];

export function examinerName(fullName: string | null, username: string) {
    const name = (fullName ?? "").trim();
    if (name) return name;
    const base = username.split("@")[0].replace(/[._-]+/g, " ").trim();
    return base.replace(/\b\w/g, (letter) => letter.toUpperCase());
}