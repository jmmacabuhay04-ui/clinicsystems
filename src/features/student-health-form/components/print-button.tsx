"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

// Mga in-app browser (Messenger, Facebook, Instagram, atbp.) na hindi marunong mag-print
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|; wv\)/i;

export default function PrintButton() {
    const [notice, setNotice] = useState<string | null>(null);

    function handlePrint() {
        setNotice(null);
        if (IN_APP_BROWSER.test(navigator.userAgent)) {
            setNotice("Printing is not supported in this app's browser. Open this page in Chrome or Safari, then tap Print.");
            return;
        }
        try {
            window.print();
        } catch {
            setNotice("Could not open the print dialog. Use your browser menu, then Share or Print.");
        }
    }

    return (
        <div className="flex flex-col items-start gap-2">
            <button
                type="button"
                onClick={handlePrint}
                suppressHydrationWarning
                className="relative z-10 inline-flex h-10 touch-manipulation items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100"
            >
                <Printer className="h-4 w-4" />
                Print
            </button>
            {notice && (
                <p role="alert" className="max-w-xs rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                    {notice}
                </p>
            )}
        </div>
    );
}