import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import EmployeeForm, { type EmployeeValues } from "../employee-form";

const BACK = "/dashboard/employees";

type EmployeeRow = {
    employee_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    department: string | null;
    position: string | null;
    date_of_birth: Date | null;
    gender: string | null;
    contact_number: string | null;
    email: string | null;
};

type Props = {
    searchParams: Promise<{ employee?: string }>;
};

export default async function EditEmployeePage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStudents(session.role)) redirect(BACK);

    const { employee } = await searchParams;
    const employeeNumber = (employee ?? "").trim();
    if (!employeeNumber) redirect(BACK);

    const rows = await prisma.$queryRaw<EmployeeRow[]>`
      SELECT employee_id, employee_number, last_name, first_name, middle_name,
             department, position, date_of_birth, gender, contact_number, email
      FROM employees
      WHERE employee_number = ${employeeNumber} AND archived_at IS NULL
      LIMIT 1
    `;
    const e = rows[0];
    if (!e) redirect(BACK);

    const values: EmployeeValues = {
        employeeId: e.employee_id,
        employeeNumber: e.employee_number,
        lastName: e.last_name,
        firstName: e.first_name,
        middleName: e.middle_name ?? "",
        department: e.department ?? "",
        position: e.position ?? "",
        dateOfBirth: e.date_of_birth ? new Date(e.date_of_birth).toISOString().slice(0, 10) : "",
        gender: e.gender ?? "",
        contactNumber: e.contact_number ?? "",
        email: e.email ?? "",
    };

    const fullName = `${e.last_name}, ${e.first_name}${e.middle_name ? ` ${e.middle_name}` : ""}`;

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <Link
                href={BACK}
                className="inline-flex items-center gap-1 py-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to employees
            </Link>

            <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Edit Employee</h1>
                <p className="text-gray-600">
                    {fullName} · {e.employee_number}
                </p>
            </div>

            <EmployeeForm
                mode="edit"
                employee={values}
                cancelHref={BACK}
            />
        </main>
    );
}