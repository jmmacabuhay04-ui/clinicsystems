"use client";

import { useEffect } from "react";

// LAHAT ng input at textarea sa system: autoComplete="off" (walang lumang na-type na lalabas
// na suggestion ng browser). Para sa password field: "new-password", dahil hindi pinapansin
// ng Chrome ang "off" sa password at doon pa rin nito inilalagay ang naka-save na password.
//
// Hindi ginagalaw:
//   - ang Log In form (form na may data-required), para gumana pa rin ang naka-save na login
//   - ang OTP (autocomplete="one-time-code"), para kusang mapunan ang code mula sa SMS/email
//   - hidden, checkbox, radio, file at mga button
// Kasama ang mga input na lalabas pa lang (modal, bagong form) dahil sa MutationObserver.
const SKIP_TYPES = new Set(["hidden", "checkbox", "radio", "file", "submit", "button", "reset", "image", "range", "color"]);

function apply() {
    document.querySelectorAll<HTMLFormElement>("form:not([data-required])").forEach((form) => {
        if (form.getAttribute("autocomplete") !== "off") form.setAttribute("autocomplete", "off");
    });
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea").forEach((el) => {
        if (el.closest("form[data-required]")) return;
        if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return;
        const current = el.getAttribute("autocomplete");
        if (current === "one-time-code") return;
        // Ang password field na ipinakita (mata) ay nagiging type="text" pero password pa rin
        const isPassword = el instanceof HTMLInputElement && (el.type === "password" || current === "new-password" || current === "current-password");
        const want = isPassword ? "new-password" : "off";
        if (current !== want) el.setAttribute("autocomplete", want);
    });
}

export default function NoAutofill() {
    useEffect(() => {
        apply();
        let frame = 0;
        const observer = new MutationObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);
    return null;
}