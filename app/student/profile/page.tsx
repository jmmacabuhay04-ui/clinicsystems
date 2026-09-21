import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-session";
import StudentNav from "@/components/student-nav";
import { getStudent, formatDate, show, initialsOf } from "@/lib/student-data";

export default async function StudentProfilePage() {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const student = await getStudent(Number(session.userId));
    if (!student) redirect("/student/login");

    const fullName = `${student.first_name} ${student.last_name}`;

    const fields = [
        { label: "Student Number", value: student.student_number },
        { label: "Last Name", value: student.last_name },
        { label: "First Name", value: student.first_name },
        { label: "Middle Name", value: show(student.middle_name) },
        { label: "Grade/Level", value: show(student.grade_level) },
        { label: "Program", value: show(student.program) },
        { label: "Date of Birth", value: formatDate(student.date_of_birth) },
        { label: "Gender", value: show(student.gender) },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-6">
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-xl font-semibold text-white">
                        {initialsOf(student.first_name, student.last_name)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-semibold text-gray-900">{fullName}</p>
                        <p className="text-sm text-gray-600">{student.student_number}</p>
                    </div>
                </div>

                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
                    {fields.map((f) => (
                        <div key={f.label} className="flex items-center justify-between gap-4 px-6 py-4">
                            <span className="text-sm text-gray-600">{f.label}</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{f.value}</span>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}