"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Save } from "lucide-react";
import { saveDisplayName, type NameState } from "@/features/settings/actions";

const initialState: NameState = {};

// Form para itakda ang pangalang lalabas sa dashboard at sidebar (hal. "Nurse Reyes").
export default function DisplayNameForm() {
    const [state, formAction, pending] = useActionState(saveDisplayName, initialState);

    // Green na notice sa loob ng form: may guhit sa ilalim na umiikli.
    // Itinatago pagkalipas ng 3 segundo o kapag nag-type ulit.
    // (Walang setState na direkta sa loob ng effect, para walang error sa React.)
    const [hidden, setHidden] = useState<NameState | null>(null);
    const toast = state.success && hidden !== state ? state.success : null;
    useEffect(() => {
        if (!state.success) return;
        const t = window.setTimeout(() => setHidden(state), 3000);
        return () => window.clearTimeout(t);
    }, [state]);

    return (
        <form action={formAction} className="space-y-3">
            {state.error && (
                <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {state.error}
                </p>
            )}
            {toast && (
                <div role="status" className="relative overflow-hidden rounded-lg border border-green-200 bg-green-50">
                    <p className="flex items-start gap-2 p-3 text-sm font-medium text-green-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        {toast}
                    </p>
                    {/* Guhit sa ilalim: umiikli hanggang mawala (3 segundo) */}
                    <span
                        aria-hidden
                        className="absolute bottom-0 left-0 h-1 w-full origin-left bg-green-300 [animation:dn-toast-bar_3s_linear_forwards]"
                    />
                    <style>{`@keyframes dn-toast-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
                </div>
            )}

            <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-600">Display Name (optional)</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        name="displayName"
                        // Laging blangko: hindi ipinapakita ang nailagay nang pangalan
                        defaultValue=""
                        maxLength={60}
                        data-optional
                        // Walang lumalabas na mungkahing pangalan ng browser habang nagta-type
                        autoComplete="off"
                        onInput={() => setHidden(state)}
                        placeholder="e.g. Maria Reyes"
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                    />
                    <button
                        type="submit"
                        disabled={pending}
                        suppressHydrationWarning
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        {pending ? "Saving..." : "Save"}
                    </button>
                </div>
            </label>
            <p className="text-sm text-gray-600">
                This name appears on the dashboard and sidebar. You still sign in with your email.
            </p>
        </form>
    );
}