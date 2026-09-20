import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import EmployeeForm, { type EmployeeValues } from "../../employee-form";

const BASE = "/dashboard/employee-health-records";

type Row = {
    employee_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    department: string | null;
    position: string | null;
    date_of_birth: Date | null;
    gender: string | null;
};

type Props = {
    searchParams: Promise<{ employee?: string }>;
};

export default async function EditEmployeePage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStudents(session.role)) redirect(BASE);

    const { employee: employeeNumber = "" } = await searchParams;
    if (!employeeNumber) notFound();

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT employee_id, employee_number, last_name, first_name, middle_name,
           department, position, date_of_birth, gender
    FROM employees
    WHERE employee_number = ${employeeNumber}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: EmployeeValues = {
        employeeId: row.employee_id,
        employeeNumber: row.employee_number,
        lastName: row.last_name,
        firstName: row.first_name,
        middleName: row.middle_name ?? "",
        department: row.department ?? "",
        position: row.position ?? "",
        dateOfBirth: row.date_of_birth
            ? new Date(row.date_of_birth).toISOString().slice(0, 10)
            : "",
        gender: row.gender ?? "",
    };

    const backHref = `${BASE}?employee=${encodeURIComponent(row.employee_number)}`;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to employee record
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Edit Employee</h1>
                <p className="mt-1 text-gray-600">
                    {row.last_name}, {row.first_name} · {row.employee_number}
                </p>
            </div>

            <EmployeeForm mode="edit" employee={values} cancelHref={backHref} />
        </main>
    );
}