export {
    PAST_HISTORY,
    FAMILY_HISTORY,
    PSYCHOLOGICAL,
    REVIEW_OF_SYSTEM,
    ALL_ROS_KEYS,
    OTHER_FIELDS,
} from "../student-health-form/form-data";

export type { Item, Group } from "../student-health-form/form-data";

export const PHYSICAL_EXAM_ITEMS: { key: string; label: string }[] = [
    { key: "weight", label: "Weight" },
    { key: "height", label: "Height" },
    { key: "bmi", label: "BMI" },
    { key: "temperature", label: "Temperature" },
    { key: "blood_pressure", label: "Blood Pressure" },
    { key: "pulse_rate", label: "Pulse Rate" },
    { key: "respiratory", label: "Respiratory" },
    { key: "skin", label: "Skin" },
    { key: "head", label: "Head" },
    { key: "eyes", label: "Eyes" },
    { key: "visual_od", label: "Visual Acuity — OD" },
    { key: "visual_os", label: "Visual Acuity — OS" },
    { key: "ears", label: "Ears" },
    { key: "hearing_right", label: "Hearing Test — Right Ear" },
    { key: "hearing_left", label: "Hearing Test — Left Ear" },
    { key: "nose", label: "Nose" },
    { key: "throat", label: "Throat" },
    { key: "mouth_tongue", label: "Mouth & Tongue" },
    { key: "teeth_gums", label: "Teeth & Gums" },
    { key: "neck", label: "Neck" },
    { key: "chest_lungs", label: "Chest & Lungs" },
    { key: "breast", label: "Breast" },
    { key: "heart", label: "Heart" },
    { key: "abdomen", label: "Abdomen" },
    { key: "testicular", label: "Testicular Exam" },
    { key: "rectal", label: "Rectal Exam" },
    { key: "extremities", label: "Extremities" },
    { key: "musculo_skeletal", label: "Musculo-skeletal" },
    { key: "neurological", label: "Neurological" },
    { key: "others", label: "Others" },
];

export const PHYSICAL_EXAM_KEYS: string[] = PHYSICAL_EXAM_ITEMS.map((item) => item.key);