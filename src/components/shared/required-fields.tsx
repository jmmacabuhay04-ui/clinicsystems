"use client";

import { useEffect } from "react";

/**
 * REQUIRED FIELDS (buong system)
 *
 * Lahat ng input, textarea at select sa mga form na nagse-save (hindi kasama ang
 * search/filter na naka-method="get") ay awtomatikong required:
 *   - may pulang * sa label
 *   - kapag blangko at nag-save: pulang border + "This field is required." sa ilalim
 *   - pupunta sa unang blangkong field
 *
 * HINDI kasama (sadyang optional):
 *   - search at filter (form method="get", type="search")
 *   - checkbox at file upload (hal. avatar)
 *   - password fields (sa Edit, blangko = hindi papalitan); kung may sariling
 *     `required` ang password field, required pa rin ito
 *   - readOnly / disabled / walang `name` / nakatago (hal. ibang tab)
 *   - kahit anong field o form na may `data-optional`
 */

const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "checkbox", "file", "search"]);
const MESSAGE = "This field is required.";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isField(el: unknown): el is Field {
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

function isTextLike(el: Field) {
    return el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !["radio", "date", "time", "number", "select-one"].includes(el.type));
}

/** Nakasulat ba sa label ng field na optional ito? hal. "Reason (optional)" */
function saysOptional(el: Field) {
    const texts: string[] = [];
    el.labels?.forEach((l) => texts.push(l.textContent ?? ""));
    const prev = el.parentElement?.previousElementSibling;
    if (prev) texts.push(prev.textContent ?? "");
    texts.push(el.getAttribute("aria-label") ?? "");
    return texts.some((t) => /\boptional\b/i.test(t));
}

/** Dapat bang awtomatikong gawing required ang field na ito? */
function eligible(el: Field) {
    const form = el.form;
    if (!form) return false;
    if ((form.getAttribute("method") ?? "").toLowerCase() === "get") return false;
    if (form.hasAttribute("data-optional") || el.closest("[data-optional]")) return false;
    // May "(optional)" sa label: hindi required
    if (saysOptional(el)) return false;
    if (!el.name || el.disabled) return false;
    if (el instanceof HTMLInputElement) {
        if (SKIP_TYPES.has(el.type)) return false;
        if (el.readOnly) return false;
        if (el.type === "password" || /password/i.test(el.name)) return false;
    }
    if (el instanceof HTMLTextAreaElement && el.readOnly) return false;
    // Nakatago (display:none, ibang tab, saradong seksyon): hindi puwedeng i-require
    if (el.getClientRects().length === 0) return false;
    return true;
}

/** Lalagyan ng field (kasama ang mga icon), para sa ilalim nito ilalagay ang error */
function fieldBox(el: Field): HTMLElement {
    if (el instanceof HTMLInputElement && el.type === "radio") return radioGroup(el);
    // Umakyat sa lahat ng "relative" na lalagyan na iisa lang ang field (hal. may icon sa
    // kaliwa at mata sa kanan). Sa labas nila ilalagay ang error, para hindi gumalaw ang
    // mga icon na naka-gitna (top-1/2) sa lalagyan.
    let box: HTMLElement = el;
    let parent = el.parentElement;
    while (
        parent &&
        parent !== el.form &&
        parent.classList.contains("relative") &&
        parent.querySelectorAll("input:not([type=hidden]), textarea, select").length === 1
    ) {
        box = parent;
        parent = parent.parentElement;
    }
    return box;
}

/** Ang pinakamaliit na lalagyan na may lahat ng radio na kapareho ng pangalan */
function radioGroup(el: HTMLInputElement): HTMLElement {
    const all = el.form?.querySelectorAll(`input[type=radio][name="${CSS.escape(el.name)}"]`).length ?? 1;
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== el.form) {
        if (node.querySelectorAll(`input[type=radio][name="${CSS.escape(el.name)}"]`).length >= all) return node;
        node = node.parentElement;
    }
    return el.parentElement ?? el;
}

