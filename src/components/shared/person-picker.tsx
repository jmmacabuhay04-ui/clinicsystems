import { Search } from "lucide-react";
import ConfirmLink from "@/components/shared/confirm-link";
import SearchInput from "@/components/shared/search-input";

// Listahan sa kaliwa ng mga form page (Health Declaration, Health Forms, Dental Health Form).
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
};

export default function PersonPicker({ q, placeholder, heading, items, activeKey, confirmTitle, emptyText }: Props) {
    return (
        <aside className="no-print min-w-0 self-start rounded-xl border-2 border-[#cfe5d9] bg-white p-4 shadow-md shadow-[#15664f]/10">
            <form method="get" className="relative">
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

            <div className="mt-4 flex items-center justify-between px-1">
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">{heading}</span>
                <span className="rounded-full bg-[#eef6f2] px-2 py-0.5 text-sm font-semibold text-[#15664f]">
                    {items.length}
                </span>
            </div>

            {/* Mas maikli ang listahan sa mobile para hindi mahaba ang scroll bago makita ang form */}
            <ul className="mt-2 max-h-72 space-y-1 overflow-auto pr-1 lg:max-h-[600px]">
                {items.length === 0 && <li className="p-3 text-center text-sm text-gray-600">{emptyText}</li>}
                {items.map((item) => {
                    const active = item.key === activeKey;
                    return (
                        <li key={item.key}>
                            <ConfirmLink
                                href={item.href}
                                title={confirmTitle}
                                message={item.message}
                                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${active ? "border-[#15664f] bg-[#eef6f2]" : "border-transparent hover:bg-gray-50"
                                    }`}
                            >
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${active ? "bg-[#15664f] text-white" : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    {item.initials}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-gray-900">{item.name}</span>
                                    <span className="block truncate text-sm text-gray-600">{item.sub}</span>
                                </span>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold ${item.hasForm ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    {item.hasForm ? "On file" : "No form"}
                                </span>
                            </ConfirmLink>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}