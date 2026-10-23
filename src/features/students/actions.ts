"use server";

// Server actions ng students feature. Manipis lang: kunin ang session at form data,
// tawagin ang service, tapos revalidate/redirect. Walang Prisma dito.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import * as studentService from "./service";
import { collect } from "./schema";
import type { Actor, StudentState } from "./types";

const BASE = "/dashboard/students";
const HEALTH_BASE = "/dashboard/student-health-records";
const ARCHIVE_BASE = "/dashboard/archive-records";

async function currentActor(): Promise<Actor | null> {
    const session = await getSession();
    if (!session) return null;
    return {
        userId: Number(session.userId),
        role: session.role,
        name: String(session.username ?? ""),
    };
}

function refreshLists() {
    revalidatePath(HEALTH_BASE);
    revalidatePath(ARCHIVE_BASE);
    revalidatePath("/dashboard");
}

export async function createStudent(
    _prev: StudentState,
    formData: FormData,
): Promise<StudentState> {
    const values = collect(formData);
    const actor = await currentActor();
    if (!actor) return { error: "Your session has expired. Please sign in again.", values };

    const error = await studentService.createStudent(actor, values);
    if (error) return { error, values };

    revalidatePath(BASE);
    revalidatePath(HEALTH_BASE); // health record pickers list students too
    revalidatePath("/dashboard");
    redirect(`${BASE}?saved=${encodeURIComponent(values["studentNumber"] ?? "")}`);
}

export async function updateStudent(
    _prev: StudentState,
    formData: FormData,
): Promise<StudentState> {
    const values = collect(formData);
    const actor = await currentActor();
    if (!actor) return { error: "Your session has expired. Please sign in again.", values };

    const error = await studentService.updateStudent(actor, values);
    if (error) return { error, values };

    revalidatePath(BASE);
    revalidatePath(HEALTH_BASE);
    redirect(`${BASE}?saved=${encodeURIComponent(values["studentNumber"] ?? "")}`);
}

export async function archiveStudent(formData: FormData) {
    const actor = await currentActor();
    if (!actor) return;

    await studentService.archiveStudent(actor, Number(formData.get("studentId")));
    refreshLists();
}

export async function restoreStudent(formData: FormData) {
    const actor = await currentActor();
    if (!actor) return;

    await studentService.restoreStudent(actor, Number(formData.get("studentId")));
    refreshLists();
}

export async function deleteStudent(formData: FormData) {
    const actor = await currentActor();
    if (!actor) return;

    const result = await studentService.deleteStudent(actor, Number(formData.get("studentId")));

    if (result.status === "retention") {
        redirect(`${ARCHIVE_BASE}?notice=retention&until=${encodeURIComponent(result.deletableOn)}`);
    }

    refreshLists();
    if (result.status === "deleted") redirect(`${ARCHIVE_BASE}?notice=deleted`);
}
