"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveEmployeeHealthForm, type HealthFormState } from "./actions";
import {
    FAMILY_HISTORY,
    PAST_HISTORY,
    PSYCHOLOGICAL,
    REVIEW_OF_SYSTEM,
} from "./form-data";

const initialState: HealthFormState = {};

const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const smallSelect =
    "h-9 w-24 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-[#15664f]";

export type HealthFormValues = {
    employeeNumber: string;
    employeeName: string;
    text: Record<string, string>;
    past: Record<string, string>;
    family: Record<string, { answer?: string; relation?: string }>;
    psych: Record<string, { answer?: string; details?: string }>;
    ros: Record<string, { answer?: string; age?: string }>;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {children}
        </label>
    );
}

function Text({
    name,
    values,
    placeholder,
    type = "text",
}: {
    name: string;
    values: Record<string, string>;
    placeholder?: string;
    type?: string;
}) {
    return (
        <input
            name={name}
            type={type}
            defaultValue={values[name] ?? ""}
            placeholder={placeholder}
            suppressHydrationWarning
            className={inputClass}
        />
    );
}

function YesNo({ name, value }: { name: string; value?: string }) {
    return (
        <select name={name} defaultValue={value ?? ""} suppressHydrationWarning className={smallSelect}>
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
        </select>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

export default function EmployeeHealthFormEditor({
    values,
    cancelHref,
}: {
    values: HealthFormValues;
    cancelHref: string;
}) {
    const [state, formAction, pending] = useActionState(saveEmployeeHealthForm, initialState);
    const t = values.text;

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <input type="hidden" name="employeeNumber" value={values.employeeNumber} />

            <Section title="Employee Information">
                <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Name">
                        <input
                            value={values.employeeName}
                            readOnly
                            suppressHydrationWarning
                            className={`${inputClass} bg-gray-50`}
                        />
                    </Field>
                    <Field label="Sex">
                        <select name="sex" defaultValue={t.sex ?? ""} suppressHydrationWarning className={inputClass}>
                            <option value="">—</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </Field>
                    <Field label="Date of Birth">
                        <Text name="dateOfBirth" values={t} type="date" />
                    </Field>
                    <Field label="Birthplace">
                        <Text name="birthplace" values={t} />
                    </Field>
                    <Field label="Nationality">
                        <Text name="nationality" values={t} />
                    </Field>
                    <Field label="Religion">
                        <Text name="religion" values={t} />
                    </Field>
                    <div className="md:col-span-2">
                        <Field label="Address">
                            <Text name="address" values={t} />
                        </Field>
                    </div>
                    <Field label="Contact Number">
                        <Text name="contactNumber" values={t} />
                    </Field>
                </div>
            </Section>

            <Section title="Parents">
                <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Father's Name">
                        <Text name="fatherName" values={t} />
                    </Field>
                    <Field label="Occupation">
                        <Text name="fatherOccupation" values={t} />
                    </Field>
                    <Field label="Contact #">
                        <Text name="fatherContact" values={t} />
                    </Field>
                    <Field label="Mother's Name">
                        <Text name="motherName" values={t} />
                    </Field>
                    <Field label="Occupation">
                        <Text name="motherOccupation" values={t} />
                    </Field>
                    <Field label="Contact #">
                        <Text name="motherContact" values={t} />
                    </Field>
                </div>
            </Section>

            <Section title="Hospital & Doctor">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Hospital of Choice for Referral or Admission">
                        <Text name="hospitalChoice" values={t} />
                    </Field>
                    <Field label="Address of Hospital">
                        <Text name="hospitalAddress" values={t} />
                    </Field>
                    <Field label="Hospital's Contact #">
                        <Text name="hospitalContact" values={t} />
                    </Field>
                    <Field label="Name of Family Doctor">
                        <Text name="doctorName" values={t} />
                    </Field>
                </div>
            </Section>

            <Section title="Emergency Contact">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Person to Notify">
                        <Text name="emergencyPerson" values={t} />
                    </Field>
                    <Field label="Contact #">
                        <Text name="emergencyContact" values={t} />
                    </Field>
                    <Field label="Relation to the Employee">
                        <Text name="emergencyRelation" values={t} />
                    </Field>
                    <Field label="Address of Contact Person">
                        <Text name="emergencyAddress" values={t} />
                    </Field>
                </div>
            </Section>

            <Section title="A. Past Medical History">
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {PAST_HISTORY.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-700">{item.label}</span>
                            <YesNo name={`past_${item.key}`} value={values.past[item.key]} />
                        </div>
                    ))}
                </div>
                <div className="mt-5">
                    <Field label="Others / Relevant details">
                        <textarea
                            name="pastOthers"
                            defaultValue={t.pastOthers ?? ""}
                            rows={3}
                            suppressHydrationWarning
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </Field>
                </div>
            </Section>

            <Section title="B. Family Medical History">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-3 py-2 font-medium">Disease</th>
                                <th className="px-3 py-2 font-medium">Answer</th>
                                <th className="px-3 py-2 font-medium">Relation of the Employee</th>
                            </tr>
                        </thead>
                        <tbody>
                            {FAMILY_HISTORY.map((item) => (
                                <tr key={item.key} className="border-t border-gray-100">
                                    <td className="px-3 py-2 text-gray-900">{item.label}</td>
                                    <td className="px-3 py-2">
                                        <YesNo name={`fam_${item.key}`} value={values.family[item.key]?.answer} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            name={`famrel_${item.key}`}
                                            defaultValue={values.family[item.key]?.relation ?? ""}
                                            suppressHydrationWarning
                                            className="h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-[#15664f]"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="C. Psychological History">
                <div className="space-y-3">
                    {PSYCHOLOGICAL.map((item) => (
                        <div key={item.key} className="grid gap-3 md:grid-cols-[120px_120px_1fr]">
                            <span className="self-center text-sm text-gray-700">{item.label}</span>
                            <YesNo name={`psy_${item.key}`} value={values.psych[item.key]?.answer} />
                            <input
                                name={`psydet_${item.key}`}
                                defaultValue={values.psych[item.key]?.details ?? ""}
                                placeholder="If YES, relevant details"
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="D. Other Medical Information">
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                            Male Employee
                        </h3>
                        <div className="mt-3 space-y-3">
                            <Field label="Age of onset of genital enlargement">
                                <Text name="male_genital_age" values={t} />
                            </Field>
                            <Field label="Age of onset of pubic hair">
                                <Text name="male_pubic_age" values={t} />
                            </Field>
                            <Field label="Suffered from hernia?">
                                <Text name="male_hernia" values={t} placeholder="No / Yes" />
                            </Field>
                            <Field label="If yes, when?">
                                <Text name="male_hernia_when" values={t} />
                            </Field>
                            <Field label="Circumcision">
                                <Text name="male_circumcision" values={t} placeholder="Not done / Done" />
                            </Field>
                            <Field label="When?">
                                <Text name="male_circumcision_when" values={t} />
                            </Field>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                            Female Employee
                        </h3>
                        <div className="mt-3 space-y-3">
                            <Field label="Age of onset of menstruation">
                                <Text name="female_menstruation_age" values={t} />
                            </Field>
                            <Field label="Is cycle regular?">
                                <Text name="female_cycle_regular" values={t} placeholder="No / Yes" />
                            </Field>
                            <Field label="Flow — Minimal">
                                <Text name="female_flow_min" values={t} />
                            </Field>
                            <Field label="Flow — Maximum">
                                <Text name="female_flow_max" values={t} />
                            </Field>
                            <Field label="Discomfort">
                                <Text
                                    name="female_discomfort"
                                    values={t}
                                    placeholder="Absent / Moderate / Severe"
                                />
                            </Field>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <Field label="1. Under medical treatment?">
                        <Text name="q1_treatment" values={t} placeholder="No / Yes" />
                    </Field>
                    <Field label="If yes, for what?">
                        <Text name="q1_for_what" values={t} />
                    </Field>
                    <Field label="Medicines, dosage, schedule">
                        <Text name="q1_medicines" values={t} />
                    </Field>
                    <Field label="2. Psychiatric evaluation?">
                        <Text name="q2_psychiatric" values={t} placeholder="No / Yes" />
                    </Field>
                    <div className="md:col-span-2">
                        <Field label="If yes, explain">
                            <Text name="q2_explain" values={t} />
                        </Field>
                    </div>
                    <Field label="3. Underwent X-ray?">
                        <Text name="q3_xray" values={t} placeholder="No / Yes" />
                    </Field>
                    <Field label="If yes, when?">
                        <Text name="q3_when" values={t} />
                    </Field>
                    <Field label="For what?">
                        <Text name="q3_for_what" values={t} />
                    </Field>
                    <Field label="What is the result?">
                        <Text name="q3_result" values={t} />
                    </Field>
                    <Field label="Examined by whom?">
                        <Text name="q3_examined_by" values={t} />
                    </Field>
                    <Field label="4. Tuberculin skin test (last year)?">
                        <Text name="q4_tuberculin" values={t} placeholder="No / Yes" />
                    </Field>
                    <Field label="Result">
                        <Text name="q4_result" values={t} placeholder="Negative / Positive" />
                    </Field>
                    <Field label="5. Last dental check-up">
                        <Text name="q5_last_dental" values={t} />
                    </Field>
                    <Field label="6. Condition requiring special treatment?">
                        <Text name="q6_special" values={t} placeholder="No / Yes" />
                    </Field>
                    <div className="md:col-span-3">
                        <Field label="If yes, explain">
                            <Text name="q6_explain" values={t} />
                        </Field>
                    </div>
                </div>
            </Section>

            <Section title="E. Review of System">
                <p className="-mt-2 mb-4 text-xs text-gray-500">
                    Have you ever had or do you have any of the following? If YES, at what age?
                </p>
                <div className="space-y-6">
                    {REVIEW_OF_SYSTEM.map((group) => (
                        <div key={group.key}>
                            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                                {group.title}
                            </h3>
                            <div className="mt-3 space-y-2">
                                {group.items.map((item) => (
                                    <div
                                        key={item.key}
                                        className="grid gap-3 sm:grid-cols-[1fr_110px_110px] sm:items-center"
                                    >
                                        <span className="text-sm text-gray-700">{item.label}</span>
                                        <YesNo name={`ros_${item.key}`} value={values.ros[item.key]?.answer} />
                                        <input
                                            name={`rosage_${item.key}`}
                                            defaultValue={values.ros[item.key]?.age ?? ""}
                                            placeholder="Age"
                                            suppressHydrationWarning
                                            className="h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-[#15664f]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Consent for Treatment">
                <p className="-mt-2 mb-4 text-xs leading-relaxed text-gray-600">
                    I hereby authorize and give my consent to BCAS health care providers to examine me for
                    minor injury or illness. In the event of an emergency, I give permission to the school
                    health care provider to secure appropriate treatment, including transport to the nearest
                    hospital, if necessary.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Signature over Printed Name of Employee">
                        <Text name="consentName" values={t} />
                    </Field>
                    <Field label="Date">
                        <Text name="consentDate" values={t} type="date" />
                    </Field>
                </div>
            </Section>

            <div className="flex justify-end gap-3">
                <Link
                    href={cancelHref}
                    className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={pending}
                    suppressHydrationWarning
                    className="h-10 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                >
                    {pending ? "Saving..." : "Save Health Record"}
                </button>
            </div>
        </form>
    );
}