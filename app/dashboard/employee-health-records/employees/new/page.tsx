import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import EmployeeForm, { type EmployeeValues } from "../../employee-form";

const BASE = "/dashboard/employee-health-records";

const empty: EmployeeValues = {
    employeeNumber: "",
    lastName: "",
    firstName: "",
    middleName: "",
    department: "",
    position: "",
    dateOfBirth: "",
    gender: "",
};

export default async function NewEmployeePage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStudents(session.role)) redirect(BASE);

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Employee Health Records
            </Link>

            <h1 className="text-3xl font-semibold text-[#15664f]">Add Employee</h1>

            <EmployeeForm mode="create" employee={empty} cancelHref={BASE} />
        </main>
    );
}