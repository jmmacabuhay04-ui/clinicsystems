"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { TrendSvg, type DayPoint } from "./trend-svg";

// Case Trend chart na kusang sumusukat ng taas: ang 0 ng graph ay pumapantay sa guhit
// (border) sa itaas ng Warning/Outbreak sa Illness Breakdown (ang element na may id na `alignId`).
// Kapag hindi magkatabi ang dalawang kahon (hal. tablet), normal na proporsyon lang.
const AXIS_SPACE = 30; // espasyo ng petsa sa ilalim ng 0 (kapareho ng B sa TrendSvg)
const RATIO = 0.6;
const MIN_HEIGHT = 300; // kapag kaunti o walang laman ang Illness Breakdown

export default function FitTrendChart({
    data,
    alignId,
    className = "",
    linkBase,
    linkSeries,
    dentalOnly = false,
    noDental = false,
}: {
    data: DayPoint[];
    alignId: string;
    className?: string;
    linkBase?: string;
    linkSeries?: string[];
    dentalOnly?: boolean;
    noDental?: boolean;
}) {
    const box = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);

    useLayoutEffect(() => {
        const el = box.current;
        if (!el) return;
        const target = document.getElementById(alignId);

        const measure = () => {
            const w = Math.round(el.clientWidth);
            if (!w) return;
            let h = Math.round(w * RATIO);
            const prev = target?.previousElementSibling as HTMLElement | null;
            if (target && prev) {
                const me = el.getBoundingClientRect();
                const t = target.getBoundingClientRect();
                const sideBySide = t.left >= me.right;
                // Likas na puwesto ng guhit (dulo ng listahan + margin nito). Hindi ginagamit ang mismong
                // puwesto ng guhit dahil gumagalaw ito kapag humaba ang graph (mt-auto) at magpapaikot-ikot.
                const naturalTop = prev.getBoundingClientRect().bottom + parseFloat(getComputedStyle(prev).marginBottom || "0");
                if (sideBySide) h = Math.max(MIN_HEIGHT, Math.round(naturalTop - me.top + AXIS_SPACE));
            }
            setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
        };

        // Unang sukat: kusang tumatakbo ang ResizeObserver pagka-observe
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        // Nagbabago ang taas ng Illness Breakdown kapag binuksan ang "Others"
        if (target?.previousElementSibling) ro.observe(target.previousElementSibling);
        window.addEventListener("resize", measure);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [alignId]);

    return (
        <div ref={box} className={`w-full ${className}`} style={size ? { height: size.h } : { aspectRatio: `${1 / RATIO}` }}>
            {size && <TrendSvg data={data} W={size.w} H={size.h} gradientId="illness-area-lg" className="block h-full w-full" linkBase={linkBase} linkSeries={linkSeries} dentalOnly={dentalOnly} noDental={noDental} />}
        </div>
    );
}