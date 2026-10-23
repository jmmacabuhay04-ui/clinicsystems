export type Item = { key: string; label: string };

export const SYMPTOMS: Item[] = [
    { key: "fever", label: "Fever — body temperature ≥ 37.5°C" },
    { key: "sore_throat", label: "Sore throat" },
    { key: "ageusia", label: "Ageusia (loss of taste)" },
    { key: "cough", label: "Cough" },
    { key: "colds", label: "Colds / runny nose" },
    { key: "vomiting", label: "Vomiting" },
    { key: "general_weakness", label: "General weakness" },
    { key: "difficulty_breathing", label: "Difficulty of breathing" },
    { key: "diarrhea", label: "Diarrhea" },
    { key: "fatigue", label: "Fatigue / tiredness" },
    { key: "loss_of_appetite", label: "Loss of appetite" },
    { key: "rashes", label: "Rashes" },
    { key: "headache", label: "Headache" },
    { key: "nausea", label: "Nausea" },
    { key: "muscle_pains", label: "Muscle joint / body pains" },
    { key: "anosmia", label: "Anosmia (loss of smell)" },
    {
        key: "other_symptoms",
        label: "Other symptoms in physical appearance or behavior needing medical attention",
    },
];

export const GOING_HOME: Item[] = [
    { key: "alone", label: "Going home alone" },
    { key: "service", label: "Via service vehicle" },
    { key: "fetched", label: "Fetched by the parent / official guardian" },
    { key: "others", label: "Others (please specify)" },
];