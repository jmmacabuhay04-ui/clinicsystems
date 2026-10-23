import { notFound } from "next/navigation";

const sections: Record<string, string> = {
    "student-health-records": "Student Health Records",
    "dental-records": "Dental Records",
    "health-case-reports": "Health Case Reports",
    "visitor-recording": "Visitor Recording",
    "referral-slips": "Referral Slips",
    "illness-alerts": "Illness Alerts",
    "archive-records": "Archive Records",
    "clinic-staff": "Clinic Staff",
    settings: "Settings",
};

type Props = {
    params: Promise<{ section: string }>;
};

export default async function SectionPage({ params }: Props) {
    const { section } = await params;
    const title = sections[section];
    if (!title) notFound();

    return (
        <main className="p-6 md:p-8">
            <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <p className="font-medium text-gray-700">This module is under construction.</p>
                <p className="mt-1 text-sm text-gray-500">It will be available in a future update.</p>
            </div>
        </main>
    );
}