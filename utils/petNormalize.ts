// utils/petNormalize.ts
import { getLocalizedField } from './localization'; // chỉnh path nếu khác

// Các field song ngữ {vi, en} chỉ dùng để HIỂN THỊ — không dùng để so sánh logic.
// "species" KHÔNG nằm trong list này vì nó còn dùng để so sánh logic (icon, filter...)
const BILINGUAL_DISPLAY_FIELDS = [
    'breed',
    'description',
    'color',
    'traits',
    'idealHome',
    'lostDetails',
    'goodWith',
    'badWith',
] as const;
const MEDICAL_RECORD_BILINGUAL_FIELDS = ['recordName', 'nextDueName'] as const;
const PAW_HISTORY_BILINGUAL_FIELDS = ['title', 'description'] as const;

function normalizeMedicalRecord(record: any, lang: string): any {
    if (!record) return record;
    const normalized = { ...record };
    MEDICAL_RECORD_BILINGUAL_FIELDS.forEach((field) => {
        if (normalized[field] !== undefined) {
            normalized[field] = getLocalizedField(normalized[field], lang);
        }
    });
    return normalized;
}

function normalizePawHistoryItem(item: any, lang: string): any {
    if (!item) return item;
    const normalized = { ...item };
    PAW_HISTORY_BILINGUAL_FIELDS.forEach((field) => {
        if (normalized[field] !== undefined) {
            normalized[field] = getLocalizedField(normalized[field], lang);
        }
    });
    return normalized;
}

export function normalizePet(pet: any, lang: string): any {
    if (!pet) return pet;
    const normalized: any = { ...pet };

    BILINGUAL_DISPLAY_FIELDS.forEach((field) => {
        if (normalized[field] !== undefined) {
            normalized[field] = getLocalizedField(normalized[field], lang);
        }
    });

    if (Array.isArray(normalized.medicalRecords)) {
        normalized.medicalRecords = normalized.medicalRecords.map((r: any) => normalizeMedicalRecord(r, lang));
    }

    if (Array.isArray(normalized.pawHistory)) {
        normalized.pawHistory = normalized.pawHistory.map((h: any) => normalizePawHistoryItem(h, lang));
    }

    return normalized;
}


export function normalizePets(pets: any[], lang: string): any[] {
    return Array.isArray(pets) ? pets.map((p) => normalizePet(p, lang)) : pets;
}