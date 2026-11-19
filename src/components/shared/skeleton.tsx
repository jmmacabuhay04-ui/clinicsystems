// Loading skeleton na may "shimmer" (kumikislap na gray), lumalabas habang mabagal ang internet.
// Ginagamit ng loading.tsx ng /dashboard at ng Student / Employee portal.

const SHIMMER_CSS = `
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.sk { background: linear-gradient(100deg, #eceef1 30%, #f7f8fa 50%, #eceef1 70%); background-size: 200% 100%;
      animation: sk-shimmer 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
`;

/** Isang gray na hugis. Ibigay ang laki at hugis sa className (hal. "h-4 w-40 rounded-md"). */
export function Bone({ className = "" }: { className?: string }) {
    return <div className={`sk ${className}`} />;
}

/** Card na kahawig ng larawan: avatar + 2 linya, malaking kahon, mga linya, 2 kahon, mga linya */
export function SkeletonCard({ className = "" }: { className?: string }) {
    return (
        <div className={`space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}>
            <div className="flex items-center gap-3">
                <Bone className="h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Bone className="h-3.5 w-11/12 rounded-md" />
                    <Bone className="h-3.5 w-3/5 rounded-md" />
                </div>
            </div>
            <Bone className="h-24 w-full rounded-xl" />
            <div className="space-y-2">
                <Bone className="h-3.5 w-full rounded-md" />
                <Bone className="h-3.5 w-4/5 rounded-md" />
                <Bone className="h-3.5 w-2/3 rounded-md" />
            </div>
            <Bone className="h-12 w-full rounded-xl" />
            <Bone className="h-12 w-4/5 rounded-xl" />
            <div className="space-y-2">
                <Bone className="h-3.5 w-full rounded-md" />
                <Bone className="h-3.5 w-4/5 rounded-md" />
                <Bone className="h-3.5 w-2/3 rounded-md" />
            </div>
        </div>
    );
}

/** Kinakailangan isang beses sa bawat loading screen (dito ang animation) */
export function ShimmerStyle() {
    return <style>{SHIMMER_CSS}</style>;
}

/** Buong loading screen ng laman ng page: pamagat + 3 card (1 sa phone, 2 sa tablet, 3 sa desktop) */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
    return (
        <div className="space-y-6" aria-busy="true" aria-label="Loading">
            <ShimmerStyle />
            <div className="space-y-2">
                <Bone className="h-8 w-56 max-w-full rounded-lg" />
                <Bone className="h-4 w-80 max-w-full rounded-md" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: cards }, (_, i) => (
                    <SkeletonCard key={i} className={i === 1 ? "hidden sm:block" : i >= 2 ? "hidden xl:block" : ""} />
                ))}
            </div>
            <span className="sr-only">Loading…</span>
        </div>
    );
}