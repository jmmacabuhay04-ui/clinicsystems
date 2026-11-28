import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logAccess } from "@/lib/access-log";
import { buildCertificatePdf } from "./pdf";
import { BCAS_HEADER_HEIGHT, BCAS_HEADER_JPEG_BASE64, BCAS_HEADER_WIDTH } from "./header-image";

// Medical certificate ng estudyante na galing sa labas ng school.
// Nurse lang ang puwedeng mag-upload (POST) at mag-download (GET).
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = [
    {
        mime: "application/pdf",
        check: (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-",
    },
    {
        mime: "image/jpeg",
        check: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    },
    {
        mime: "image/png",
        check: (b: Buffer) =>
            b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    },
];

function safeFileName(name: string) {
    const cleaned = name.replace(/[^\w.\- ]+/g, "_").trim().slice(0, 200);
    return cleaned || "medical-certificate";
}

function text(message: string, status: number) {
    return new NextResponse(message, {
        status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}

// Nurse at Doctor: mag-upload at mag-view/download ng certificate.
export function canUploadCertificates(role: string) {
    return role === "nurse" || role === "doctor";
}

// POST ?clinic=1 (JSON: purpose, remarks): gumawa ng clinic medical certificate (PDF) at i-save sa record.
async function issueClinicCertificateInner(
    req: Request,
    id: number,
    session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
) {
    // Doctor lang ang puwedeng mag-issue ng clinic certificate
    if (session.role !== "doctor") return text("Forbidden", 403);

    let body: { purpose?: unknown; remarks?: unknown };
    try {
        body = await req.json();
    } catch {
        return text("Bad request", 400);
    }
    const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
    const remarks = typeof body.remarks === "string" ? body.remarks.trim() : "";
    if (!purpose || purpose.length > 200 || remarks.length > 500) {
        return text("Purpose is required (max 200 characters). Remarks max 500 characters.", 400);
    }

    const rows = await prisma.$queryRaw<
        {
            first_name: string;
            middle_name: string | null;
            last_name: string;
            student_number: string;
            date_of_birth: Date | null;
            gender: string | null;
        }[]
    >`
        SELECT first_name, middle_name, last_name, student_number, date_of_birth, gender
        FROM students WHERE student_id = ${id} AND archived_at IS NULL
    `;
    const s = rows[0];
    if (!s) return text("Not found", 404);

    // Diagnosis = complaint ng pinakabagong visit o case report (aktibo lang).
    const latestRows = await prisma.$queryRaw<{ complaint: string }[]>`
        SELECT complaint FROM (
            SELECT complaint, visit_date AS d, record_id AS id
            FROM health_records WHERE student_id = ${id} AND archived_at IS NULL
            UNION ALL
            SELECT complaint, report_date AS d, case_id AS id
            FROM health_case_reports WHERE student_id = ${id} AND archived_at IS NULL
        ) x
        ORDER BY d DESC, id DESC
        LIMIT 1
    `;
    const diagnosis = latestRows[0]?.complaint?.trim() ?? "";

    const middle = s.middle_name?.trim() ? ` ${s.middle_name.trim().charAt(0)}.` : "";
    const fullName = `${s.first_name.trim()}${middle} ${s.last_name.trim()}`;
    const issued = new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Manila",
    });

    // Edad mula sa date of birth (kung may nakalagay).
    let age: number | null = null;
    if (s.date_of_birth) {
        const dob = s.date_of_birth;
        const now = new Date();
        age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    }
    const ageSex = `${age !== null ? `${age} Years Old` : "-"} of ${s.gender?.trim() || "-"}`;

    const pdf = buildCertificatePdf(
        [
            // Layout na tugma sa print copy (certificate-print-sheet.tsx).
            { text: "BATANGAS COLLEGE OF ARTS AND SCIENCES", size: 15, bold: true, align: "center", gap: 4 },
            { text: "School Clinic", size: 12, align: "center", gap: 22 },
            { text: "Health Clinic", size: 24, bold: true, align: "center", gap: 46 },
            { text: `DATE: ${issued}`, size: 11, align: "right", gap: 34 },
            { text: "MEDICAL CERTIFICATE", size: 17, bold: true, align: "center", gap: 46 },
            { text: `This is to certify that Mr. / Mrs. ${fullName}`, size: 12, gap: 16 },
            {
                text: `Age / Sex: ${ageSex} has been seen and examined on ${issued}${diagnosis ? ` and was diagnosed to have ${diagnosis}` : ""}.`,
                size: 12,
                gap: 16,
            },
            { text: `I therefore recommend ${remarks || "None"}.`, size: 12, gap: 16 },
            {
                text: `This certificate is being issued upon the request of the above mentioned name for ${purpose} (excluding legal matters).`,
                size: 10,
                gap: 110,
            },
            { text: "______________________________", size: 11, align: "right", gap: 4 },
            { text: "MEDICAL CONSULTANT PHYSICIAN", size: 11, bold: true, align: "right", gap: 0 },
        ],
        {
            header: {
                jpeg: Buffer.from(BCAS_HEADER_JPEG_BASE64, "base64"),
                width: BCAS_HEADER_WIDTH,
                height: BCAS_HEADER_HEIGHT,
                drawWidth: 80,
            },
        },
    );

    const fileName = safeFileName(`clinic-certificate-${s.student_number}-${new Date().toISOString().slice(0, 10)}.pdf`);
    await prisma.$executeRaw`
        INSERT INTO student_medical_certificates
            (student_id, file_name, mime_type, file_size, file_data, uploaded_by, source)
        VALUES
            (${id}, ${fileName}, ${"application/pdf"}, ${pdf.length}, ${pdf}, ${Number(session.userId)}, ${"clinic"})
    `;

    await logAccess(
        { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
        "student_health_record",
        id,
        "create",
        "clinic medical certificate issued",
    );

    // Ibinabalik din ang datos para sa print copy (PrintHeader ng school) sa browser.
    return NextResponse.json({
        ok: true,
        certificate: {
            name: fullName,
            ageSex,
            issued,
            diagnosis,
            purpose,
            remarks,
        },
    });
}

// Balutin ang pag-issue para may mabalik na mensahe at ma-log ang totoong error sa server.
async function issueClinicCertificate(
    req: Request,
    id: number,
    session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
) {
    try {
        return await issueClinicCertificateInner(req, id, session);
    } catch (err) {
        console.error("[medical-certificate] clinic issue failed:", err);
        return text("Server error while issuing the certificate. Check the server log.", 500);
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
    const session = await getSession();
    if (!session || !canUploadCertificates(session.role)) return text("Forbidden", 403);

    const id = Number((await params).studentId);
    if (!id) return text("Bad request", 400);
    if (new URL(req.url).searchParams.get("clinic") === "1") return issueClinicCertificate(req, id, session);

    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES + 64 * 1024) return text("File is too large (max 5 MB).", 413);

    let form: FormData;
    try {
        form = await req.formData();
    } catch {
        return text("Could not read the upload.", 400);
    }

    const file = form.get("file");
    if (!(file instanceof File)) return text("No file selected.", 400);
    if (file.size === 0) return text("The file is empty.", 400);
    if (file.size > MAX_BYTES) return text("File is too large (max 5 MB).", 413);

    const buf = Buffer.from(await file.arrayBuffer());
    // Hindi lang ang browser type ang pinagbabatayan; tinitingnan din ang aktuwal na laman.
    const kind = ALLOWED.find((k) => k.mime === file.type && k.check(buf));
    if (!kind) return text("Only PDF, JPG, or PNG files are accepted.", 415);

    const student = await prisma.$queryRaw<{ student_id: number }[]>`
        SELECT student_id FROM students WHERE student_id = ${id} AND archived_at IS NULL
    `;
    if (!student[0]) return text("Not found", 404);

    const fileName = safeFileName(file.name);
    await prisma.$executeRaw`
        INSERT INTO student_medical_certificates
            (student_id, file_name, mime_type, file_size, file_data, uploaded_by)
        VALUES
            (${id}, ${fileName}, ${kind.mime}, ${buf.length}, ${buf}, ${Number(session.userId)})
    `;

    await logAccess(
        { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
        "student_health_record",
        id,
        "create",
        "medical certificate upload",
    );

    return NextResponse.json({ ok: true });
}

// GET ?inline=1 para makita sa browser (View); kung wala, ida-download (Download).
export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
    const session = await getSession();
    if (!session || !canUploadCertificates(session.role)) return text("Forbidden", 403);

    const id = Number((await params).studentId);
    if (!id) return text("Bad request", 400);
    const inline = new URL(req.url).searchParams.get("inline") === "1";

    // ?id=<certificate id> para sa partikular na upload (Medical Certificate tab); kung wala, ang pinakabago.
    const certId = Number(new URL(req.url).searchParams.get("id")) || 0;
    const rows = certId
        ? await prisma.$queryRaw<{ file_name: string; mime_type: string; file_data: Buffer }[]>`
            SELECT file_name, mime_type, file_data
            FROM student_medical_certificates
            WHERE student_id = ${id} AND id = ${certId}
            LIMIT 1
        `
        : await prisma.$queryRaw<{ file_name: string; mime_type: string; file_data: Buffer }[]>`
            SELECT file_name, mime_type, file_data
            FROM student_medical_certificates
            WHERE student_id = ${id} AND archived_at IS NULL
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        `;
    const cert = rows[0];
    if (!cert) return text("No medical certificate found.", 404);

    await logAccess(
        { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
        "student_health_record",
        id,
        "view",
        "medical certificate download",
    );

    return new NextResponse(new Uint8Array(cert.file_data), {
        headers: {
            "Content-Type": cert.mime_type,
            "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeFileName(cert.file_name)}"`,
            "Cache-Control": "no-store",
        },
    });
}

// PATCH ?id=<certificate id> na may body {"archived": true|false}: i-archive o i-restore ang upload (doctor lang).
export async function PATCH(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
    const session = await getSession();
    if (!session || session.role !== "doctor") return text("Forbidden", 403);

    const id = Number((await params).studentId);
    const certId = Number(new URL(req.url).searchParams.get("id")) || 0;
    if (!id || !certId) return text("Bad request", 400);

    let archived: unknown;
    try {
        archived = (await req.json())?.archived;
    } catch {
        return text("Bad request", 400);
    }
    if (typeof archived !== "boolean") return text("Bad request", 400);

    const updated = await prisma.$executeRaw`
        UPDATE student_medical_certificates
        SET archived_at = ${archived ? new Date() : null}
        WHERE student_id = ${id} AND id = ${certId}
    `;
    if (!updated) return text("Not found", 404);

    await logAccess(
        { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
        "student_health_record",
        id,
        "update",
        archived ? "medical certificate archived" : "medical certificate restored",
    );

    return NextResponse.json({ ok: true });
}

// DELETE ?id=<certificate id>: permanenteng burahin ang maling upload (nurse lang; walang retention).
export async function DELETE(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
    const session = await getSession();
    if (!session || session.role !== "nurse") return text("Forbidden", 403);

    const id = Number((await params).studentId);
    const certId = Number(new URL(req.url).searchParams.get("id")) || 0;
    if (!id || !certId) return text("Bad request", 400);

    const deleted = await prisma.$executeRaw`
        DELETE FROM student_medical_certificates
        WHERE student_id = ${id} AND id = ${certId}
    `;
    if (!deleted) return text("Not found", 404);

    await logAccess(
        { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
        "student_health_record",
        id,
        "delete",
        "medical certificate deleted",
    );

    return NextResponse.json({ ok: true });
}