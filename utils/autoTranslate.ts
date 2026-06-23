// utils/autoTranslate.ts
import { BilingualValue } from './bilingualField';

/**
 * Build field song ngữ trước khi submit.
 * - Nếu text KHÔNG đổi so với bản gốc -> trả lại bản gốc, KHÔNG gọi AI (đỡ phí, đỡ rủi ro dịch lệch).
 * - Nếu đổi -> gọi AI dịch sang ngôn ngữ còn lại.
 * - original rỗng {vi:'',en:''} (trường hợp Add Pet, chưa có gì để so sánh) -> luôn coi là "đã đổi" -> luôn dịch.
 */
export async function buildBilingualOnSubmit(
    editedText: string,
    original: BilingualValue,
    isVi: boolean
): Promise<BilingualValue | null> {
    const trimmed = editedText.trim();
    if (!trimmed) return null;

    const originalDisplay = (isVi ? original.vi : original.en).trim();
    if (trimmed === originalDisplay && (original.vi || original.en)) {
        return original; // không đổi gì -> giữ bản gốc đầy đủ 2 ngôn ngữ
    }
    return { vi: trimmed, en: trimmed };
}