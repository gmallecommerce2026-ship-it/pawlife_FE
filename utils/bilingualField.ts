// utils/bilingualField.ts
export interface BilingualValue {
  vi: string;
  en: string;
}

/** Tách field từ API (string JSON / object / string thường) thành {vi, en} đầy đủ — KHÔNG gộp thành 1 chuỗi, để còn dùng lại khi submit. */
export function parseBilingual(fieldData: any): BilingualValue {
  if (!fieldData) return { vi: '', en: '' };
  let data = fieldData;
  if (typeof fieldData === 'string') {
    try {
      const parsed = JSON.parse(fieldData);
      if (typeof parsed === 'object' && parsed !== null) data = parsed;
      else return { vi: fieldData, en: fieldData };
    } catch {
      return { vi: fieldData, en: fieldData };
    }
  }
  if (typeof data === 'object' && data !== null) {
    return { vi: data.vi || '', en: data.en || '' };
  }
  return { vi: String(data), en: String(data) };
}

export function displayBilingual(value: BilingualValue, isVi: boolean): string {
  return isVi ? (value.vi || value.en) : (value.en || value.vi);
}