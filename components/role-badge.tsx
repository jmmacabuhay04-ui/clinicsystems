type RoleStyle = {
    label: string;
    light: string; // badge on white pages
    dot: string; // dot color on the dark green sidebar
};

export const ROLE_STYLES: Record<string, RoleStyle> = {
    admin: {
        label: "Administrator",
        light: "bg-emerald-50 text-emerald-800 ring-emerald-600/25",
        dot: "bg-emerald-300",
    },
    doctor: {
        label: "Doctor",
        light: "bg-blue-50 text-blue-700 ring-blue-600/25",
        dot: "bg-sky-300",
    },
    dentist: {
        label: "Dentist",
        light: "bg-cyan-50 text-cyan-800 ring-cyan-600/25",
        dot: "bg-cyan-300",
    },
    nurse: {
        label: "Nurse",
        light: "bg-rose-50 text-rose-700 ring-rose-600/25",
        dot: "bg-rose-300",
    },
    ittech: {
        label: "IT Technician",
        light: "bg-violet-50 text-violet-700 ring-violet-600/25",
        dot: "bg-violet-300",
    },
};

const FALLBACK: RoleStyle = {
    label: "User",
    light: "bg-gray-100 text-gray-700 ring-gray-500/25",
    dot: "bg-gray-300",
};

type Props = {
    role: string;
    variant?: "light" | "dark"; // "dark" = for the green sidebar
};

export default function RoleBadge({ role, variant = "light" }: Props) {
    const style = ROLE_STYLES[role] ?? { ...FALLBACK, label: role };

    if (variant === "dark") {
        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-inset ring-white/20">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                {style.label}
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.light}`}
        >
            {style.label}
        </span>
    );
}