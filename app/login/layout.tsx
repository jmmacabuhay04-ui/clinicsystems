import LoginBackground from "@/components/login-background";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <LoginBackground>{children}</LoginBackground>;
}