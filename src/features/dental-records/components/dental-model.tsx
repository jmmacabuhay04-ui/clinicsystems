"use client";

import { useEffect, useRef, useState } from "react";
import { DENTAL_MODEL_PHOTO } from "@/features/dental-records/dental-model-photo";

/* ------------------------------------------------------------------ */
/* Static artwork (gradients, jaw, gums). Ids are prefixed with "dm-"  */
/* so they cannot clash with other SVG ids in the app.                 */
/* ------------------------------------------------------------------ */

const DEFS_SVG = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="dm-enamel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D3CBB9"/><stop offset="0.2" stop-color="#F2EEE2"/>
      <stop offset="0.5" stop-color="#FFFFFF"/><stop offset="0.8" stop-color="#F0EBDD"/>
      <stop offset="1" stop-color="#CBC2AF"/>
    </linearGradient>
    <linearGradient id="dm-shadeU" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7A3A30" stop-opacity="0.38"/><stop offset="0.3" stop-color="#7A3A30" stop-opacity="0.08"/>
      <stop offset="0.65" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#9FB0C4" stop-opacity="0.22"/>
    </linearGradient>
    <linearGradient id="dm-shadeL" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#7A3A30" stop-opacity="0.38"/><stop offset="0.3" stop-color="#7A3A30" stop-opacity="0.08"/>
      <stop offset="0.65" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#9FB0C4" stop-opacity="0.22"/>
    </linearGradient>
    <linearGradient id="dm-gumU" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#C9524A"/><stop offset="0.55" stop-color="#E4756A"/><stop offset="1" stop-color="#F29A8D"/>
    </linearGradient>
    <linearGradient id="dm-gumL" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#C9524A"/><stop offset="0.55" stop-color="#E4756A"/><stop offset="1" stop-color="#F29A8D"/>
    </linearGradient>
    <linearGradient id="dm-plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#F3EEE5"/><stop offset="1" stop-color="#D5CCBE"/>
    </linearGradient>
    <linearGradient id="dm-wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#A89E8D"/><stop offset="0.45" stop-color="#D3CABB"/><stop offset="1" stop-color="#E6DFD3"/>
    </linearGradient>
    <linearGradient id="dm-post" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#EFEAE0"/><stop offset="1" stop-color="#CFC7B9"/>
    </linearGradient>
    <linearGradient id="dm-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F1F4F7"/><stop offset="0.35" stop-color="#B4BBC3"/>
      <stop offset="0.7" stop-color="#6F767E"/><stop offset="1" stop-color="#C9CED4"/>
    </linearGradient>
    <linearGradient id="dm-dentin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D7BD76"/><stop offset="0.5" stop-color="#EEDDA4"/><stop offset="1" stop-color="#D2B66C"/>
    </linearGradient>
    <linearGradient id="dm-cement" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D2BC84"/><stop offset="0.5" stop-color="#F1E4BC"/><stop offset="1" stop-color="#CDB57A"/>
    </linearGradient>
    <linearGradient id="dm-gumDetail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#EE8F82"/><stop offset="1" stop-color="#F6B9AE"/>
    </linearGradient>
    <pattern id="dm-gumDots" width="7" height="7" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="0.9" fill="#A83F37" opacity="0.18"/>
      <circle cx="5.5" cy="5.2" r="0.7" fill="#FFFFFF" opacity="0.22"/>
    </pattern>
    <filter id="dm-blurS" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="dm-blurM" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="dm-blurL" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
</svg>`;

/** Photo of the real model, stored as code in dental-model-photo.ts. The hotspot numbers below are pixels of this image. */
const PHOTO_SRC = DENTAL_MODEL_PHOTO;
const PHOTO_W = 640;
const PHOTO_H = 1254;

const JAW_SVG = `
<svg width="100%" viewBox="0 0 ${PHOTO_W} ${PHOTO_H}" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>Dental model, upper and lower teeth</title>
  <image href="${PHOTO_SRC}" width="${PHOTO_W}" height="${PHOTO_H}"/>
  <g data-dm-teeth></g>
