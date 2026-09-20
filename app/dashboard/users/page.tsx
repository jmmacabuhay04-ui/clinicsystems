import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageAccounts } from "@/lib/permissions";
import UserForm from "./user-form";
import { resetUserPassword } from "./reset-actions";
import LinkButton from "@/components/link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default async function UsersPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageAccounts(session.role)) redirect("/dashboard");

    const isItTech = session.role === "ittech";

    const users = await prisma.user.findMany({
        select: { user_id: true, username: true, role: true, created_at: true },
        orderBy: { user_id: "asc" },
    });

    return (
        <main className="min-h-screen bg-muted p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Manage Accounts</h1>
                    {!isItTech && (
                        <LinkButton href="/dashboard" variant="outline">
                            Back to Dashboard
                        </LinkButton>
                    )}
                </div>

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
                                    {users.map((u) => (
                                        <TableRow key={u.user_id}>
                                            <TableCell>{u.user_id}</TableCell>
                                            <TableCell className="font-medium">{u.username}</TableCell>
                                            <TableCell>
                                                <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                                                    {u.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{u.created_at.toISOString().slice(0, 10)}</TableCell>
                                            <TableCell>
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
                                                    <button
                                                        type="submit"
                                                        suppressHydrationWarning
                                                        className="h-9 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                    >
                                                        Reset
                                                    </button>
                                                </form>
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