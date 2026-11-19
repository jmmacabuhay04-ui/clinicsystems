import { PageSkeleton } from "@/components/shared/skeleton";

// Lumalabas agad habang kinukuha pa ang data ng page (hal. mahina ang internet o wifi).
// Para sa lahat ng page sa /dashboard; nananatili ang sidebar, ang laman lang ang skeleton.
export default function DashboardLoading() {
    return (
        <main className="min-w-0 p-4 pb-8 md:p-8">
            <PageSkeleton />
        </main>
    );
}