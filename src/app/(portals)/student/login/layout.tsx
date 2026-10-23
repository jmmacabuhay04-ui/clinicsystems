import LoginBackground from "@/components/layout/login-background";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <LoginBackground>{children}</LoginBackground>;
}