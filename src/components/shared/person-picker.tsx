import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import ConfirmLink from "@/components/shared/confirm-link";
import SearchInput from "@/components/shared/search-input";

// Listahan ng mga tao sa mga form page (Student/Employee Health Form, Dental Health Form,
// Health Declaration): buong-lapad na TABLE na may search at filter (All / On file / No form).
// Pindutin ang View o Fill Out para buksan ang form ng tao.
export type PickerItem = {
    key: string;
    href: string;
    name: string;
    initials: string;
    sub: string;
    hasForm: boolean;
    message: string;
};

type Props = {
    q: string;
    placeholder: string;
    heading: string;
    items: PickerItem[];
    activeKey: string;
    confirmTitle: string;
    emptyText: string;
    /** Page URL (hal. "/dashboard/student-health-form"), para sa mga filter link */
    base: string;
    /** Filter: "" (lahat), "on" (may form), "none" (walang form) */
    status?: string;
    /** Pangalan ng column ng detalye, hal. "Student No. · Year" */
    subLabel?: string;
    /** Salita para sa may form, hal. "On file" o "Submitted" */
    onFileLabel?: string;
};

export default function PersonPicker({
    q,
    placeholder,
    heading,
    items,
    confirmTitle,
    emptyText,
    base,
    status = "",
    subLabel = "ID / Details",
    onFileLabel = "On file",
}: Props) {
    const onFile = items.filter((i) => i.hasForm).length;
    const filters = [
        { key: "", label: "All", count: items.length },
        { key: "on", label: onFileLabel, count: onFile },
        { key: "none", label: "No form", count: items.length - onFile },
    ];
    const shown = status === "on" ? items.filter((i) => i.hasForm) : status === "none" ? items.filter((i) => !i.hasForm) : items;
    const filterHref = (key: string) => {
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (key) sp.set("status", key);
        const qs = sp.toString();
        return qs ? `${base}?${qs}` : base;
    };

    return (
        <section className="no-print min-w-0 overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
            {/* Itaas: search at filter */}
            <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <form method="get" className="relative w-full md:max-w-sm">
                    {status && <input type="hidden" name="status" value={status} />}
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                    <SearchInput
                        name="q"
                        defaultValue={q}
                        autoComplete="off"
                        placeholder={placeholder}
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                    />
                </form>
                <div className="flex flex-wrap gap-1.5">
                    {filters.map((f) => {
                        const active = status === f.key;
                        return (
                            <Link
                                key={f.key || "all"}
                                href={filterHref(f.key)}
                                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors ${active
                                    ? "border-[#15664f] bg-[#15664f] text-white"
                                    : "border-[#cfe5d9] bg-white text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                                    }`}
                            >
                                {f.label}
                                <span className={`rounded-full px-1.5 text-sm ${active ? "bg-white/20" : "bg-gray-100"}`}>{f.count}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {shown.length === 0 ? (
                <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">{emptyText}</p>
            ) : (
                <>
                    {/* PHONE: card bawat tao */}
                    <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                        {shown.map((item) => (
                            <li key={item.key} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                    {item.initials}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-gray-900">{item.name}</p>
                                    <p className="truncate text-sm text-gray-600">{item.sub}</p>
                                    <StatusBadge hasForm={item.hasForm} onFileLabel={onFileLabel} />
                                </div>
                                <OpenButton item={item} confirmTitle={confirmTitle} />
                            </li>
                        ))}
                    </ul>

                    {/* DESKTOP: table */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-y border-gray-200 bg-[#f6faf8] text-gray-600">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">{heading.replace(/s$/, "")}</th>
                                    <th className="px-5 py-3 font-semibold">{subLabel}</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                    <th className="px-5 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map((item) => (
                                    <tr key={item.key} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                                    {item.initials}
                                                </span>
                                                <span className="font-semibold text-gray-900">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">{item.sub}</td>
                                        <td className="px-5 py-3">
                                            <StatusBadge hasForm={item.hasForm} onFileLabel={onFileLabel} />
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <OpenButton item={item} confirmTitle={confirmTitle} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <p className="border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
                Showing {shown.length} of {items.length} {heading.toLowerCase()}
            </p>
        </section>
    );
}

function StatusBadge({ hasForm, onFileLabel }: { hasForm: boolean; onFileLabel: string }) {
    return (
        <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold md:mt-0 ${hasForm ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}
        >
            {hasForm ? onFileLabel : "No form"}
        </span>
    );
}

function OpenButton({ item, confirmTitle }: { item: PickerItem; confirmTitle: string }) {
    return (
        <ConfirmLink
            href={item.href}
            title={confirmTitle}
            message={item.message}
            className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-semibold ${item.hasForm
                ? "border border-[#15664f] bg-white text-[#15664f] hover:bg-[#eef6f2]"
                : "bg-[#15664f] text-white hover:bg-[#10523f]"
                }`}
        >
            {item.hasForm ? "View" : "Open"}
            <ChevronRight className="h-4 w-4" />
        </ConfirmLink>
    );
}

// "Back to list" na link sa itaas ng form kapag may napiling tao
export function BackToList({ href, label = "Back to list" }: { href: string; label?: string }) {
    return (
        <Link
            href={href}
            className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-[#15664f] hover:underline"
        >
            <ChevronRight className="h-4 w-4 rotate-180" />
            {label}
        </Link>
    );
}