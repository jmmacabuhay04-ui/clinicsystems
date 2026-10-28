import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import EditForm, { type RecordValues } from "./edit-form";

type Row = {
    record_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    visit_date: Date;
    complaint: string;
    action_taken: string | null;
    attending_staff: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    heart_rate: number | null;
    blood_pressure: string | null;
    temperature: number | null;
};

type Props = {
    searchParams: Promise<{ record?: string }>;
};

const text = (value: number | string | null) => (value === null ? "" : String(value));

export default async function EditRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect("/dashboard/student-health-records");

    const { record: recordParam = "" } = await searchParams;
    const recordId = Number(recordParam);
    if (!recordId) notFound();

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT r.record_id, s.student_number, s.last_name, s.first_name,
           r.visit_date, r.complaint, r.action_taken, r.attending_staff,
           r.height_cm, r.weight_kg, r.heart_rate, r.blood_pressure, r.temperature
    FROM health_records r
    JOIN students s ON s.student_id = r.student_id
    WHERE r.record_id = ${recordId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: RecordValues = {
        recordId: row.record_id,
        studentNumber: row.student_number,
        visitDate: new Date(row.visit_date).toISOString().slice(0, 10),
        complaint: row.complaint,
        actionTaken: text(row.action_taken),
        attendingStaff: text(row.attending_staff),
        height: text(row.height_cm),
        weight: text(row.weight_kg),
        heartRate: text(row.heart_rate),
        bloodPressure: text(row.blood_pressure),
        temperature: text(row.temperature),
    };

    const backHref = `/dashboard/student-health-records?student=${encodeURIComponent(row.student_number)}`;

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to Student Health Records
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Edit Health Record</h1>
                        <p className="text-sm text-gray-600">Update the details and vital signs of this clinic visit.</p>
                    </div>
                </div>
                {/* Kung kaninong record ito */}
                <div className="flex items-center gap-3 rounded-xl border-2 border-[#cfe5d9] bg-white px-3 py-2 shadow-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-sm font-semibold text-white">
                        {`${row.first_name[0] ?? ""}${row.last_name[0] ?? ""}`.toUpperCase()}
                    </span>
                    <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-semibold text-gray-900">
                            {row.last_name}, {row.first_name}
                        </p>
                        <p className="text-sm text-gray-600">{row.student_number}</p>
                    </div>
                    <span className="rounded-full bg-[#15664f] px-2 py-0.5 text-sm font-semibold text-white">Student</span>
                </div>
            </div>

            <EditForm record={values} cancelHref={backHref} />
        </main>
    );
}