</svg>`;

/* ------------------------------------------------------------------ */
/* Tooth data                                                          */
/* ------------------------------------------------------------------ */

type Kind = "incisor" | "canine" | "premolar" | "molar";
type Jaw = "upper" | "lower";

/** The 7 teeth of one quadrant, from the middle of the mouth outward. */
const POSITIONS: { kind: Kind; name: string }[] = [
    { kind: "incisor", name: "Central incisor" },
    { kind: "incisor", name: "Lateral incisor" },
    { kind: "canine", name: "Canine" },
    { kind: "premolar", name: "1st premolar" },
    { kind: "premolar", name: "2nd premolar" },
    { kind: "molar", name: "1st molar" },
    { kind: "molar", name: "2nd molar" },
];

/** Clickable area over each tooth in the photo: [centerX, centerY, radiusX, radiusY, rotationDegrees]. */
type Hotspot = [number, number, number, number, number];
const HOTSPOTS: Record<number, Hotspot> = {
    11: [249, 166, 44, 44, 0],
    12: [176, 198, 34, 44, 15],
    13: [113, 243, 27, 52, 3],
    14: [95, 305, 44, 42, 0],
    15: [90, 368, 45, 28, 0],
    16: [90, 420, 52, 28, 0],
    17: [92, 472, 52, 30, 0],
    21: [339, 158, 46, 42, 0],
    22: [424, 178, 38, 48, -10],
    23: [490, 222, 28, 52, -8],
    24: [515, 283, 52, 50, 0],
    25: [535, 348, 48, 30, 0],
    26: [540, 403, 50, 28, 0],
    27: [538, 462, 50, 32, 0],
    31: [360, 1088, 36, 38, 0],
    32: [424, 1075, 31, 38, -8],
    33: [477, 1035, 33, 46, 0],
    34: [512, 975, 38, 45, 0],
    35: [530, 910, 43, 40, 0],
    36: [545, 830, 46, 48, 0],
    37: [550, 745, 43, 45, 0],
    41: [290, 1088, 35, 38, 0],
    42: [222, 1070, 29, 42, 5],
    43: [177, 1030, 35, 48, 0],
    44: [143, 975, 38, 45, 0],
    45: [125, 910, 41, 38, 0],
    46: [108, 830, 47, 46, 0],
    47: [105, 745, 42, 42, 0],
};

const INFO: Record<Kind, { use: string; roots: string; rootsUpper?: string; rootsLower?: string }> = {
    incisor: { use: "Cuts and bites food.", roots: "1 root" },
    canine: { use: "Tears and holds food. Has the longest root.", roots: "1 long root" },
    premolar: { use: "Crushes food.", roots: "1 to 2 roots" },
    molar: { use: "Grinds food.", roots: "", rootsUpper: "3 roots", rootsLower: "2 roots" },
};

type Tooth = {
    id: number;
    spot: Hotspot;
    jaw: Jaw;
    kind: Kind;
    name: string;
    /** True for the patient's left side (drawn on the viewer's right). */
    left: boolean;
    /** FDI two-digit tooth number (permanent teeth 11-47) matching the chart grid. */
    fdi: number;
};

/** FDI quadrants: upper right 1x, upper left 2x, lower left 3x, lower right 4x. */
const TEETH: Tooth[] = [1, 2, 3, 4].flatMap((quadrant) =>
    POSITIONS.map((p, i) => {
        const fdi = quadrant * 10 + i + 1;
        return {
            id: (quadrant - 1) * 7 + i,
            spot: HOTSPOTS[fdi],
            jaw: (quadrant <= 2 ? "upper" : "lower") as Jaw,
            kind: p.kind,
            name: p.name,
            left: quadrant === 2 || quadrant === 3,
            fdi,
        };
    }),
);

const SHAPES = {
    incisor: {
        crown: "M85 170 C82 120 88 62 100 50 L140 50 C152 62 158 120 155 170 Z",
        roots: ["M85 170 C90 230 110 300 120 330 C130 300 150 230 155 170 Z"],
        canals: ["M120 150 C120 220 120 290 120 318"],
        chamber: "M108 160 C106 120 110 90 120 80 C130 90 134 120 132 160 Z",
    },
    canine: {
        crown: "M82 170 C80 120 95 80 120 40 C145 80 160 120 158 170 Z",
        roots: ["M82 170 C90 250 112 310 120 345 C128 310 150 250 158 170 Z"],
        canals: ["M120 150 C120 230 120 300 120 332"],
        chamber: "M106 160 C104 120 112 90 120 75 C128 90 136 120 134 160 Z",
    },
    premolar: {
        crown: "M82 170 C80 130 84 85 95 70 L108 62 L120 74 L132 62 L145 70 C156 85 160 130 158 170 Z",
        roots: ["M82 170 C88 240 108 300 118 325 L122 325 C132 300 152 240 158 170 Z"],
        canals: ["M120 150 C120 230 120 290 120 315"],
        chamber: "M106 160 C104 125 110 100 120 92 C130 100 136 125 134 160 Z",
    },
    molar: {
        crown: "M65 170 C60 130 62 90 75 75 L95 68 L108 80 L120 68 L132 80 L145 68 L165 75 C178 90 180 130 175 170 Z",
        roots: [
            "M65 170 L175 170 L128 192 L112 192 Z",
            "M65 170 C62 230 70 290 80 320 C92 300 105 230 112 170 Z",
            "M175 170 C178 230 170 290 160 320 C148 300 135 230 128 170 Z",
        ],
        rootsUpperExtra: "M108 170 C112 230 117 280 120 305 C123 280 128 230 132 170 Z",
        canals: ["M90 160 C88 220 84 280 82 305", "M150 160 C152 220 156 280 158 305"],
        canalsUpperExtra: "M120 160 C120 220 120 270 120 292",
        chamber: "M85 160 C82 120 90 100 120 98 C150 100 158 120 155 160 Z",
    },
} as const;

/** Full-tooth drawing (crown + roots + pulp). Static data only, no user input. */
function toothSVG(t: Tooth, showGum: boolean) {
    const s = SHAPES[t.kind];
    const upper = t.jaw === "upper";
    const roots: string[] = [...s.roots];
    const canals: string[] = [...s.canals];
    if (upper && t.kind === "molar") {
        const m = SHAPES.molar;
        roots.push(m.rootsUpperExtra);
        canals.push(m.canalsUpperExtra);
    }

    const gum = showGum
        ? `<rect x="25" y="168" width="190" height="184" rx="12" fill="url(#dm-gumDetail)" stroke="#D98F82"/>
           <rect x="25" y="168" width="190" height="184" rx="12" fill="url(#dm-gumDots)"/>
           <rect x="42" y="196" width="156" height="140" rx="10" fill="#F9E6CF" opacity="0.35"/>
           <path d="M25 168 Q120 178 215 168" fill="none" stroke="#B94A40" stroke-width="1.5"/>`
        : "";

    const body =
        gum +
        `<g filter="url(#dm-blurS)" opacity="0.25"><path d="${s.crown}" fill="#000" transform="translate(4 4)"/></g>` +
        roots
            .map((r) => `<path d="${r}" fill="url(#dm-cement)" stroke="#A8935A" stroke-width="1.5" stroke-linejoin="round"/>`)
            .join("") +
        `<path d="${s.crown}" fill="url(#dm-enamel)" stroke="#B4AA95" stroke-width="1.5" stroke-linejoin="round"/>` +
        `<path d="${s.crown}" fill="url(#dm-dentin)" transform="translate(120 170) scale(.78 .86) translate(-120 -170)"/>` +
        `<path d="${s.chamber}" fill="#E48A80" opacity=".9"/>` +
        canals
            .map((c) => `<path d="${c}" fill="none" stroke="#D0665C" stroke-width="3" stroke-linecap="round"/>`)
            .join("") +
        `<ellipse cx="${t.kind === "molar" ? 92 : 104}" cy="110" rx="5" ry="26" fill="#fff" opacity=".7" filter="url(#dm-blurS)"/>` +
        `<line x1="40" y1="170" x2="200" y2="170" stroke="#B94A40" stroke-width="1" stroke-dasharray="4 3"/>`;

    const flip = upper ? 'transform="translate(0,360) scale(1,-1)"' : "";
    return `<svg width="100%" viewBox="0 0 240 360" role="img" aria-label="Full ${t.name}, crown and root" xmlns="http://www.w3.org/2000/svg"><g ${flip}>${body}</g></svg>`;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(name: string, attrs: Record<string, string>) {
    const e = document.createElementNS(SVG_NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
}

function jawLabel(t: Tooth) {
    return `${t.jaw === "upper" ? "Upper" : "Lower"} ${t.left ? "left" : "right"}`;
}

const CSS = `
.dm-root .dm-jaw svg { display: block; margin: 0 auto; }
.dm-root .dm-jaw * { pointer-events: none; }
.dm-root .dm-jaw .tooth-g { pointer-events: auto; cursor: pointer; outline: none; }
.dm-root .dm-jaw .tooth-g .base { pointer-events: all; fill: rgba(255,255,255,0); stroke: rgba(255,255,255,0); stroke-width: 3; transition: fill .15s, stroke .15s; }
.dm-root .dm-jaw .tooth-g:hover .base { fill: rgba(255,201,60,.28); stroke: #E0B040; }
.dm-root .dm-jaw .tooth-g:focus-visible .base { stroke: #C98A00; }
.dm-root .dm-jaw .tooth-g.has .base { fill: rgba(21,102,79,.22); stroke: #15664f; }
.dm-root .dm-jaw .tooth-g.sel .base { fill: rgba(255,201,60,.38); stroke: #E0A100; stroke-width: 4; }
.dm-root .dm-swatch::before { content: ""; display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; border: 1px solid rgba(0,0,0,.25); background: var(--c); }
.dm-root .dm-fade { animation: dm-fade .25s ease; }
@keyframes dm-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .dm-root .dm-fade { animation: none; } }
`;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/** dental_records.tooth is VARCHAR(50). */
const MAX_LEN = 50;

const FULL_MOUTH = /full\s*mouth/i;
const RANGE = /^#?([1-4][1-7])\s*-\s*#?([1-4][1-7])$/;
const ALL_FDI = TEETH.map((t) => t.fdi);

/** Reads one comma-separated token of the Tooth field into tooth numbers.
 *  Understands "#26", "26", and ranges inside one quadrant such as "#11-17". */
function teethInToken(token: string): number[] {
    const range = token.trim().match(RANGE);
    if (range) {
        const a = Number(range[1]);
        const b = Number(range[2]);
        if (Math.floor(a / 10) !== Math.floor(b / 10) || a > b) return [];
        const out: number[] = [];
        for (let n = a; n <= b; n++) out.push(n);
        return out;
    }
    return Array.from(token.matchAll(/(?<!\d)([1-4][1-7])(?!\d)/g), (m) => Number(m[1]));
}

/** Tooth numbers typed in the Tooth field (11-17, 21-27, 31-37, 41-47).
 *  "Full mouth" counts as every tooth on the model. */
function parseFdi(value: string) {
    if (FULL_MOUTH.test(value)) return new Set(ALL_FDI);
    const found = new Set<number>();
    value.split(",").forEach((token) => teethInToken(token).forEach((n) => found.add(n)));
    return found;
}

/** Writes tooth numbers back as compactly as possible: runs of 3 or more in the
 *  same quadrant become a range, so all 28 teeth fit in the 50-character field. */
function formatFdi(teeth: Set<number>) {
    const parts: string[] = [];
    for (const quadrant of [1, 2, 3, 4]) {
        const positions = [1, 2, 3, 4, 5, 6, 7].filter((p) => teeth.has(quadrant * 10 + p));
        let i = 0;
        while (i < positions.length) {
            let j = i;
            while (j + 1 < positions.length && positions[j + 1] === positions[j] + 1) j++;
            if (j - i >= 2) {
                parts.push(`#${quadrant * 10 + positions[i]}-${quadrant * 10 + positions[j]}`);
            } else {
                for (let k = i; k <= j; k++) parts.push(`#${quadrant * 10 + positions[k]}`);
            }
            i = j + 1;
        }
    }
    return parts;
}

