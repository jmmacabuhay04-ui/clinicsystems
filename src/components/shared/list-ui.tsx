// Maliliit na bahagi na pare-pareho sa mga listahan (Students, Employees,
// Student/Employee Health Records, Dental Records), para iisa ang itsura.

export const listSelectClass =
    "h-11 w-full rounded-xl border border-[#dcebe3] bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10";

export const listSearchClass =
    "h-11 w-full rounded-xl border border-[#dcebe3] bg-white pl-10 pr-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10 md:text-sm";

export const listCardClass = "overflow-hidden rounded-2xl border border-[#dcebe3] bg-white shadow-sm shadow-[#15664f]/5";

export const addButtonClass =
    "inline-flex h-11 items-center gap-2 rounded-xl bg-[#15664f] px-5 text-sm font-semibold text-white shadow-md shadow-[#15664f]/20 hover:bg-[#10523f]";

/** Picture o initials. Green para sa student, dilaw para sa employee. */
export function PersonAvatar({
    src,
    first,
    last,
    type = "student",
}: {
    src?: string | null;
    first?: string | null;
    last?: string | null;
    type?: "student" | "employee";
}) {
    const employee = type === "employee";
    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src}
                alt=""
                className={`h-9 w-9 shrink-0 rounded-full object-cover ring-2 ${employee ? "ring-amber-300" : "ring-[#15664f]/30"}`}
            />
        );
    }
    return (
        <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${employee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {`${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?"}
        </span>
    );
}

/** Lahat ng nasa listahan ay hindi naka-archive, kaya "Active". */
export function ActiveBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#e3f1e9] px-2.5 py-0.5 text-sm font-medium text-[#15664f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#15664f]" />
            Active
        </span>
    );
}

export function formatGender(g?: string | null) {
    if (!g) return "—";
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

/** Naka-archive ang tao (deactivated): pulang "Deactivated" sa Archive Records. */
export function InactiveBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-700">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Deactivated
        </span>
    );
}