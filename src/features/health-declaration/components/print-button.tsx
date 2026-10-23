"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            suppressHydrationWarning
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
            <Printer className="h-4 w-4" />
            Print
        </button>
    );
}