// Mga piraso ng Case Trend chart na ginagamit ng page (server) at ng FitTrendChart (client).
// Walang "use client" dito para magamit ng pareho.

export const WARNING_PER_DAY = 10; // 10–14 persons in a day = Warning
export const OUTBREAK_PER_DAY = 15; // 15+ persons in a day = Outbreak

// Makinis na kurba mula sa mga punto (kapareho ng Clinic Visits Overview sa Dashboard)
export function smoothPath(pts: [number, number][]) {
    // Tuwid na guhit mula punto sa punto (zigzag), hindi kurba
    if (pts.length === 0) return "";
    return pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ");
}

export type DayPoint = { label: string; visits: number; reports: number; dental: number; /** YYYY-MM-DD (para sa link ng tuldok) */ key?: string };

// Green = clinic visits, Asul = health reports, Dilaw = dental reports
export const TREND_SERIES = [
    { key: "visits" as const, label: "Clinic Visits", color: "#15664f" },
    { key: "reports" as const, label: "Health Reports", color: "#2563eb" },
    { key: "dental" as const, label: "Dental Reports", color: "#f2b705" },
];

// Aling linya ang ipapakita ayon sa role: Dentist = dental lang; Doctor = walang dental
export function seriesFor(dentalOnly = false, noDental = false) {
    return TREND_SERIES.filter((s) => (dentalOnly ? s.key === "dental" : noDental ? s.key !== "dental" : true));
}

// Sukat at posisyon ng chart (ginagamit din ng FitTrendChart para sa pag-click sa tuldok)
export function trendGeometry(data: DayPoint[], W: number, H: number, dentalOnly = false, noDental = false) {
    const series = seriesFor(dentalOnly, noDental);
    const small = W < 600;
    const L = small ? 28 : 38;
    const R = small ? 8 : 30;
    const T = 14;
    const B = small ? 34 : 30;
    const plotW = W - L - R;
    const plotH = H - T - B;
    const baseY = T + plotH;

    // Gilid ay 0, 2, 4, 6, ... (laging kita ang Outbreak line)
    const peak = Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key])));
    // Dentist: walang Warning/Outbreak na guhit, kaya batay lang sa pinakamataas na bilang (min 6)
    const top = Math.max(dentalOnly ? 6 : OUTBREAK_PER_DAY + 2, Math.ceil((peak + 1) / 2) * 2);
    const step = top <= 20 ? 2 : Math.ceil(top / 8 / 2) * 2;
    const yMax = Math.ceil(top / step) * step;
    const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

    // Puwang sa kaliwa't kanan ng unang/huling punto para hindi maputol ang label ng petsa (hal. "Nov 7")
    const padX = small ? 24 : 18;
    const innerW = plotW - padX * 2;
    const x = (i: number) => L + padX + (data.length > 1 ? (innerW * i) / (data.length - 1) : innerW / 2);
    const y = (v: number) => T + plotH - (v / yMax) * plotH;
    return { small, L, R, T, B, plotW, plotH, baseY, yMax, ticks, x, y };
}

