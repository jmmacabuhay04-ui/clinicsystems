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
        { label: "Grade/Level", value: show(student.grade_level) },
        { label: "Program", value: show(student.program) },
        { label: "Last Name", value: student.last_name },
        { label: "First Name", value: student.first_name },
        { label: "Middle Name", value: show(student.middle_name) },
        { label: "Date of Birth", value: formatDate(student.date_of_birth) },
        { label: "Gender", value: show(student.gender) },
    ];

    return (
        <div className="min-h-screen bg-[#f6f7f6]">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    These are read-only records managed by BCAS clinic staff. Visit the clinic to correct any
                    errors.
                </div>

                <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#15664f] text-lg font-semibold text-white">
                            {initialsOf(student.first_name, student.last_name)}
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900">{fullName}</p>
                            <p className="text-sm text-gray-500">{student.student_number}</p>
                        </div>
                    </div>

                    <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {fields.map((f) => (
                            <div key={f.label} className="min-w-0">
                                <dt className="text-xs uppercase tracking-wide text-gray-500">{f.label}</dt>
                                <dd className="mt-1 break-words font-semibold text-gray-900">{f.value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            </main>
        </div>
    );
}