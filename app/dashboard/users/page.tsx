import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import UserForm from "./user-form";
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
    if (session.role !== "admin") redirect("/dashboard");

    const users = await prisma.user.findMany({
        select: { user_id: true, username: true, role: true, created_at: true },
        orderBy: { user_id: "asc" },
    });

    return (
        <main className="min-h-screen bg-muted p-6">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Manage Accounts</h1>
                    <LinkButton href="/dashboard" variant="outline">
                        Back to Dashboard
                    </LinkButton>
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.user_id}>
                                            <TableCell>{u.user_id}</TableCell>
                                            <TableCell className="font-medium">{u.username}</TableCell>
                                            <TableCell>
                                                <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                                            </TableCell>
                                            <TableCell>{u.created_at.toISOString().slice(0, 10)}</TableCell>
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