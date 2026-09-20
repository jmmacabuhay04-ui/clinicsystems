// TEMPORARY SAMPLE DATA
// Replace these with real database queries once the clinic visit,
// case report, and visitor tables are created.

export const sampleStats = {
    clinicVisitsToday: 28,
    pendingReports: 7,
    visitorsToday: 15,
};

export const sampleRecentVisits = [
    { name: "Maria Santos", complaint: "Headache", time: "10:30 AM" },
    { name: "Juan Dela Cruz", complaint: "Fever", time: "11:15 AM" },
    { name: "Ana Reyes", complaint: "Stomachache", time: "11:45 AM" },
    { name: "Carlos Lopez", complaint: "Sprained ankle", time: "1:20 PM" },
    { name: "Sofia Garcia", complaint: "Allergic reaction", time: "2:00 PM" },
];

export type CaseLevel = "low" | "moderate" | "high";

export const sampleCaseReports: { illness: string; count: number; level: CaseLevel }[] = [
    { illness: "Influenza", count: 12, level: "moderate" },
    { illness: "COVID-19", count: 3, level: "high" },
    { illness: "Food Poisoning", count: 8, level: "moderate" },
    { illness: "Minor Injuries", count: 15, level: "low" },
    { illness: "Dengue", count: 2, level: "high" },
];