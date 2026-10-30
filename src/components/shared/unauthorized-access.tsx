import Link from "next/link";
import { ShieldAlert } from "lucide-react";

// Ipinapakita kapag binuksan ang page na hindi para sa role ng naka-login
// (hal. admin sa Students / Employees: health records lang ang puwede niyang makita).
export default function UnauthorizedAccess({
    message = "You don't have permission to view this page.",
    backHref = "/dashboard",
    backLabel = "Back to Dashboard",
}: {
    message?: string;
    backHref?: string;
    backLabel?: string;
}) {
    return (
        <main className="flex min-h-[70vh] min-w-0 items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-md rounded-2xl border border-[#dcebe3] bg-white p-8 text-center shadow-sm shadow-[#15664f]/5">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <ShieldAlert className="h-8 w-8" strokeWidth={1.8} />
                </span>
                <h1 className="mt-4 text-2xl font-bold text-[#10523f]">Unauthorized Access</h1>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                <Link
                    href={backHref}
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f]"
                >
                    {backLabel}
                </Link>
            </div>
        </main>
    );
}