// Pangalang ipinapakita para sa naka-login na staff (dashboard, sidebar, top bar).
// Kung may itinakdang "Display Name" sa Settings (users.full_name), iyon ang gagamitin.
// Kung wala pa, kukunin sa email: "santos@bcas.edu.ph" -> "Santos".
// May "Dr." sa unahan para sa doctor at dentist (kung wala pa).
export function staffDisplayName(fullName: string | null | undefined, username: string, role: string) {
    const r = (role ?? "").toLowerCase();
    const isDr = r === "doctor" || r === "dentist";

    const saved = (fullName ?? "").trim();
    if (saved) {
        return isDr && !/^dr\.?\s/i.test(saved) ? `Dr. ${saved}` : saved;
    }

    const local = String(username ?? "").split("@")[0];
    const base = local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
    return isDr && base ? `Dr. ${base}` : base;
}