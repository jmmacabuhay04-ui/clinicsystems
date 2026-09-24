import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-session";
import { PASSWORD_RULES_TEXT } from "@/lib/password-policy";
import { changePassword } from "./actions";
import PasswordField from "@/components/password-field";

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
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-lg space-y-4 p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Change Password</h1>
                    <p className="mt-1 text-sm text-gray-600">{PASSWORD_RULES_TEXT}</p>
                </div>

                {forced ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-900">
                            You need to change your password before continuing.
                        </p>
                        <p className="mt-1 text-sm text-amber-800">
                            Your current password was created by clinic staff, so they know it.
                            Choose your own so that only you do.
                        </p>
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
                    className="space-y-4 rounded-lg border border-gray-200 bg-white p-5"
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
                        className="w-full rounded-lg bg-[#15664f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0f4d3b]"
                    >
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