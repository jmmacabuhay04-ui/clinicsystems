import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import VisitorForm from "./visitor-form";
import { setTimeOut } from "./actions";

type VisitorRow = {
    visitor_id: number;
    visitor_name: string;
    purpose: string;
    relation: string | null;
    time_in: string;
    time_out: string | null;
};

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:border-gray-100 md:py-0";
const td =
    "flex items-start justify-between gap-3 px-4 py-1.5 text-right before:shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:text-gray-500 before:content-[attr(data-label)] md:table-cell md:py-3 md:text-left md:before:hidden";

function to12Hour(value: string | null) {
    if (!value) return "-";
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default async function VisitorRecordingPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageRecords(session.role);

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    const longDate = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());

    const timeNow = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Manila",
    }).format(new Date());

    const visitors = await prisma.$queryRaw<VisitorRow[]>`
    SELECT visitor_id, visitor_name, purpose, relation, time_in, time_out
    FROM visitor_logs
    WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE)
    ORDER BY time_in, visitor_id
  `;

    return (
        <main className="min-w-0 space-y-6 p-4 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Visitor Recording</h1>
                {!canEdit && (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <div className="min-w-0 space-y-4">
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                        <p className="font-medium text-[#15664f]">{longDate}</p>
                    </div>

                    {canEdit && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
                            <h2 className="mb-5 text-lg font-semibold text-[#15664f]">Visitor Check-In</h2>
                            <VisitorForm today={today} timeNow={timeNow} />
                        </div>
                    )}
                </div>

                <div className="min-w-0">
                    <h2 className="mb-3 text-lg font-semibold text-[#15664f]">
                        Today&apos;s Visitors ({visitors.length})
                    </h2>
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        {visitors.length === 0 ? (
                            <p className="p-8 text-center text-sm text-gray-500">No visitors logged today.</p>
                        ) : (
                            <div className="p-3 md:overflow-x-auto md:p-0">
                                <table className="block w-full text-left text-sm md:table">
                                    <thead className="hidden bg-[#EEEEEE] text-[#15664f] md:table-header-group">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Name</th>
                                            <th className="px-4 py-3 font-medium">Purpose</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Time In</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Time Out</th>
                                        </tr>
                                    </thead>
                                    <tbody className="block md:table-row-group">
                                        {visitors.map((v) => (
                                            <tr key={v.visitor_id} className={tr}>
                                                <td data-label="Name" className={`${td} break-words font-medium text-gray-900`}>
                                                    {v.visitor_name}
                                                </td>
                                                <td data-label="Purpose" className={`${td} break-words text-gray-700`}>
                                                    {v.purpose}
                                                </td>
                                                <td data-label="Time In" className={`${td} text-gray-700 md:whitespace-nowrap`}>
                                                    {to12Hour(v.time_in)}
                                                </td>
                                                <td data-label="Time Out" className={`${td} text-gray-700 md:whitespace-nowrap`}>
                                                    {v.time_out ? (
                                                        to12Hour(v.time_out)
                                                    ) : canEdit ? (
                                                        <form action={setTimeOut} className="flex items-center gap-2">
                                                            <input type="hidden" name="visitorId" value={v.visitor_id} />
                                                            <input type="hidden" name="timeOut" value={timeNow} />
                                                            <button
                                                                type="submit"
                                                                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                                                            >
                                                                <LogOut className="h-3.5 w-3.5" />
                                                                Time Out
                                                            </button>
                                                        </form>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}