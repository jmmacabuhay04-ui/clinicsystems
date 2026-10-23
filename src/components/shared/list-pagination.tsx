import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Pagination sa ilalim ng mga listahan: ‹ 1 2 3 › at "Showing 1-10 of 54".
type Props = {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    hrefFor: (page: number) => string;
};

// [1] ... [4] [5] [6] ... [20]
function pageList(current: number, last: number): (number | "...")[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages = new Set([1, last, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
    const out: (number | "...")[] = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push("...");
        out.push(p);
    });
    return out;
}

const arrow =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#15664f] hover:bg-[#eef6f2]";
const arrowOff =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-300";

export default function ListPagination({ page, totalPages, total, pageSize, hrefFor }: Props) {
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div className="flex flex-col items-center gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:justify-between">
            <span className="hidden sm:block sm:w-40" />

            <nav className="flex items-center gap-1.5" aria-label="Pagination">
                {page > 1 ? (
                    <Link href={hrefFor(page - 1)} className={arrow} aria-label="Previous page">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                ) : (
                    <span className={arrowOff} aria-hidden>
                        <ChevronLeft className="h-4 w-4" />
                    </span>
                )}

                {pageList(page, totalPages).map((p, i) =>
                    p === "..." ? (
                        <span key={`gap-${i}`} className="px-1 text-gray-400">
                            …
                        </span>
                    ) : p === page ? (
                        <span
                            key={p}
                            aria-current="page"
                            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#15664f] px-2 text-sm font-semibold text-white"
                        >
                            {p}
                        </span>
                    ) : (
                        <Link
                            key={p}
                            href={hrefFor(p)}
                            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium text-gray-700 hover:bg-[#eef6f2]"
                        >
                            {p}
                        </Link>
                    ),
                )}

                {page < totalPages ? (
                    <Link href={hrefFor(page + 1)} className={arrow} aria-label="Next page">
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                ) : (
                    <span className={arrowOff} aria-hidden>
                        <ChevronRight className="h-4 w-4" />
                    </span>
                )}
            </nav>

            <p className="text-sm text-gray-600 sm:w-40 sm:text-right">
                Showing {from}-{to} of {total}
            </p>
        </div>
    );
}