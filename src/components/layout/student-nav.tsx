import PortalNav from "./portal-nav";
import { studentLogout } from "@/features/auth/student-login-actions";
import { getStudentSession } from "@/lib/auth/student-session";
import { prisma } from "@/lib/prisma";

type Props = { fullName: string; initials: string };

// Server component: kinukuha nito ang avatar mula sa session, kaya hindi na
// kailangang ipasa ng bawat page.
export default async function StudentNav({ fullName, initials }: Props) {
    const session = await getStudentSession();

    let avatar: string | null = null;
    if (session) {
        const rows = await prisma.$queryRaw<{ avatar: string | null }[]>`
      SELECT avatar FROM students WHERE student_id = ${Number(session.userId)} LIMIT 1
    `;
        avatar = rows[0]?.avatar ?? null;
    }

    return (
        <PortalNav
            basePath="/student"
            roleLabel="Student"
            fullName={fullName}
            initials={initials}
            avatar={avatar}
            logoutAction={studentLogout}
        />
    );
}