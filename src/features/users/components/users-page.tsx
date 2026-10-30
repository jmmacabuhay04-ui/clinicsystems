import { redirect } from "next/navigation";
import { Fragment } from "react";
import Link from "next/link";
import { KeyRound, Mail, ShieldCheck, Trash2 } from "lucide-react";
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
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";
import PasswordInput from "@/components/shared/password-input";
type Props = {
    searchParams: Promise<{
        reset?: string;
        otp?: string;
        err?: string;
        edit?: string;
        del?: string;
        derr?: string;
        pw?: string;
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

// Mobile: bawat row ay card. md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:border-gray-100 md:py-0 md:hover:bg-[#f6faf8]";

const smallInput =
    "h-9 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm";
const btnGreen =
    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]";
const btnCancel = "inline-flex h-9 items-center px-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:underline";

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
    const { reset, otp, err, edit, del, derr, pw } = await searchParams;
    const pwId = Number(pw) || 0;
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
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Manage Accounts</h1>
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
                    <span className="rounded-full bg-[#15664f] px-2 py-0.5 text-sm font-semibold text-white">{users.length}</span>
                </span>
                {ROLE_ORDER.filter((r) => roleCounts[r]).map((r) => (
                    <span
                        key={r}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-sm text-gray-600"
                    >
                        <RoleBadge role={r} />
                        <span className="font-semibold text-gray-900">{roleCounts[r]}</span>
                    </span>
                ))}
            </section>

            {/* Nakasalansan hanggang 2xl para buong lapad ang table at walang horizontal scroll */}
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[320px_minmax(0,1fr)]">
                {/* New account */}
                <section className={`${card} min-w-0 self-start p-5 md:p-6`}>
                    <div className="mb-5 flex items-start gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">New Account</h2>
                            <p className="text-sm text-gray-600">Add a clinic staff login.</p>
                        </div>
                    </div>
                    <UserForm />
                </section>

                {/* All accounts */}
                <section className={`${card} min-w-0 self-start overflow-hidden`}>
                    <div className="flex items-center justify-between gap-3 p-5 md:px-6">
                        <h2 className="text-lg font-semibold text-gray-900">All Accounts</h2>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                            {users.length} account{users.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    <div className="border-t border-gray-100 p-3 md:p-0">
                        <table className="block w-full text-left md:table md:table-auto">
                            <thead className="hidden bg-[#f6faf8] text-sm uppercase tracking-wide text-gray-600 md:table-header-group">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Account</th>
                                    <th className="px-4 py-3 font-semibold">Role</th>
                                    <th className="px-4 py-3 font-semibold">Created</th>
                                    <th className="w-20 px-4 py-3 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group">
                                {users.map((u) => {
                                    const isMe = u.user_id === session.userId;
                                    const actions: RowAction[] = [
                                        {
                                            label: "Reset Password",
                                            href: `/dashboard/users?pw=${u.user_id}`,
                                            title: "Reset password?",
                                            message: `Set a new password for ${u.username}. An OTP will be emailed to the account owner before it changes.`,
                                            confirmLabel: "Continue",
                                            icon: "key",
                                        },
                                    ];
                                    if (canReset) {
                                        actions.push({
                                            label: "Edit Account",
                                            href: `/dashboard/users?edit=${u.user_id}`,
                                            title: "Edit account?",
                                            message: `Change the email or role of ${u.username}.`,
                                            confirmLabel: "Edit",
                                            icon: "edit",
                                        });
                                        if (!isMe) {
                                            // Pagka-confirm: magpapadala agad ng OTP, tapos lalabas ang form ng OTP
                                            actions.push({
                                                label: "Delete Account",
                                                href: `/dashboard/users?del=${u.user_id}`,
                                                title: "Delete account?",
                                                message: `A 6-digit OTP will be sent to ${u.username}. Enter it to permanently delete this account.`,
                                                confirmLabel: "Send OTP",
                                                icon: "delete",
                                                tone: "danger",
                                                formAction: requestDeleteOtp,
                                                fields: { userId: String(u.user_id) },
                                            });
                                        }
                                    }

                                    // Isang panel lang sa ilalim ng row ang bukas sa isang pagkakataon
                                    const panel =
                                        u.user_id === otpUserId
                                            ? "otp"
                                            : u.user_id === delUserId
                                                ? "del"
                                                : u.user_id === pwId
                                                    ? "pw"
                                                    : canReset && u.user_id === editId
                                                        ? "edit"
                                                        : null;
                                    const danger = panel === "del";

                                    return (
                                        <Fragment key={u.user_id}>
                                            <tr className={`${tr} ${panel ? "md:bg-[#f6faf8]" : ""}`}>
                                                <td className="flex items-center justify-between gap-3 px-4 py-2 md:table-cell md:py-3.5 md:align-middle">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        {/* Profile picture ng account (galing sa Settings); initial kapag wala pa */}
                                                        {u.avatar ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={u.avatar}
                                                                alt=""
                                                                className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-[#15664f]/30 md:h-9 md:w-9"
                                                            />
                                                        ) : (
                                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f] md:h-9 md:w-9">
                                                                {u.username.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                        <span className="min-w-0">
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
                                                                    <span className="shrink-0 rounded-full bg-[#15664f] px-2 py-0.5 text-sm font-semibold text-white">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {/* Mobile lang: role at petsa sa ilalim ng email */}
                                                            <span className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
                                                                <RoleBadge role={u.role} />
                                                                <span className="text-sm text-gray-600">Created {formatCreated(u.created_at)}</span>
                                                            </span>
                                                        </span>
                                                    </div>
                                                    {/* Mobile: ⋮ sa kanan ng card */}
                                                    <span className="shrink-0 md:hidden">
                                                        <RowActionMenu actions={actions} label={`Actions for ${u.username}`} />
                                                    </span>
                                                </td>
                                                <td className="hidden px-4 py-3.5 align-middle text-sm md:table-cell">
                                                    <RoleBadge role={u.role} />
                                                </td>
                                                <td className="hidden whitespace-nowrap px-4 py-3.5 align-middle text-sm text-gray-600 md:table-cell">
                                                    {formatCreated(u.created_at)}
                                                </td>
                                                <td className="hidden px-4 py-3.5 text-center align-middle md:table-cell">
                                                    <RowActionMenu actions={actions} label={`Actions for ${u.username}`} />
                                                </td>
                                            </tr>

                                            {panel && (
                                                <tr
                                                    className={`mb-3 block rounded-lg border md:mb-0 md:table-row md:rounded-none md:border-0 ${danger ? "border-red-200 bg-red-50/70" : "border-[#cfe5d9] bg-[#eef6f2]"
                                                        }`}
                                                >
                                                    <td colSpan={4} className="block px-4 py-4 md:table-cell">
                                                        <p
                                                            className={`mb-2 text-sm font-semibold uppercase tracking-wide ${danger ? "text-red-700" : "text-[#15664f]"
                                                                }`}
                                                        >
                                                            {panel === "pw" && "Reset password"}
                                                            {panel === "otp" && "Enter reset OTP"}
                                                            {panel === "edit" && "Edit account"}
                                                            {panel === "del" && "Enter deletion OTP"}
                                                        </p>

                                                        {panel === "pw" && (
                                                            /* RESET STEP 1: bagong password -> OTP sa may-ari */
                                                            <form action={resetUserPassword} className="flex flex-wrap items-center gap-3">
                                                                <input type="hidden" name="userId" value={u.user_id} />
                                                                {/* May Show password (mata) at Clear (X) */}
                                                                <PasswordInput
                                                                    name="password"
                                                                    placeholder="New password (min. 8 characters)"
                                                                    minLength={8}
                                                                    required
                                                                    autoFocus
                                                                    autoComplete="new-password"
                                                                    suppressHydrationWarning
                                                                    clearable
                                                                    wrapperClassName="w-full sm:w-72"
                                                                    className={`${smallInput} w-full`}
                                                                />
                                                                <ConfirmSubmit
                                                                    title="Send OTP to account owner?"
                                                                    message={`A 6-digit OTP will be emailed to ${u.username}. The password will only change after you enter the OTP they give you.`}
                                                                    confirmLabel="Send OTP"
                                                                    className={btnGreen}
                                                                >
                                                                    <KeyRound className="h-3.5 w-3.5" />
                                                                    Send OTP
                                                                </ConfirmSubmit>
                                                                <Link href="/dashboard/users" className={btnCancel}>
                                                                    Cancel
                                                                </Link>
                                                            </form>
                                                        )}

                                                        {panel === "otp" && (
                                                            /* RESET STEP 2: OTP */
                                                            <form action={verifyResetOtp} className="flex flex-wrap items-center gap-3">
                                                                <input type="hidden" name="userId" value={u.user_id} />
                                                                <input
                                                                    name="otp"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]{6}"
                                                                    maxLength={6}
                                                                    placeholder="6-digit OTP"
                                                                    required
                                                                    autoFocus
                                                                    autoComplete="one-time-code"
                                                                    suppressHydrationWarning
                                                                    className={`${smallInput} w-40 border-amber-400 text-center tracking-widest`}
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
                                                                <Link href="/dashboard/users" className={btnCancel}>
                                                                    Cancel
                                                                </Link>
                                                            </form>
                                                        )}

                                                        {panel === "edit" && (
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
                                                        )}

                                                        {panel === "del" && (
                                                            /* DELETE STEP 2: OTP mula sa may-ari */
                                                            <form action={confirmDeleteOtp} className="flex flex-wrap items-center gap-3">
                                                                <input type="hidden" name="userId" value={u.user_id} />
                                                                <input
                                                                    name="otp"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]{6}"
                                                                    maxLength={6}
                                                                    placeholder="6-digit OTP"
                                                                    required
                                                                    autoFocus
                                                                    autoComplete="one-time-code"
                                                                    suppressHydrationWarning
                                                                    className={`${smallInput} w-40 border-red-400 text-center tracking-widest focus:border-red-600 focus:ring-red-200`}
                                                                />
                                                                <ConfirmSubmit
                                                                    title="Permanently delete account?"
                                                                    message={`The account ${u.username} will be permanently deleted if the OTP is correct. This can't be undone.`}
                                                                    confirmLabel="Delete"
                                                                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    Confirm Delete
                                                                </ConfirmSubmit>
                                                                <Link href="/dashboard/users" className={btnCancel}>
                                                                    Cancel
                                                                </Link>
                                                            </form>
                                                        )}
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