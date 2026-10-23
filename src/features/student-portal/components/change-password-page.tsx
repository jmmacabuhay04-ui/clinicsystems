import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, ShieldAlert } from "lucide-react";
import { getStudentSession } from "@/lib/auth/student-session";
import { PASSWORD_RULES_TEXT } from "@/lib/auth/password-policy";
import { changePassword } from "@/features/student-portal/change-password-actions";
import PasswordField from "@/components/shared/password-field";

const NOTICES: Record<string, string> = {
    "bad-current": "Your current password is incorrect.",
    weak: "The new password does not meet the policy.",
    same: "Pick a different password from your current one.",
};

export default async function StudentChangePasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ notice?: string; msg?: string; forced?: string }>;
}) {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const params = await searchParams;
    const notice = params.notice ? NOTICES[params.notice] : null;
    const forced = params.forced === "1";

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <div className="mx-auto max-w-lg space-y-5 p-4 py-8 md:p-6 md:py-12">
                {/* Walang "Back" kapag pinilit magpalit (hindi pa puwedeng umalis) */}
                {!forced && (
                    <Link
                        href="/student/profile"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#15664f] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to profile
                    </Link>
                )}

                <div className="flex items-center gap-3">
                    <LockKeyhole className="h-10 w-10 shrink-0 text-[#15664f]" />
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Change Password</h1>
                        <p className="text-sm text-gray-600">{PASSWORD_RULES_TEXT}</p>
                    </div>
                </div>

                {forced ? (
                    <div className="flex items-start gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                            <p className="text-sm font-semibold text-amber-900">
                                You need to change your password before continuing.
                            </p>
                            <p className="mt-1 text-sm text-amber-800">
                                Your current password was created by clinic staff, so they know it.
                                Choose your own so that only you do.
                            </p>
                        </div>
                    </div>
                ) : null}

                {notice ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        <p className="font-medium">{notice}</p>
                        {params.msg ? <p className="mt-1">{params.msg}</p> : null}
                    </div>
                ) : null}

                <form
                    action={changePassword}
                    className="space-y-4 rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6"
                >
                    <PasswordField
                        name="currentPassword"
                        label="Current Password"
                        required
                    />

                    <PasswordField
                        name="newPassword"
                        label="New Password"
                        required
                    />

                    <PasswordField
                        name="confirmPassword"
                        label="Confirm New Password"
                        required
                    />

                    <button
                        type="submit"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                    >
                        <LockKeyhole className="h-4 w-4" />
                        Save New Password
                    </button>
                </form>

                <p className="text-xs text-gray-500">
                    If you forget your password, visit the clinic and present your ID. It cannot
                    be emailed to you because the system does not store email addresses.
                </p>
            </div>
        </div>
    );
}