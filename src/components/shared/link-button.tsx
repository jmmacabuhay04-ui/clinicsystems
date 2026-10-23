import Link from "next/link";

type LinkButtonProps = {
    href: string;
    children: React.ReactNode;
    variant?: "default" | "outline";
};

export default function LinkButton({ href, children, variant = "default" }: LinkButtonProps) {
    const base =
        "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    const styles =
        variant === "outline"
            ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90";

    return (
        <Link href={href} className={`${base} ${styles}`}>
            {children}
        </Link>
    );
}