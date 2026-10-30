type RoleStyle = {
    label: string;
    light: string; // badge on white pages
    dot: string; // dot color on the dark green sidebar
    dotLight: string; // dot color sa light badge (kapag withDot)
};

export const ROLE_STYLES: Record<string, RoleStyle> = {
    admin: {
        label: "Administrator",
        light: "bg-emerald-50 text-emerald-800 ring-emerald-600/25",
        dot: "bg-emerald-300",
        dotLight: "bg-emerald-500",
    },
    doctor: {
        label: "Doctor",
        light: "bg-blue-50 text-blue-700 ring-blue-600/25",
        dot: "bg-sky-300",
        dotLight: "bg-blue-500",
    },
    dentist: {
        label: "Dentist",
        light: "bg-cyan-50 text-cyan-800 ring-cyan-600/25",
        dot: "bg-cyan-300",
        dotLight: "bg-cyan-500",
    },
    nurse: {
        label: "Nurse",
        light: "bg-rose-50 text-rose-700 ring-rose-600/25",
        dot: "bg-rose-300",
        dotLight: "bg-rose-500",
    },
    ittech: {
        label: "IT Technician",
        light: "bg-violet-50 text-violet-700 ring-violet-600/25",
        dot: "bg-violet-300",
        dotLight: "bg-violet-500",
    },
};

const FALLBACK: RoleStyle = {
    label: "User",
    light: "bg-gray-100 text-gray-600 ring-gray-500/25",
    dot: "bg-gray-300",
    dotLight: "bg-gray-400",
};

type Props = {
    role: string;
    variant?: "light" | "dark"; // "dark" = for the green sidebar
    withDot?: boolean; // may maliit na tuldok sa unahan (hal. dashboard header)
};

export default function RoleBadge({ role, variant = "light", withDot = false }: Props) {
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
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${style.light}`}
        >
            {withDot && <span className={`h-2 w-2 rounded-full ${style.dotLight}`} />}
            {style.label}
        </span>
    );
}