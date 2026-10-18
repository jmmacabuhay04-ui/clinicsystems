import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = 5 * 1024 * 1024; // keep in sync with PhotoUpload maxMB
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export type PhotoFolder = "students" | "employees";

export type PhotoResult =
    | { ok: true; url: string | null } // url null = no new file was chosen
    | { ok: false; error: string };

/** Detect the real image type from the file's first bytes (not just its name). */
function detectExt(buf: Buffer): "jpg" | "png" | null {
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
    if (
        buf.length > 8 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    ) return "png";
    return null;
}

/**
 * Validates and saves the uploaded photo. Call with formData.get("photo").
 * Students are saved by default; pass "employees" for employee photos.
 */
export async function saveStudentPhoto(
    file: FormDataEntryValue | null,
    folder: PhotoFolder = "students",
): Promise<PhotoResult> {
    if (!(file instanceof File) || file.size === 0) return { ok: true, url: null };

    if (file.size > MAX_BYTES) {
        return { ok: false, error: "Photo must be 5 MB or smaller." };
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = detectExt(buf);
    if (!ext) return { ok: false, error: "Photo must be a JPG or PNG image." };

    const dir = path.join(UPLOAD_ROOT, folder);
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, name), buf);

    return { ok: true, url: `/uploads/${folder}/${name}` };
}

/** Deletes a previously saved photo file (ignores missing files). */
export async function deleteStudentPhoto(url: string | null | undefined) {
    if (!url) return;
    const match = url.match(/^\/uploads\/(students|employees)\/([^/]+)$/);
    if (!match) return;
    await unlink(path.join(UPLOAD_ROOT, match[1], path.basename(match[2]))).catch(() => { });
}