export function TrendSvg({
    data,
    W,
    H,
    gradientId,
    className,
    linkBase,
    linkSeries = [],
    dentalOnly = false,
    noDental = false,
}: {
    data: DayPoint[];
    W: number;
    H: number;
    gradientId: string;
    className: string;
    /** Kapag may laman: puwedeng i-click ang tuldok (may bilang) para makita sa Case Log ang records ng araw na iyon */
    linkBase?: string;
    /** Aling serye ang puwedeng i-click (ayon sa role) */
    linkSeries?: string[];
    /** Dentist: Dental Reports lang ang linya, at walang Warning/Outbreak na guhit */
    dentalOnly?: boolean;
    /** Doctor: walang linya ng Dental Reports */
    noDental?: boolean;
}) {
    const series = seriesFor(dentalOnly, noDental);
    const { small, L, R, baseY, ticks, x, y } = trendGeometry(data, W, H, dentalOnly, noDental);
    const dotShift = (i: number, key: (typeof series)[number]["key"]) => {
        const v = data[i][key];
        if (v <= 0) return 0;
        const same = series.filter((t) => data[i][t.key] === v).map((t) => t.key);
        if (same.length < 2) return 0;
        const gap = small ? 9 : 11;
        return (same.indexOf(key) - (same.length - 1) / 2) * gap;
    };

    // Gaano kadalas ang label ng araw sa ibaba (mas madalang sa phone)
    const every = Math.max(1, Math.ceil(data.length / (small ? 5 : 7)));
    const fs = small ? 15 : 14; // laki ng text sa loob ng chart

    const thresholds = dentalOnly
        ? []
        : [
            { value: WARNING_PER_DAY, label: `Warning · ${WARNING_PER_DAY}`, color: "#f59e0b" },
            { value: OUTBREAK_PER_DAY, label: `Outbreak · ${OUTBREAK_PER_DAY}`, color: "#dc2626" },
        ];

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Clinic visits, health reports and dental reports per day">
            {/* Malambot na kulay sa ilalim ng bawat linya (kanya-kanyang kulay) */}
            <defs>
                {series.map((s) => (
                    <linearGradient key={s.key} id={`${gradientId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
                    </linearGradient>
                ))}
            </defs>

            {/* grid + y labels */}
            {ticks.map((t) => (
                <g key={t}>
                    <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#d1d5db" strokeWidth={1} />
                    <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={fs} fill="#6b7280">
                        {t}
                    </text>
                </g>
            ))}

            {/* Warning / Outbreak na guhit */}
            {thresholds.map((th) => (
                <g key={th.value}>
                    <line x1={L} x2={W - R} y1={y(th.value)} y2={y(th.value)} stroke={th.color} strokeWidth={1.5} strokeDasharray="6 5" />
                    <text x={W - R} y={y(th.value) - 6} textAnchor="end" fontSize={fs + 1} fontWeight={700} fill={th.color}>
                        {th.label}
                    </text>
                </g>
            ))}

            {/* mga linya + tuldok: una ang Clinic Visits (makapal, nasa ilalim) para kita pa rin
                    ang Health/Dental kapag pareho ang bilang sa isang araw */}
            {series.map((s) => {
                const main = s.key === "visits";
                return (
                    <g key={s.key} data-series={s.key}>
                        {/* kulay sa ilalim ng linya */}
                        <path
                            d={`${smoothPath(data.map((d, i) => [x(i), y(d[s.key])]))} L${x(data.length - 1)},${baseY} L${x(0)},${baseY} Z`}
                            fill={`url(#${gradientId}-${s.key})`}
                            pointerEvents="none"
                        />
                        {/* Linya bawat pagitan ng dalawang araw. Kapag 0 ang dalawang dulo (walang kaso),
                                gray ang guhit sa ibaba para hindi magmukhang may kulay na linya sa 0. */}
                        {data.slice(1).map((d, i) => {
                            const a = data[i][s.key];
                            const b = d[s.key];
                            const flat = a === 0 && b === 0;
                            return (
                                <line
                                    key={i}
                                    x1={x(i)}
                                    y1={y(a)}
                                    x2={x(i + 1)}
                                    y2={y(b)}
                                    stroke={flat ? "#d1d5db" : s.color}
                                    strokeWidth={flat ? 2 : main ? 3 : 2.5}
                                    strokeLinecap="round"
                                    pointerEvents="none"
                                />
                            );
                        })}
                    </g>
                );
            })}

            {/* Kapag pareho ang bilang ng 2+ serye sa isang araw, magkapatong ang tuldok nila.
                    Bahagyang iusog pakaliwa/pakanan para makita at mapindot ang bawat isa. */}
            {/* Mga tuldok: hiwalay at nasa pinakaibabaw para mapindot ang tuldok ng LAHAT ng linya
                    (dati natatakpan ng kulay ng ibang linya ang tuldok ng Clinic Visits) */}
            {series.map((s) => (
                <g key={`dots-${s.key}`} data-series={s.key}>
                    {/* maliliit na tuldok na may puting gilid (gray kapag 0) */}
                    {data.map((d, i) => (
                        linkBase && d.key && d[s.key] > 0 && linkSeries.includes(s.key) ? (
                            // I-click: buksan ang Case Log ng araw na iyon (records ng seryeng ito lang)
                            <a key={i} href={`${linkBase}&day=${d.key}&series=${s.key}#case-log`} className="cursor-pointer">
                                <title>{`${d.label} · ${s.label}: ${d[s.key]} (click to view in Case Log)`}</title>
                                {/* mas malaking puwang na mapipindot (hindi kita) */}
                                <circle cx={x(i) + dotShift(i, s.key)} cy={y(d[s.key])} r={small ? 12 : 10} fill="transparent" />
                                <circle
                                    cx={x(i) + dotShift(i, s.key)}
                                    cy={y(d[s.key])}
                                    r={small ? 4.5 : 5}
                                    fill={s.color}
                                    stroke="#fff"
                                    strokeWidth={1.5}
                                />
                            </a>
                        ) : (
                            <circle
                                key={i}
                                cx={x(i) + dotShift(i, s.key)}
                                cy={y(d[s.key])}
                                r={d[s.key] > 0 ? (small ? 3.5 : 4) : small ? 2.5 : 3}
                                fill={d[s.key] > 0 ? s.color : "#d1d5db"}
                                stroke="#fff"
                                strokeWidth={1.5}
                            >
                                <title>{`${d.label} · ${s.label}: ${d[s.key]}`}</title>
                            </circle>
                        )
                    ))}
                </g>
            ))}

            {/* x labels: 1, 5, 10, 15, ... at huling araw */}
            {data.map((d, i) =>
                data.length <= (small ? 7 : 12) ? (
                    <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={fs} fill="#6b7280">
                        {d.label}
                    </text>
                ) : i === 0 || (i + 1) % every === 0 || i === data.length - 1 ? (
                    (i === data.length - 1 && (i + 1) % every !== 0 && data.length - 1 - (Math.floor((i + 1) / every) * every - 1) < (small ? 5 : 3)) ? null : (
                        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={fs} fill="#6b7280">
                            {d.label}
                        </text>
                    )
                ) : null,
            )}
        </svg>
    );
}