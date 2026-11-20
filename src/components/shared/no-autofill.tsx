"use client";

import { useEffect } from "react";

// LAHAT ng input at textarea sa system: autocomplete="off" (walang lumang na-type na
// lalabas na suggestion ng browser). Password field: "new-password", dahil hindi pinapansin
// ng Chrome ang "off" sa password at doon pa rin nito inilalagay ang naka-save na password.
//
// Inilalagay lang ito sa sandaling i-click o i-focus ang input (bago lumabas ang suggestion).
// HINDI na binabago ang buong page pagka-load, dahil iyon ang nagdudulot ng
// "hydration mismatch" na error (nababago ang HTML bago pa ito mabasa ng React).
//
// Hindi ginagalaw:
//   - ang Log In form (form na may data-required), para gumana pa rin ang naka-save na login
//   - ang OTP (autocomplete="one-time-code"), para kusang mapunan ang code mula sa SMS/email
//   - hidden, checkbox, radio, file at mga button
const SKIP_TYPES = new Set(["hidden", "checkbox", "radio", "file", "submit", "button", "reset", "image", "range", "color"]);

function fix(target: EventTarget | null) {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target.closest("form[data-required]")) return;
    if (target instanceof HTMLInputElement && SKIP_TYPES.has(target.type)) return;
    const current = target.getAttribute("autocomplete");
    if (current === "one-time-code") return;
    // Ang password na ipinakita (mata) ay nagiging type="text" pero password pa rin
    const isPassword =
        target instanceof HTMLInputElement && (target.type === "password" || current === "new-password" || current === "current-password");
    const want = isPassword ? "new-password" : "off";
    if (current !== want) target.setAttribute("autocomplete", want);
    const form = target.form;
    if (form && form.getAttribute("autocomplete") !== "off") form.setAttribute("autocomplete", "off");
}

export default function NoAutofill() {
    useEffect(() => {
        const onEvent = (e: Event) => fix(e.target);
        // capture: tumatakbo bago pa ipakita ng browser ang suggestion
        document.addEventListener("pointerdown", onEvent, true);
        document.addEventListener("focusin", onEvent, true);
        return () => {
            document.removeEventListener("pointerdown", onEvent, true);
            document.removeEventListener("focusin", onEvent, true);
        };
    }, []);
    return null;
}