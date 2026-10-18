import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import EmployeeForm, { type EmployeeValues } from "../employee-form";

const BACK = "/dashboard/employees";

export default async function NewEmployeePage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStudents(session.role)) redirect(BACK);

    const values: EmployeeValues = {
        employeeNumber: "",
        lastName: "",
        firstName: "",
        middleName: "",
        department: "",
        position: "",
        dateOfBirth: "",
        gender: "",
        contactNumber: "",
        email: "",
    };

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <Link
                href={BACK}
                className="inline-flex items-center gap-1 py-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to employees
            </Link>

            <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Add Employee</h1>
            <EmployeeForm mode="create" employee={values} cancelHref={BACK} />
        </main>
    );
}