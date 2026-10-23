import PortalNav from "./portal-nav";
import { employeeLogout } from "@/features/auth/employee-login-actions";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import { prisma } from "@/lib/prisma";

type Props = { fullName: string; initials: string };

// Server component: kinukuha nito ang avatar mula sa session, kaya hindi na
// kailangang ipasa ng bawat page.
export default async function EmployeeNav({ fullName, initials }: Props) {
    const session = await getEmployeeSession();

    let avatar: string | null = null;
    if (session) {
        try {
            const rows = await prisma.$queryRaw<{ avatar: string | null }[]>`
                SELECT avatar FROM employees WHERE employee_id = ${session.employeeId} LIMIT 1
            `;
            avatar = rows[0]?.avatar ?? null;
        } catch (err) {
            // Huwag hayaang mag-crash ang buong page dahil lang sa avatar.
            console.error("EmployeeNav: failed to load avatar", err);
        }
    }

    return (
        <PortalNav
            basePath="/employee"
            roleLabel="Employee"
            fullName={fullName}
            initials={initials}
            avatar={avatar}
            logoutAction={employeeLogout}
        />
    );
}