import { CheckCircle2, XCircle } from "lucide-react";

// Listahan ng requirement ng password sa ilalim ng password field.
// Berde na check kapag pasok, pula na X kapag hindi pa.
export const PASSWORD_RULES = [
    { label: "8 characters", test: (p: string) => p.length >= 8 },
    { label: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "At least 1 number", test: (p: string) => /\d/.test(p) },
] as const;

export default function PasswordChecklist({ password, className = "" }: { password: string; className?: string }) {
    return (
        <ul className={`space-y-1 ${className}`} aria-label="Password requirements">
            {PASSWORD_RULES.map((r) => {
                const ok = r.test(password);
                return (
                    <li key={r.label} className={`flex items-center gap-2 text-sm ${ok ? "text-green-700" : "text-red-600"}`}>
                        {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                        <span>{r.label}</span>
                        <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
                    </li>
                );
            })}
        </ul>
    );
}