function hasControls(node: Element) {
    return !!node.querySelector("input, textarea, select, button");
}

function labelLike(node: Element | null): node is HTMLElement {
    if (!(node instanceof HTMLElement)) return false;
    if (!["SPAN", "P", "LABEL", "DIV", "H3", "H4", "LEGEND"].includes(node.tagName)) return false;
    if (hasControls(node)) return false;
    const text = (node.textContent ?? "").trim();
    return text.length > 0 && text.length <= 80;
}

/** Hanapin ang text ng label ng field (doon ilalagay ang pulang *) */
function labelTarget(el: Field): HTMLElement | null {
    const isRadio = el instanceof HTMLInputElement && el.type === "radio";
    if (!isRadio && el.labels && el.labels.length > 0) {
        const lab = el.labels[0];
        if (lab.contains(el)) {
            // <label><span>Pangalan</span><input/></label>
            const first = Array.from(lab.children).find((c) => labelLike(c));
            return (first as HTMLElement | undefined) ?? null;
        }
        return lab;
    }
    // <span>Pangalan</span><div class="relative"><input/></div>
    let node: Element | null = isRadio ? radioGroup(el as HTMLInputElement) : fieldBox(el);
    for (let i = 0; i < 3 && node; i++) {
        const sib: Element | null = node.previousElementSibling;
        if (labelLike(sib)) return sib;
        if (sib) return null;
        node = node.parentElement;
    }
    return null;
}

/** Tanggalin ang lumang itim na " *" sa text ng label (pula na ang ipapalit) */
function stripStar(target: HTMLElement) {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    while (walker.nextNode()) {
        const t = walker.currentNode as Text;
        if ((t.nodeValue ?? "").trim()) last = t;
    }
    if (last && /\s*\*\s*$/.test(last.nodeValue ?? "")) {
        last.nodeValue = (last.nodeValue ?? "").replace(/\s*\*\s*$/, "");
    }
}

const messages = new WeakMap<HTMLElement, HTMLElement>();

function showError(el: Field) {
    const box = fieldBox(el);
    const isRadio = el instanceof HTMLInputElement && el.type === "radio";
    box.setAttribute(isRadio ? "data-req-group-invalid" : "data-req-invalid", "");
    if (!isRadio) el.setAttribute("aria-invalid", "true");
    if (messages.has(box)) return;
    const p = document.createElement("p");
    p.setAttribute("data-req-msg", "");
    p.setAttribute("role", "alert");
    p.textContent = MESSAGE;
    box.insertAdjacentElement("afterend", p);
    messages.set(box, p);
}

function clearError(el: Field) {
    const box = fieldBox(el);
    box.removeAttribute("data-req-invalid");
    box.removeAttribute("data-req-group-invalid");
    el.removeAttribute("aria-invalid");
    const p = messages.get(box);
    if (p) {
        p.remove();
        messages.delete(box);
    }
}

/** Blangko kahit may puro espasyo lang */
function syncWhitespace(el: Field) {
    if (!isTextLike(el) || !el.hasAttribute("data-auto-req")) return;
    el.setCustomValidity(el.value !== "" && el.value.trim() === "" ? MESSAGE : "");
}

function apply() {
    // Linisin ang mga dating marka ng label, saka ilagay ulit
    document.querySelectorAll("[data-req-label]").forEach((n) => n.removeAttribute("data-req-label"));

    document.querySelectorAll("form").forEach((form) => {
        Array.from(form.elements).forEach((node) => {
            if (!isField(node)) return;
            const el = node;
            const auto = el.hasAttribute("data-auto-req");
            const wanted = eligible(el);

            if (wanted && !el.required) {
                el.required = true;
                el.setAttribute("data-auto-req", "");
            } else if (!wanted && auto) {
                el.required = false;
                el.removeAttribute("data-auto-req");
                el.setCustomValidity("");
                clearError(el);
            }

            if (el.required && el.getClientRects().length > 0 && !(el instanceof HTMLInputElement && el.type === "hidden")) {
                const target = labelTarget(el);
                if (target) {
                    stripStar(target);
                    target.setAttribute("data-req-label", "");
                }
            }
        });
    });
}

