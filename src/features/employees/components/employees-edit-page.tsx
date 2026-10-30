import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/permissions";
import EmployeeForm, { type EmployeeValues } from "./employee-form";

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
    avatar: string | null;
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
             department, position, date_of_birth, gender, contact_number, email, avatar
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
        <main className="min-w-0 space-y-6 p-4 pb-0 md:p-8 md:pb-0">
            <Link
                href={BACK}
                className="inline-flex items-center gap-1 py-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to employees
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Edit Employee</h1>
                        <p className="text-sm text-gray-600">Update the employee&apos;s details and portal login.</p>
                    </div>
                </div>
                {/* Kung sino ang ine-edit */}
                <div className="flex items-center gap-3 rounded-xl border-2 border-[#cfe5d9] bg-white px-3 py-2 shadow-sm">
                    {e.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-amber-300" />
                    ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-300 text-sm font-semibold text-gray-900">
                            {`${e.first_name[0] ?? ""}${e.last_name[0] ?? ""}`.toUpperCase()}
                        </span>
                    )}
                    <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-semibold text-gray-900">{fullName}</p>
                        <p className="text-sm text-gray-600">{e.employee_number}</p>
                    </div>
                </div>
            </div>

            <EmployeeForm
                mode="edit"
                employee={values}
                cancelHref={BACK}
                avatar={e.avatar}
            />
        </main>
    );
}