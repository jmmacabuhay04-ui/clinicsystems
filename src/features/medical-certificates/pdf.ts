// PDF na walang external library (A4, Helvetica). ASCII lang ang text; ang ibang character ay papalitan ng "?".
// May opsyon para sa header na larawan (JPEG).

export type PdfLine = { text: string; size?: number; bold?: boolean; align?: "left" | "center" | "right"; gap?: number };

export type PdfHeaderImage = { jpeg: Buffer; width: number; height: number; drawWidth?: number };

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 72;
const HEADER_W = 260; // default na lapad ng header sa PDF (points)

function ascii(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e]/g, "?");
}

function escapePdf(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Hinahati ang mahabang linya para hindi lumampas sa page.
function wrap(text: string, size: number): string[] {
    const maxChars = Math.floor((PAGE_W - MARGIN * 2) / (size * 0.5));
    const words = text.split(/\s+/).filter(Boolean);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
        const next = cur ? `${cur} ${w}` : w;
        if (next.length > maxChars && cur) {
            out.push(cur);
            cur = w;
        } else {
            cur = next;
        }
    }
    out.push(cur);
    return out;
}

// Eksaktong lapad ng bawat character sa Helvetica at Helvetica-Bold (ASCII 32-126, per 1000 em).
const W_REG = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
    278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667,
    611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833,
    556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const W_BOLD = [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
    333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667,
    611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889,
    611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

function textWidth(s: string, size: number, bold: boolean): number {
    const table = bold ? W_BOLD : W_REG;
    let total = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        total += c >= 32 && c <= 126 ? table[c - 32] : 556;
    }
    return (total / 1000) * size;
}

export function buildCertificatePdf(lines: PdfLine[], opts: { header?: PdfHeaderImage } = {}): Buffer {
    const ops: string[] = [];
    let y = PAGE_H - MARGIN;

    // Header na larawan sa itaas, nakasentro.
    let imageOp = "";
    const header = opts.header;
    if (header) {
        const drawW = header.drawWidth ?? HEADER_W;
        const drawH = (drawW * header.height) / header.width;
        const x = (PAGE_W - drawW) / 2;
        const imgY = PAGE_H - MARGIN - drawH;
        imageOp = `q ${drawW} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${imgY.toFixed(2)} cm /Im1 Do Q`;
        y = imgY - 12; // puwang sa pagitan ng logo at ng text (mt-2 sa print header)
    }

    for (const line of lines) {
        const size = line.size ?? 11;
        const font = line.bold ? "F2" : "F1";
        const pieces = line.text ? wrap(ascii(line.text), size) : [""];
        for (const piece of pieces) {
            if (piece) {
                const width = textWidth(piece, size, !!line.bold);
                const x =
                    line.align === "center"
                        ? (PAGE_W - width) / 2
                        : line.align === "right"
                            ? PAGE_W - MARGIN - width
                            : MARGIN;
                ops.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdf(piece)}) Tj ET`);
            }
            y -= size + 4;
        }
        y -= line.gap ?? 6;
    }

    const content = Buffer.from([imageOp, ...ops].filter(Boolean).join("\n"), "latin1");

    // Bawat object ay Buffer para tama ang byte offset ng binary na larawan.
    const objects: Buffer[] = [];
    const add = (s: string) => objects.push(Buffer.from(s, "latin1"));
    const xobject = header ? " /XObject << /Im1 7 0 R >>" : "";
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >>${xobject} >> >>`,
    );
    objects.push(
        Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "latin1"), content, Buffer.from("\nendstream", "latin1")]),
    );
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    if (header) {
        objects.push(
            Buffer.concat([
                Buffer.from(
                    `<< /Type /XObject /Subtype /Image /Width ${header.width} /Height ${header.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${header.jpeg.length} >>\nstream\n`,
                    "latin1",
                ),
                header.jpeg,
                Buffer.from("\nendstream", "latin1"),
            ]),
        );
    }

    const parts: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
    let pos = parts[0].length;
    const offsets: number[] = [];
    objects.forEach((body, i) => {
        offsets.push(pos);
        const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, "latin1"), body, Buffer.from("\nendobj\n", "latin1")]);
        parts.push(chunk);
        pos += chunk.length;
    });
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
    xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
    parts.push(Buffer.from(xref, "latin1"));
    return Buffer.concat(parts);
}