const CSS_RULES = `
[data-req-label]::after { content: " *"; color: #dc2626; font-weight: 700; }
[data-req-invalid], [data-req-invalid] input, [data-req-invalid] textarea, [data-req-invalid] select,
input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"] {
    border-color: #dc2626 !important;
}
input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"] {
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15) !important;
}
[data-req-group-invalid] { outline: 2px solid #fca5a5; outline-offset: 3px; border-radius: 0.6rem; }
[data-req-msg] { margin-top: 0.3rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: #dc2626; }
/* Mga form na may data-req-float (hal. Log In, Enter Code): hindi tinutulak ng error
   ang mga kasunod na field; lumalabas ito sa puwang sa pagitan ng mga field */
[data-req-float] [data-req-msg] { height: 0; margin: 0 !important; position: relative; top: 0.2rem; overflow: visible; white-space: nowrap; }
`;

export default function RequiredFields() {
    useEffect(() => {
        let frame = 0;
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
        };

        // Hintayin munang ma-load at ma-hydrate ang page bago galawin ang DOM
        // (para walang "hydration mismatch" sa unang bukas ng page)
        const observer = new MutationObserver(schedule);
        let start = 0;
        const begin = () => {
            start = window.setTimeout(() => {
                apply();
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributes: true,
                    attributeFilter: ["class", "style", "hidden", "disabled", "readonly", "name", "type", "method"],
                });
            }, 400);
        };
        if (document.readyState === "complete") begin();
        else window.addEventListener("load", begin, { once: true });

        // Siguraduhing updated bago ang validation (pag-click ng Save / Enter)
        const beforeValidate = (e: Event) => {
            if (e instanceof KeyboardEvent && e.key !== "Enter") return;
            apply();
        };

        // Ipakita ang sariling error imbes na bubble ng browser
        let pendingFocus: Field[] = [];
        const onInvalid = (e: Event) => {
            const el = e.target;
            if (!isField(el)) return;
            e.preventDefault();
            showError(el);
            pendingFocus.push(el);
            if (pendingFocus.length === 1) {
                window.setTimeout(() => {
                    const first = pendingFocus.sort((a, b) =>
                        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
                    )[0];
                    pendingFocus = [];
                    if (!first) return;
                    first.scrollIntoView({ block: "center", behavior: "smooth" });
                    first.focus({ preventScroll: true });
                }, 0);
            }
        };

        // Mawawala ang error kapag nilagyan na ng laman
        const onInput = (e: Event) => {
            const el = e.target;
            if (!isField(el)) return;
            syncWhitespace(el);
            if (el instanceof HTMLInputElement && el.type === "radio" && el.form) {
                el.form
                    .querySelectorAll<HTMLInputElement>(`input[type=radio][name="${CSS.escape(el.name)}"]`)
                    .forEach((r) => clearError(r));
                return;
            }
            if (el.checkValidity()) clearError(el);
        };

        document.addEventListener("invalid", onInvalid, true);
        document.addEventListener("input", onInput, true);
        document.addEventListener("change", onInput, true);
        document.addEventListener("click", beforeValidate, true);
        document.addEventListener("keydown", beforeValidate, true);

        return () => {
            window.removeEventListener("load", begin);
            window.clearTimeout(start);
            cancelAnimationFrame(frame);
            observer.disconnect();
            document.removeEventListener("invalid", onInvalid, true);
            document.removeEventListener("input", onInput, true);
            document.removeEventListener("change", onInput, true);
            document.removeEventListener("click", beforeValidate, true);
            document.removeEventListener("keydown", beforeValidate, true);
        };
    }, []);

    return <style dangerouslySetInnerHTML={{ __html: CSS_RULES }} />;
}