export default function DentalModel({
    initialValue = "",
    inputName = "tooth",
}: {
    /** Current value of the Tooth field when the form first renders. */
    initialValue?: string;
    /** name attribute of the Tooth input this model fills in. */
    inputName?: string;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [showGum, setShowGum] = useState(true);
    const [picked, setPicked] = useState<Set<number>>(() => parseFdi(initialValue));
    const [notice, setNotice] = useState("");

    function toothInput() {
        return rootRef.current
            ?.closest("form")
            ?.querySelector<HTMLInputElement>(`input[name="${inputName}"]`) ?? null;
    }

    // Draw the clickable teeth into the jaw SVG.
    useEffect(() => {
        const teethG = rootRef.current?.querySelector<SVGGElement>("[data-dm-teeth]");
        if (!teethG) return;

        TEETH.forEach((t) => {
            const [cx, cy, rx, ry, rot] = t.spot;
            const g = svgEl("g", {
                class: "tooth-g",
                tabindex: "0",
                role: "button",
                "aria-label": `Tooth ${t.fdi}, ${t.name}, ${jawLabel(t).toLowerCase()}`,
            }) as SVGGElement;
            g.dataset.id = String(t.id);

            const title = svgEl("title", {});
            title.textContent = `Tooth ${t.fdi} - ${t.name} (double-click to unselect)`;
            g.appendChild(title);

            g.appendChild(
                svgEl("ellipse", {
                    class: "base",
                    cx: String(cx),
                    cy: String(cy),
                    rx: String(rx),
                    ry: String(ry),
                    transform: `rotate(${rot} ${cx} ${cy})`,
                }),
            );

            g.addEventListener("click", () => {
                setSelected(t.id);
                setNotice("");
            });
            // Double click: alisin ang dilaw na highlight (wala nang napiling ngipin)
            g.addEventListener("dblclick", () => {
                setSelected(null);
                setNotice("");
            });
            g.addEventListener("keydown", (e) => {
                const ev = e as KeyboardEvent;
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setSelected(t.id);
                    setNotice("");
                }
            });

            teethG.appendChild(g);
        });

        return () => teethG.replaceChildren();
    }, []);

    // Follow whatever is typed in the Tooth field.
    useEffect(() => {
        const input = rootRef.current
            ?.closest("form")
            ?.querySelector<HTMLInputElement>(`input[name="${inputName}"]`);
        if (!input) return;

        const sync = () => setPicked(parseFdi(input.value));
        input.addEventListener("input", sync);
        return () => input.removeEventListener("input", sync);
    }, [inputName]);

    // Highlight the clicked tooth.
    useEffect(() => {
        rootRef.current?.querySelectorAll<SVGGElement>(".tooth-g").forEach((g) => {
            g.classList.toggle("sel", Number(g.dataset.id) === selected);
        });
    }, [selected]);

    // Outline the teeth that are listed in the Tooth field.
    useEffect(() => {
        rootRef.current?.querySelectorAll<SVGGElement>(".tooth-g").forEach((g) => {
            g.classList.toggle("has", picked.has(TEETH[Number(g.dataset.id)].fdi));
        });
    }, [picked]);

    function writeTooth(next: string) {
        const input = toothInput();
        if (!input) return;
        input.value = next;
        // Lets the sync listener above (and anything else watching the form) see the change.
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function setOnlyTooth(fdi: number) {
        setNotice("");
        writeTooth(`#${fdi}`);
    }

    function selectAll() {
        setNotice("");
        writeTooth(formatFdi(new Set(ALL_FDI)).join(", "));
    }

    function clearAll() {
        setNotice("");
        writeTooth("");
    }

    function toggleTooth(fdi: number) {
        const input = toothInput();
        if (!input) return;

        const teeth = parseFdi(input.value);
        // Keep any text that is not a tooth number, e.g. "#18" or a note, but drop "Full mouth"
        // because the tooth numbers below replace it.
        const extras = FULL_MOUTH.test(input.value)
            ? []
            : input.value
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t && teethInToken(t).length === 0);

        if (teeth.has(fdi)) teeth.delete(fdi);
        else teeth.add(fdi);

        const next = [...extras, ...formatFdi(teeth)].join(", ");
        if (next.length > MAX_LEN) {
            setNotice(`The Tooth field allows up to ${MAX_LEN} characters, so this change was not applied.`);
            return;
        }
        setNotice("");
        writeTooth(next);
    }

    const tooth = selected === null ? null : TEETH[selected];
    const info = tooth ? INFO[tooth.kind] : null;
    const roots =
        tooth && info
            ? tooth.kind === "molar"
                ? tooth.jaw === "upper"
                    ? info.rootsUpper
                    : info.rootsLower
                : info.roots
            : "";
    const isListed = tooth ? picked.has(tooth.fdi) : false;

    return (
        <div ref={rootRef} className="dm-root">
            <style>{CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: DEFS_SVG }} />

            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={selectAll}
                    className="h-9 rounded-lg bg-[#15664f] px-3 text-xs font-semibold text-white hover:bg-[#10523f]"
                >
                    Select all
                </button>
                <button
                    type="button"
                    onClick={clearAll}
                    className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Clear
                </button>
                <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${picked.size > 0 ? "bg-[#eef6f2] text-[#15664f]" : "bg-gray-100 text-gray-500"
                        }`}
                >
                    {picked.size === TEETH.length
                        ? `All ${TEETH.length} teeth selected`
                        : `${picked.size} of ${TEETH.length} teeth selected`}
                </span>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                {/* Model */}
                <div
                    className="dm-jaw mx-auto w-full max-w-[200px] shrink-0 rounded-xl border-2 border-[#cfe5d9] bg-white p-2 lg:mx-0"
                    dangerouslySetInnerHTML={{ __html: JAW_SVG }}
                />

                {/* Detalye ng napiling ngipin */}
                <div className="min-w-0 flex-1 rounded-xl border-2 border-[#cfe5d9] bg-white p-4" aria-live="polite">
                    {!tooth || !info ? (
                        <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-3 text-center">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-10 w-10 text-[#15664f]/30"
                                aria-hidden="true"
                            >
                                <path d="M7 3c-2.2 0-4 1.8-4 4.2 0 2 .8 3.3 1.5 4.6.6 1.2.9 2.6 1.1 4.2.3 2.4.8 5 2.4 5 1.3 0 1.6-1.8 2-3.6.3-1.4.8-2.4 2-2.4s1.7 1 2 2.4c.4 1.8.7 3.6 2 3.6 1.6 0 2.1-2.6 2.4-5 .2-1.6.5-3 1.1-4.2.7-1.3 1.5-2.6 1.5-4.6C21 4.8 19.2 3 17 3c-1.9 0-2.9 1-5 1S8.9 3 7 3z" />
                            </svg>
                            <p className="mt-2 text-sm font-semibold text-gray-700">No tooth selected</p>
                            <p className="text-xs text-gray-500">Click a tooth on the model to see its details.</p>
                        </div>
                    ) : (
                        <div className="dm-fade space-y-4">
                            {/* Pangalan + number */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">{tooth.name}</h3>
                                    <p className="text-xs text-gray-500">{jawLabel(tooth)}</p>
                                </div>
                                <span className="rounded-full bg-[#15664f] px-3 py-1 text-xs font-bold text-white">
                                    Tooth #{tooth.fdi}
                                </span>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-[100px_minmax(0,1fr)]">
                                {/* Maliit na drawing ng ngipin */}
                                <div>
                                    <div
                                        className="mx-auto max-w-[100px] rounded-lg bg-[#f6faf8] p-1"
                                        dangerouslySetInnerHTML={{ __html: toothSVG(tooth, showGum) }}
                                    />
                                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 text-xs text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={showGum}
                                            onChange={(e) => setShowGum(e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-gray-300 accent-[#15664f]"
                                        />
                                        Show gum
                                    </label>
                                </div>

                                <div className="min-w-0 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-[#f6faf8] p-2.5">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Function</p>
                                            <p className="mt-0.5 text-xs text-gray-800">{info.use}</p>
                                        </div>
                                        <div className="rounded-lg bg-[#f6faf8] p-2.5">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Roots</p>
                                            <p className="mt-0.5 text-xs text-gray-800">{roots}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
                                        <span className="dm-swatch" style={{ "--c": "#FFFFFF" } as React.CSSProperties}>Enamel</span>
                                        <span className="dm-swatch" style={{ "--c": "#EEDDA4" } as React.CSSProperties}>Dentin</span>
                                        <span className="dm-swatch" style={{ "--c": "#F1E4BC" } as React.CSSProperties}>Root</span>
                                        <span className="dm-swatch" style={{ "--c": "#E48A80" } as React.CSSProperties}>Pulp and nerve</span>
                                        {showGum && (
                                            <span className="dm-swatch" style={{ "--c": "#F6B9AE" } as React.CSSProperties}>Gum and bone</span>
                                        )}
                                    </div>

                                    <div className="rounded-lg border border-[#cfe5d9] p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Tooth field</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setOnlyTooth(tooth.fdi)}
                                                className="h-8 rounded-lg bg-[#15664f] px-3 text-xs font-semibold text-white hover:bg-[#10523f]"
                                            >
                                                Use only #{tooth.fdi}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleTooth(tooth.fdi)}
                                                className={`h-8 rounded-lg border px-3 text-xs font-semibold ${isListed
                                                    ? "border-red-300 bg-white text-red-600 hover:bg-red-50"
                                                    : "border-[#15664f] bg-white text-[#15664f] hover:bg-[#eef6f2]"
                                                    }`}
                                            >
                                                {isListed ? `Remove #${tooth.fdi}` : `Add #${tooth.fdi} to list`}
                                            </button>
                                        </div>
                                        {notice && <p className="mt-2 text-xs text-amber-700">{notice}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}