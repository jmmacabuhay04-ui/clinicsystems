import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, HeartPulse, KeyRound, Mail, ShieldCheck, Stethoscope, Trash2, UserPlus, Users, Wrench, X } from "lucide-react";
import TabSelect, { ToothIcon } from "@/components/shared/tab-select";
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
import { ACADEMIC_CATEGORIES, ACADEMIC_CATEGORY_LABELS } from "@/lib/academic";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";
import PasswordInput from "@/components/shared/password-input";
import OtpInput from "@/components/shared/otp-input";
type Props = {
    searchParams: Promise<{
        reset?: string;
        otp?: string;
        err?: string;
        edit?: string;
        del?: string;
        derr?: string;
        pw?: string;
        rm?: string;
        /** Bukas ang "New Account" na form (modal) */
        new?: string;
        /** Filter ng listahan ayon sa role */
        role?: string;
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
    selfrole: { tone: "red", text: "You can't change your own role." },
    adminonly: { tone: "red", text: "Only an Administrator can create, change or delete Administrator accounts." },
    linked: { tone: "red", text: "This account has linked records and can't be deleted." },
    deletefailed: { tone: "red", text: "Could not delete the account." },
    delsavefailed: { tone: "red", text: "Could not create the deletion request. Check the server terminal; the delete_account_requests table may be missing." },
    delmailfailed: { tone: "red", text: "Could not send the deletion OTP to the account owner's email. Check that the account uses a real email address and that GMAIL_USER / GMAIL_APP_PASSWORD are set in .env." },
    delexpired: { tone: "red", text: "The deletion OTP has expired. Please press Delete again to get a new code." },
    dellocked: { tone: "red", text: "Too many wrong OTP attempts. Please press Delete again to get a new code." },
    noactor: { tone: "red", text: "Could not identify your account. Please log in again." },
};

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";


const smallInput =
    "h-9 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm";
const btnGreen =
    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]";
