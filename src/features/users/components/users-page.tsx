import { redirect } from "next/navigation";
import { Fragment } from "react";
import Link from "next/link";
import { KeyRound, Mail, Pencil, ShieldCheck, Trash2, UserPlus, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import UserForm from "./user-form";
import { resetUserPassword, verifyResetOtp } from "@/features/users/reset-actions";
import { updateUser } from "@/features/users/actions";
import { requestDeleteOtp, confirmDeleteOtp } from "@/features/users/delete-actions";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import FlashMessage from "@/components/shared/flash-message";
import { canCreateAccounts } from "@/lib/permissions";
import RoleBadge from "@/components/shared/role-badge";
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

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:border-gray-100 md:py-0 md:hover:bg-[#f6faf8]";
const td =
    "flex items-start justify-between gap-3 px-4 py-1.5 text-right text-sm before:shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:text-gray-500 before:content-[attr(data-label)] md:table-cell md:py-3.5 md:text-left md:align-middle md:before:hidden";
// Para sa mga cell na may form: nasa ilalim ng label ang laman sa mobile.
const tdBlock = "block px-4 py-2 md:table-cell md:py-3.5 md:align-middle";
const mobileLabel = "mb-1 text-xs font-semibold uppercase text-gray-500 md:hidden";

const smallInput =
    "h-9 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm";
const btnGreen =
    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-xs font-semibold text-white hover:bg-[#10523f]";
const btnCancel = "inline-flex h-9 items-center px-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:underline";

function formatCreated(d: Date) {
    return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });
}

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
        select: { user_id: true, username: true, role: true, created_at: true, avatar: true },
        orderBy: { user_id: "asc" },
    });

    const otpUser = users.find((u) => u.user_id === otpUserId);
    const delUser = users.find((u) => u.user_id === delUserId);
    const notice = reset ? notices[reset] : null;

    const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
        acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
    }, {});
    const ROLE_ORDER = ["admin", "ittech", "doctor", "nurse", "dentist"];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <UsersRound className="h-10 w-10 shrink-0 text-[#15664f]" />
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Manage Accounts</h1>
                    <p className="text-sm text-gray-600">Create staff accounts, change roles, and reset passwords.</p>
                </div>
            </div>

            {notice &&
                (notice.tone === "green" ? (
                    <FlashMessage clearParam="reset">{notice.text}</FlashMessage>
                ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{notice.text}</div>
                ))}

            {otpUser && (
                <div className="flex items-start gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <p>
                        {err
                            ? "Wrong OTP. Please try again."
                            : `An OTP was sent to ${otpUser.username}. Ask the account owner for the 6-digit code (valid for 10 minutes).`}
                    </p>
                </div>
            )}

            {delUser && (
                <div className="flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <p>
                        {derr
                            ? "Wrong OTP. Please try again."
                            : `A deletion OTP was sent to ${delUser.username}. Ask the account owner for the 6-digit code (valid for 5 minutes).`}
                    </p>
                </div>
            )}

            {/* Role summary */}
            <section className="flex flex-wrap gap-2">
                <span className="inline-flex h-9 items-center gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-sm font-semibold text-gray-800">
                    Total
                    <span className="rounded-full bg-[#15664f] px-2 py-0.5 text-[11px] font-bold text-white">{users.length}</span>
                </span>
                {ROLE_ORDER.filter((r) => roleCounts[r]).map((r) => (
                    <span
                        key={r}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-sm text-gray-700"
                    >
                        <RoleBadge role={r} />
                        <span className="font-bold text-gray-900">{roleCounts[r]}</span>
                    </span>
                ))}
            </section>

            {/* Nakasalansan hanggang 2xl para buong lapad ang table at walang horizontal scroll */}
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[320px_minmax(0,1fr)]">
                {/* New account */}
                <section className={`${card} min-w-0 self-start p-5 md:p-6`}>
                    <div className="mb-5 flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                            <UserPlus className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">New Account</h2>
                            <p className="text-sm text-gray-500">Add a clinic staff login.</p>
                        </div>
                    </div>
                    <UserForm />
                </section>

                {/* All accounts */}
                <section className={`${card} min-w-0 self-start overflow-hidden`}>
                    <div className="flex items-center justify-between gap-3 p-5 md:px-6">
                        <h2 className="text-lg font-semibold text-gray-900">All Accounts</h2>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-xs font-semibold text-[#15664f]">
                            {users.length} account{users.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    <div className="border-t border-gray-100 p-3 md:p-0">
                        <table className="block w-full text-left md:table md:table-auto">
                            <thead className="hidden bg-[#f6faf8] text-xs uppercase tracking-wide text-gray-600 md:table-header-group">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Account</th>
                                    <th className="px-4 py-3 font-semibold">Role</th>
                                    <th className="px-4 py-3 font-semibold">Created</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Reset Password</th>
                                    {canReset && <th className="px-4 py-3 font-semibold">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group">
                                {users.map((u) => {
                                    const isMe = u.user_id === session.userId;
                                    return (
                                        <Fragment key={u.user_id}>
                                            <tr className={tr}>
                                                <td data-label="Account" className={td}>
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        {/* Profile picture ng account (galing sa Settings); initial kapag wala pa */}
                                                        {u.avatar ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={u.avatar}
                                                                alt=""
                                                                className="hidden h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#15664f]/30 md:block"
                                                            />
                                                        ) : (
                                                            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-xs font-bold text-[#15664f] md:flex">
                                                                {u.username.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                                                            {/* Puwedeng bumaba sa "@" lang, hindi sa gitna ng salita */}
                                                            <span className="min-w-0 font-semibold text-gray-900 [overflow-wrap:anywhere] md:[overflow-wrap:normal]">
                                                                {u.username.split("@")[0]}
                                                                {u.username.includes("@") && (
                                                                    <>
                                                                        <wbr />@{u.username.split("@").slice(1).join("@")}
                                                                    </>
                                                                )}
                                                            </span>
                                                            {isMe && (
                                                                <span className="shrink-0 rounded-full bg-[#15664f] px-2 py-0.5 text-[10px] font-bold text-white">
                                                                    You
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td data-label="Role" className={td}>
                                                    <RoleBadge role={u.role} />
                                                </td>
                                                <td data-label="Created" className={`${td} text-gray-600 md:whitespace-nowrap`}>
                                                    {formatCreated(u.created_at)}
                                                </td>
                                                <td className={tdBlock}>
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
                                                                className={`${smallInput} w-32 border-amber-400 text-center tracking-widest`}
                                                            />
                                                            <ConfirmSubmit
                                                                title="Verify OTP?"
                                                                message={`The password of ${u.username} will be changed if the OTP is correct.`}
                                                                confirmLabel="Verify"
                                                                className={btnGreen}
                                                            >
                                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                                Verify
                                                            </ConfirmSubmit>
                                                            <a href="/dashboard/users" className={btnCancel}>
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
                                                                className={`${smallInput} min-w-0 flex-1 md:w-36 md:flex-none`}
                                                            />
                                                            <ConfirmSubmit
                                                                title="Send OTP to account owner?"
                                                                message={`A 6-digit OTP will be emailed to ${u.username}. The password will only change after you enter the OTP they give you.`}
                                                                confirmLabel="Send OTP"
                                                                className={btnGreen}
                                                            >
                                                                <KeyRound className="h-3.5 w-3.5" />
                                                                Reset
                                                            </ConfirmSubmit>
                                                        </form>
                                                    )}
                                                </td>

                                                {canReset && (
                                                    <td className={tdBlock}>
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
                                                                    className={`${smallInput} w-32 border-red-400 text-center tracking-widest focus:border-red-600 focus:ring-red-200`}
                                                                />
                                                                <ConfirmSubmit
                                                                    title="Permanently delete account?"
                                                                    message={`The account ${u.username} will be permanently deleted if the OTP is correct. This can't be undone.`}
                                                                    confirmLabel="Delete"
                                                                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    Confirm Delete
                                                                </ConfirmSubmit>
                                                                <a href="/dashboard/users" className={btnCancel}>
                                                                    Cancel
                                                                </a>
                                                            </form>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <Link
                                                                    href={`/dashboard/users?edit=${u.user_id}`}
                                                                    className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold ${u.user_id === editId
                                                                        ? "border-[#15664f] bg-[#eef6f2] text-[#15664f]"
                                                                        : "border-[#15664f] bg-white text-[#15664f] hover:bg-[#eef6f2]"
                                                                        }`}
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                    Edit
                                                                </Link>
                                                                {/* DELETE STEP 1: send OTP to the email of the account being deleted */}
                                                                <form action={requestDeleteOtp}>
                                                                    <input type="hidden" name="userId" value={u.user_id} />
                                                                    <button
                                                                        type="submit"
                                                                        title={`Send a deletion OTP to ${u.username}`}
                                                                        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-300 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                        Delete
                                                                    </button>
                                                                </form>
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>

                                            {canReset && u.user_id === editId && (
                                                <tr className="mb-3 block rounded-lg border border-[#cfe5d9] bg-[#eef6f2] md:mb-0 md:table-row md:rounded-none md:border-0">
                                                    <td colSpan={5} className="block px-4 py-4 md:table-cell">
                                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#15664f]">
                                                            Edit account
                                                        </p>
                                                        <form action={updateUser} className="flex flex-wrap items-center gap-3">
                                                            <input type="hidden" name="userId" value={u.user_id} />
                                                            <input
                                                                name="username"
                                                                type="email"
                                                                defaultValue={u.username}
                                                                required
                                                                suppressHydrationWarning
                                                                className={`${smallInput} w-full sm:w-72`}
                                                            />
                                                            <select name="role" defaultValue={u.role} className={smallInput}>
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
                                                                className={btnGreen}
                                                            >
                                                                Save Changes
                                                            </ConfirmSubmit>
                                                            <Link href="/dashboard/users" className={btnCancel}>
                                                                Cancel
                                                            </Link>
                                                        </form>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}