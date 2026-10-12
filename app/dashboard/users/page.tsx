import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import UserForm from "./user-form";
import { resetUserPassword, verifyResetOtp } from "./reset-actions";
import LinkButton from "@/components/link-button";
import ConfirmSubmit from "@/components/confirm-submit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canCreateAccounts } from "@/lib/permissions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import RoleBadge from "@/components/role-badge";

type Props = { searchParams: Promise<{ reset?: string; otp?: string; err?: string }> };

const notices: Record<string, { tone: "green" | "red"; text: string }> = {
    done: { tone: "green", text: "Password changed successfully. Give the new password to the account owner." },
    failed: { tone: "red", text: "Could not send the OTP email. Check that the account uses a real email address and that GMAIL_USER / GMAIL_APP_PASSWORD are set in .env." },
    expired: { tone: "red", text: "The OTP has expired. Please send a new reset request." },
    locked: { tone: "red", text: "Too many wrong OTP attempts. Please send a new reset request." },
};

export default async function UsersPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canCreateAccounts(session.role)) redirect("/dashboard");
    const canReset = session.role === "admin" || session.role === "ittech";
    const { reset, otp, err } = await searchParams;
    const otpUserId = Number(otp) || 0;
    const isItTech = session.role === "ittech";

    const users = await prisma.user.findMany({
        select: { user_id: true, username: true, role: true, created_at: true },
        orderBy: { user_id: "asc" },
    });

    const otpUser = users.find((u) => u.user_id === otpUserId);
    const notice = reset ? notices[reset] : null;

    return (
        <main className="min-h-screen bg-muted p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-semibold text-[#15664f]">Manage Accounts</h1>

                </div>

                {notice && (
                    <div
                        className={
                            notice.tone === "green"
                                ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                                : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                        }
                    >
                        {notice.text}
                    </div>
                )}

                {otpUser && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {err
                            ? "Wrong OTP. Please try again."
                            : `An OTP was sent to ${otpUser.username}. Ask the account owner for the 6-digit code (valid for 10 minutes).`}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-[320px_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>New Account</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <UserForm />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>All Accounts ({users.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Reset Password</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u, i) => (
                                        <TableRow key={u.user_id}>
                                            <TableCell>{i + 1}</TableCell>
                                            <TableCell className="font-medium">{u.username}</TableCell>
                                            <TableCell>
                                                <RoleBadge role={u.role} />
                                            </TableCell>
                                            <TableCell>{u.created_at.toISOString().slice(0, 10)}</TableCell>
                                            <TableCell>
                                                {u.user_id === otpUserId ? (
                                                    /* STEP 2: enter OTP */
                                                    <form action={verifyResetOtp} className="flex items-center gap-2">
                                                        <input type="hidden" name="userId" value={u.user_id} />
                                                        <input
                                                            name="otp"
                                                            inputMode="numeric"
                                                            pattern="[0-9]{6}"
                                                            maxLength={6}
                                                            placeholder="6-digit OTP"
                                                            required
                                                            autoComplete="one-time-code"
                                                            suppressHydrationWarning
                                                            className="h-9 w-32 rounded-lg border border-amber-400 bg-white px-2 text-center text-sm tracking-widest outline-none focus:border-[#15664f]"
                                                        />
                                                        <ConfirmSubmit
                                                            title="Verify OTP?"
                                                            message={`The password of ${u.username} will be changed if the OTP is correct.`}
                                                            confirmLabel="Verify"

                                                            className="h-9 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                        >
                                                            Verify
                                                        </ConfirmSubmit>

                                                        <a href="/dashboard/users"
                                                            className="text-sm text-gray-500 hover:underline"
                                                        >
                                                            Cancel
                                                        </a>
                                                    </form>
                                                ) : (
                                                    /* STEP 1: new password */
                                                    <form action={resetUserPassword} className="flex items-center gap-2">
                                                        <input type="hidden" name="userId" value={u.user_id} />
                                                        <input
                                                            name="password"
                                                            type="password"
                                                            placeholder="New password"
                                                            minLength={8}
                                                            required
                                                            autoComplete="new-password"
                                                            suppressHydrationWarning
                                                            className="h-9 w-40 rounded-lg border border-gray-300 bg-white px-2 text-sm outline-none focus:border-[#15664f]"
                                                        />
                                                        <ConfirmSubmit
                                                            title="Send OTP to account owner?"
                                                            message={`A 6-digit OTP will be emailed to ${u.username}. The password will only change after you enter the OTP they give you.`}
                                                            confirmLabel="Send OTP"

                                                            className="h-9 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                        >
                                                            Reset
                                                        </ConfirmSubmit>
                                                    </form>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}