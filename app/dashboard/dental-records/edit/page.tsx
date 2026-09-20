import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageDental } from "@/lib/permissions";
import DentalForm, { type DentalValues } from "../dental-form";

const BASE = "/dashboard/dental-records";

type Row = {
    dental_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    visit_date: Date;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
    notes: string | null;
};

type Props = {
    searchParams: Promise<{ record?: string }>;
};

export default async function EditDentalPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageDental(session.role)) redirect(BASE);

    const { record: recordParam = "" } = await searchParams;
    const dentalId = Number(recordParam);
    if (!dentalId) notFound();

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT d.dental_id, s.student_number, s.last_name, s.first_name,
           d.visit_date, d.procedure_name, d.tooth, d.dentist_name, d.status, d.notes
    FROM dental_records d
    JOIN students s ON s.student_id = d.student_id
    WHERE d.dental_id = ${dentalId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: DentalValues = {
        dentalId: row.dental_id,
        studentNumber: row.student_number,
        visitDate: new Date(row.visit_date).toISOString().slice(0, 10),
        procedureName: row.procedure_name,
        tooth: row.tooth ?? "",
        dentistName: row.dentist_name ?? "",
        status: row.status,
        notes: row.notes ?? "",
    };

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dental Records
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Edit Dental Record</h1>
                <p className="mt-1 text-gray-600">
                    {row.last_name}, {row.first_name} · {row.student_number}
                </p>
            </div>

            <DentalForm mode="edit" record={values} cancelHref={BASE} />
        </main>
    );
}