import { redirect } from "next/navigation";
import { Fragment } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import UserForm from "./user-form";
import { resetUserPassword, verifyResetOtp } from "./reset-actions";
import { updateUser } from "./actions";
import { requestDeleteOtp, confirmDeleteOtp } from "./delete-actions";
import ConfirmSubmit from "@/components/confirm-submit";
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

type Props = {
    searchParams: Promise<{
        reset?: string;
        otp?: string;
        err?: string;
        edit?: string;
        del?: string;
        derr?: string;
    }>;
};

const notices: Record<string, { tone: "green" | "red"; text: string }> = {
    done: { tone: "green", text: "Password changed successfully. Give the new password to the account owner." },
    failed: { tone: "red", text: "Could not send the OTP email. Check that the account uses a real email address and that GMAIL_USER / GMAIL_APP_PASSWORD are set in .env." },
    expired: { tone: "red", text: "The OTP has expired. Please send a new reset request." },
    locked: { tone: "red", text: "Too many wrong OTP attempts. Please send a new reset request." },
    updated: { tone: "green", text: "Account updated." },
    deleted: { tone: "green", text: "Account deleted." },
    invalid: { tone: "red", text: "Invalid email or role." },
    notfound: { tone: "red", text: "Account not found." },
    exists: { tone: "red", text: "That email is already used by another account." },
    self: { tone: "red", text: "You can't delete your own account." },
    lastadmin: { tone: "red", text: "You can't delete or demote the last Administrator." },
    linked: { tone: "red", text: "This account has linked records and can't be deleted." },
    deletefailed: { tone: "red", text: "Could not delete the account." },
    delsavefailed: { tone: "red", text: "Could not create the deletion request. Check the server terminal; the delete_account_requests table may be missing." },
    delmailfailed: { tone: "red", text: "Could not send the deletion OTP to the account owner's email. Check that the account uses a real email address and that GMAIL_USER / GMAIL_APP_PASSWORD are set in .env." },
    delexpired: { tone: "red", text: "The deletion OTP has expired. Please press Delete again to get a new code." },
    dellocked: { tone: "red", text: "Too many wrong OTP attempts. Please press Delete again to get a new code." },
    noactor: { tone: "red", text: "Could not identify your account. Please log in again." },
};

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table. (Pinapasa sa shadcn Table components bilang className.)
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b";
const td =
    "flex items-start justify-between gap-3 px-4 py-1.5 text-right before:shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:text-gray-500 before:content-[attr(data-label)] md:table-cell md:py-4 md:text-left md:before:hidden";
// Para sa mga cell na may form: nasa ilalim ng label ang laman sa mobile.
const tdBlock = "block px-4 py-2 md:table-cell md:py-4";
const mobileLabel = "mb-1 text-xs font-semibold uppercase text-gray-500 md:hidden";

