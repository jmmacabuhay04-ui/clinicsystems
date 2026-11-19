import { Bone, PageSkeleton, ShimmerStyle } from "@/components/shared/skeleton";

// Loading skeleton ng portal habang mabagal ang internet: itaas na bar + laman.
export default function PortalLoading() {
    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <ShimmerStyle />
            <div className="flex h-16 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 md:px-6">
                <Bone className="h-8 w-36 rounded-lg" />
                <Bone className="h-9 w-9 rounded-full" />
            </div>
            <main className="mx-auto max-w-5xl p-4 pb-10 md:p-6">
                <PageSkeleton />
            </main>
        </div>
    );
}