const btnRed =
    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700";
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
    const { reset, otp, err, edit, del, derr, pw, rm, new: openNew, role: roleParam } = await searchParams;
    const pwId = Number(pw) || 0;
    const rmId = Number(rm) || 0;
    const otpUserId = Number(otp) || 0;
    const editId = Number(edit) || 0;
    const delUserId = Number(del) || 0;

    const users = await prisma.user.findMany({
        select: { user_id: true, username: true, role: true, created_at: true, avatar: true, academic_category: true },
        orderBy: { user_id: "asc" },
    });

    const otpUser = users.find((u) => u.user_id === otpUserId);
    const delUser = users.find((u) => u.user_id === delUserId);
    const notice = reset ? notices[reset] : null;

    const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
        acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
    }, {});
    const ROLE_ORDER = ["admin", "ittech", "doctor", "nurse", "dentist", "academic_head"];
    const ROLE_LABEL: Record<string, string> = {
        admin: "Administrator",
        ittech: "IT Technician",
        doctor: "Doctor",
        nurse: "Nurse",
        dentist: "Dentist",
        academic_head: "Academic Head",
    };
    const ROLE_ICON: Record<string, React.ReactNode> = {
        admin: <ShieldCheck />,
        ittech: <Wrench />,
        doctor: <Stethoscope />,
        nurse: <HeartPulse />,
        dentist: <ToothIcon />,
        academic_head: <Users />,
    };
    const roleFilter = roleParam && ROLE_ORDER.includes(roleParam) ? roleParam : "";
    // Mga card na ipapakita (ayon sa napiling role)
    const shownUsers = roleFilter ? users.filter((u) => u.role === roleFilter) : users;

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Manage Accounts</h1>
                    <p className="text-sm text-gray-600">Create staff accounts, change roles, and reset passwords.</p>
                </div>
                {/* Bubukas ang form ng bagong account (modal) */}
                <Link
                    href="/dashboard/users?new=1"
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                >
                    <UserPlus className="h-4 w-4" />
                    New Account
                </Link>
            </div>

            {/* NEW ACCOUNT (modal): bukas kapag ?new=1 */}
            {openNew && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <Link href="/dashboard/users" aria-label="Close" className="absolute inset-0 bg-black/40" />
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="new-account-title"
                        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="new-account-title" className="text-lg font-semibold text-gray-900">
                                    New Account
                                </h2>
                                <p className="text-sm text-gray-600">Add a clinic staff login.</p>
                            </div>
                            <Link
                                href="/dashboard/users"
                                aria-label="Close"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            >
                                <X className="h-5 w-5" />
                            </Link>
                        </div>
                        <UserForm allowAdmin={session.role === "admin"} />
                    </section>
                </div>
            )}

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

            {/* Role filter (dropdown, kapareho ng Visitor Recording): All Accounts o isang role, may bilang */}
            <TabSelect
                label="Filter accounts by role"
                value={roleFilter || "all"}
                options={[
                    { key: "all", label: "All Accounts", href: "/dashboard/users", count: users.length, icon: <Users /> },
                    ...ROLE_ORDER.filter((r) => roleCounts[r]).map((r) => ({
                        key: r,
                        label: ROLE_LABEL[r],
                        href: `/dashboard/users?role=${r}`,
                        count: roleCounts[r],
                        icon: ROLE_ICON[r],
                    })),
                ]}
            />

            {/* Lahat ng account: card bawat isa (1 sa phone, 2 sa tablet, 3 sa desktop) */}
            <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{roleFilter ? `${ROLE_LABEL[roleFilter]} Accounts` : "All Accounts"}</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#15664f] ring-2 ring-[#cfe5d9]">
                        {shownUsers.length} account{shownUsers.length === 1 ? "" : "s"}
                    </span>
                </div>

                {/* items-start: kapag may bukas na form sa isang card, hindi hahaba ang ibang card sa hanay */}
                <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {shownUsers.map((u) => {
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
                                // Kapareho ng Reset Password: magbubukas muna ng panel sa ilalim ng row,
                                // at doon pipindutin ang "Send OTP".
                                actions.push({
                                    label: "Delete Account",
                                    href: `/dashboard/users?rm=${u.user_id}`,
                                    title: "Delete account?",
                                    message: `Permanently delete ${u.username}. An OTP will be emailed to the account owner before it is deleted.`,
                                    confirmLabel: "Continue",
                                    icon: "delete",
                                    tone: "danger",
                                });
                            }
                        }

                        // Isang panel lang sa ilalim ng row ang bukas sa isang pagkakataon
                        const panel =
                            u.user_id === otpUserId
                                ? "otp"
                                : u.user_id === delUserId
                                    ? "del"
                                    : canReset && !isMe && u.user_id === rmId
                                        ? "rm"
                                        : u.user_id === pwId
                                            ? "pw"
                                            : canReset && u.user_id === editId
                                                ? "edit"
                                                : null;
                        const danger = panel === "del" || panel === "rm";

                        return (
                            <article
                                key={u.user_id}
                                className={`${card} flex min-w-0 flex-col p-5 ${panel ? (danger ? "ring-2 ring-red-200" : "ring-2 ring-[#15664f]/30") : ""}`}
                            >
                                {/* Itaas: larawan + ⋮ */}
                                <div className="flex items-start justify-between gap-3">
                                    {u.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={u.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[#15664f]/30" />
                                    ) : (
                                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-lg font-semibold text-[#15664f]">
                                            {u.username.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                    <RowActionMenu actions={actions} label={`Actions for ${u.username}`} />
                                </div>

                                {/* Email (puwedeng bumaba sa "@") + You */}
                                <div className="mb-4 mt-3 flex min-w-0 flex-wrap items-center gap-2">
                                    <p className="min-w-0 font-semibold text-gray-900 [overflow-wrap:anywhere]">
                                        {u.username.split("@")[0]}
                                        {u.username.includes("@") && (
                                            <>
                                                <wbr />@{u.username.split("@").slice(1).join("@")}
                                            </>
                                        )}
                                    </p>
                                    {isMe && (
                                        <span className="shrink-0 rounded-full bg-[#15664f] px-2 py-0.5 text-sm font-semibold text-white">You</span>
                                    )}
                                </div>

                                {/* Ibaba: role + petsa */}
                                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                                    <RoleBadge role={u.role} />
                                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                                        <CalendarDays className="h-4 w-4" />
                                        {formatCreated(u.created_at)}
                                    </span>
                                </div>

                                {/* Panel ng Reset / Edit / Delete sa loob ng card */}
                                {panel && (
                                    <div
                                        className={`mt-4 rounded-lg border p-3 ${danger ? "border-red-200 bg-red-50/70" : "border-[#cfe5d9] bg-[#eef6f2]"
                                            }`}
                                    >
                                        <p className={`mb-2 text-sm font-semibold uppercase tracking-wide ${danger ? "text-red-700" : "text-[#15664f]"}`}>
                                            {panel === "pw" && "Reset password"}
                                            {panel === "otp" && "Enter reset OTP"}
                                            {panel === "edit" && "Edit account"}
                                            {panel === "rm" && "Delete account"}
                                            {panel === "del" && "Enter deletion OTP"}
                                        </p>
                                        {panel === "pw" && (
                                            /* RESET STEP 1: bagong password -> OTP sa may-ari */
                                            <form action={resetUserPassword} className="flex flex-wrap items-center gap-3">
                                                <input type="hidden" name="userId" value={u.user_id} />
                                                {/* May Show password (mata) at Clear (X) */}
                                                <PasswordInput
                                                    name="password"
                                                    placeholder="New password (8+ characters)"
                                                    minLength={8}
                                                    required
                                                    autoFocus
                                                    autoComplete="new-password"
                                                    suppressHydrationWarning
                                                    clearable
                                                    wrapperClassName="w-full"
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
                                                <OtpInput name="otp" autoFocus compact />
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
                                                    className={`${smallInput} w-full`}
                                                />
                                                <select required name="role" defaultValue={u.role} className={`${smallInput} w-full`}>
                                                    {(session.role === "admin" || u.role === "admin") && (
                                                        <option value="admin">Administrator</option>
                                                    )}
                                                    <option value="ittech">IT Technician</option>
                                                    <option value="doctor">Doctor</option>
                                                    <option value="nurse">Nurse</option>
                                                    <option value="dentist">Dentist</option>
                                                    <option value="academic_head">Academic Head</option>
                                                </select>
                                                {/* Category para sa Academic Head lang (ignored kapag ibang role) */}
                                                <select name="academicCategory" defaultValue={u.academic_category ?? ""} className={`${smallInput} w-full`}>
                                                    <option value="">Academic category (Academic Head only)</option>
                                                    {ACADEMIC_CATEGORIES.map((c) => (
                                                        <option key={c} value={c}>{ACADEMIC_CATEGORY_LABELS[c]}</option>
                                                    ))}
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

                                        {panel === "rm" && (
                                            /* DELETE STEP 1: magpadala ng OTP sa may-ari (kapareho ng Reset Password) */
                                            <form action={requestDeleteOtp} className="flex flex-wrap items-center gap-3">
                                                <input type="hidden" name="userId" value={u.user_id} />
                                                {/* Kumpirmasyon: i-type ang email ng account (kapareho ng format ng Reset Password) */}
                                                <input
                                                    name="confirmEmail"
                                                    type="text"
                                                    placeholder="Type the email to confirm"
                                                    pattern={u.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}
                                                    title={`Type ${u.username} exactly to confirm`}
                                                    required
                                                    autoFocus
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    suppressHydrationWarning
                                                    className={`${smallInput} w-full border-red-300 focus:border-red-600 focus:ring-red-200`}
                                                />
                                                <ConfirmSubmit
                                                    title="Send deletion OTP?"
                                                    tone="danger"
                                                    message={`A 6-digit OTP will be emailed to ${u.username}. Enter it to permanently delete this account.`}
                                                    confirmLabel="Send OTP"
                                                    className={btnRed}
                                                >
                                                    <Mail className="h-3.5 w-3.5" />
                                                    Send OTP
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
                                                <OtpInput name="otp" autoFocus compact />
                                                <ConfirmSubmit
                                                    title="Permanently delete account?"
                                                    message={`The account ${u.username} will be permanently deleted if the OTP is correct. This can't be undone.`}
                                                    confirmLabel="Delete"
                                                    className={btnRed}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Confirm Delete
                                                </ConfirmSubmit>
                                                <Link href="/dashboard/users" className={btnCancel}>
                                                    Cancel
                                                </Link>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}