export default async function UsersPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canCreateAccounts(session.role)) redirect("/dashboard");
    const canReset = session.role === "admin" || session.role === "ittech";
    const { reset, otp, err, edit, del, derr } = await searchParams;
    const otpUserId = Number(otp) || 0;
    const editId = Number(edit) || 0;
    const delUserId = Number(del) || 0;

    const users = await prisma.user.findMany({
        select: { user_id: true, username: true, role: true, created_at: true },
        orderBy: { user_id: "asc" },
    });

    const otpUser = users.find((u) => u.user_id === otpUserId);
    const delUser = users.find((u) => u.user_id === delUserId);
    const notice = reset ? notices[reset] : null;

    return (
        <main className="min-h-screen min-w-0 bg-[] p-4 md:p-6">
            {/* FIX 1: mas malapad na container (dating max-w-6xl) */}
            <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Manage Accounts</h1>
                </div>

                {notice && (
                    <div
                        className={
                            notice.tone === "green"
                                ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                                : "rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
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

                {delUser && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {derr
                            ? "Wrong OTP. Please try again."
                            : `A deletion OTP was sent to ${delUser.username}. Ask the account owner for the 6-digit code (valid for 5 minutes).`}
                    </div>
                )}

                {/* Nakasalansan hanggang lg para may sapat na lapad ang table sa tablet */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>New Account</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <UserForm />
                        </CardContent>
                    </Card>

                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>All Accounts ({users.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 md:overflow-x-auto md:px-6">
                            <Table className="block md:table">
                                <TableHeader className="hidden md:table-header-group">
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Reset Password</TableHead>
                                        {canReset && <TableHead>Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="block md:table-row-group">
                                    {users.map((u, i) => (
                                        <Fragment key={u.user_id}>
                                            <TableRow className={tr}>
                                                <TableCell data-label="ID" className={td}>
                                                    {i + 1}
                                                </TableCell>
                                                <TableCell data-label="Email" className={`${td} break-all font-medium`}>
                                                    {u.username}
                                                </TableCell>
                                                <TableCell data-label="Role" className={td}>
                                                    <RoleBadge role={u.role} />
                                                </TableCell>
                                                <TableCell data-label="Created" className={td}>
                                                    {u.created_at.toISOString().slice(0, 10)}
                                                </TableCell>
                                                <TableCell className={tdBlock}>
                                                    <p className={mobileLabel}>Reset Password</p>
                                                    {u.user_id === otpUserId ? (
                                                        /* STEP 2: enter OTP */
                                                        <form action={verifyResetOtp} className="flex flex-wrap items-center gap-2">
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
                                                                className="h-9 w-32 rounded-lg border border-amber-400 bg-white px-2 text-center text-base tracking-widest outline-none focus:border-[#15664f] md:text-sm"
                                                            />
                                                            <ConfirmSubmit
                                                                title="Verify OTP?"
                                                                message={`The password of ${u.username} will be changed if the OTP is correct.`}
                                                                confirmLabel="Verify"
                                                                className="h-9 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                            >
                                                                Verify
                                                            </ConfirmSubmit>
                                                            <a href="/dashboard/users" className="text-sm text-gray-500 hover:underline">
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
                                                                className="h-9 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 text-base outline-none focus:border-[#15664f] md:w-32 md:flex-none md:text-sm"
                                                            />
                                                            <ConfirmSubmit
                                                                title="Send OTP to account owner?"
                                                                message={`A 6-digit OTP will be emailed to ${u.username}. The password will only change after you enter the OTP they give you.`}
                                                                confirmLabel="Send OTP"
                                                                className="h-9 shrink-0 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                            >
                                                                Reset
                                                            </ConfirmSubmit>
                                                        </form>
                                                    )}
                                                </TableCell>

                                                {canReset && (
                                                    <TableCell className={tdBlock}>
                                                        <p className={mobileLabel}>Actions</p>
                                                        {u.user_id === delUserId ? (
                                                            /* DELETE STEP 2: enter the OTP sent to the account owner's email */
                                                            <form action={confirmDeleteOtp} className="flex flex-wrap items-center gap-2">
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
                                                                    className="h-9 w-32 rounded-lg border border-red-400 bg-white px-2 text-center text-base tracking-widest outline-none focus:border-red-600 md:text-sm"
                                                                />
                                                                <ConfirmSubmit
                                                                    title="Permanently delete account?"
                                                                    message={`The account ${u.username} will be permanently deleted if the OTP is correct. This can't be undone.`}
                                                                    confirmLabel="Delete"
                                                                    className="h-9 whitespace-nowrap rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                                                                >
                                                                    Confirm Delete
                                                                </ConfirmSubmit>
                                                                <a href="/dashboard/users" className="text-sm text-gray-500 hover:underline">
                                                                    Cancel
                                                                </a>
                                                            </form>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <Link
                                                                    href={`/dashboard/users?edit=${u.user_id}`}
                                                                    className="inline-flex h-9 items-center whitespace-nowrap rounded-lg border border-[#15664f] px-3 text-sm font-semibold text-[#15664f] hover:bg-[#15664f]/10"
                                                                >
                                                                    Edit
                                                                </Link>
                                                                {/* DELETE STEP 1: send OTP to the email of the account being deleted */}
                                                                <form action={requestDeleteOtp}>
                                                                    <input type="hidden" name="userId" value={u.user_id} />
                                                                    <button
                                                                        type="submit"
                                                                        title={`Send a deletion OTP to ${u.username}`}
                                                                        className="h-9 whitespace-nowrap rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </form>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>

                                            {canReset && u.user_id === editId && (
                                                <TableRow className="mb-3 block rounded-lg border border-gray-200 bg-muted/50 md:mb-0 md:table-row md:rounded-none md:border-0">
                                                    <TableCell colSpan={6} className="block md:table-cell">
                                                        <form action={updateUser} className="flex flex-wrap items-center gap-3">
                                                            <input type="hidden" name="userId" value={u.user_id} />
                                                            <input
                                                                name="username"
                                                                type="email"
                                                                defaultValue={u.username}
                                                                required
                                                                suppressHydrationWarning
                                                                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-base outline-none hover:border-[#15664f] focus:border-[#15664f] sm:w-64 md:text-sm"
                                                            />
                                                            <select
                                                                name="role"
                                                                defaultValue={u.role}
                                                                className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-base outline-none hover:border-[#15664f] focus:border-[#15664f] md:text-sm"
                                                            >
                                                                <option value="admin">Administrator</option>
                                                                <option value="ittech">IT Technician</option>
                                                                <option value="doctor">Doctor</option>
                                                                <option value="nurse">Nurse</option>
                                                                <option value="dentist">Dentist</option>
                                                            </select>
                                                            <ConfirmSubmit
                                                                title="Save changes?"
                                                                message={`Update the account ${u.username}?`}
                                                                confirmLabel="Save"
                                                                className="h-9 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                            >
                                                                Save
                                                            </ConfirmSubmit>
                                                            <Link href="/dashboard/users" className="text-sm text-gray-500 hover:underline">
                                                                Cancel
                                                            </Link>
                                                        </form>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
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