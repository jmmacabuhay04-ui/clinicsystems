import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/permissions";
import EmployeeForm, { type EmployeeValues } from "./employee-form";

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
        <main className="min-w-0 space-y-6 p-4 pb-0 md:p-8 md:pb-0">
            <Link
                href={BACK}
                className="inline-flex items-center gap-1 py-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to employees
            </Link>

            <div className="flex items-center gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Add Employee</h1>
                    <p className="text-sm text-gray-600">Register a new employee and create their portal login.</p>
                </div>
            </div>
            <EmployeeForm mode="create" employee={values} cancelHref={BACK} />
        </main>
    );
}