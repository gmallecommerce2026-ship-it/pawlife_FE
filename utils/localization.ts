export const getLocalizedField = (
  fieldData: any,
  currentLang: string,
  fallbackLang: string = 'en'
): string => {
  if (!fieldData) return '';

  let data = fieldData;

  // 1. Giải mã (Parse) nếu Backend trả về chuỗi Stringified JSON
  if (typeof fieldData === 'string') {
    try {
      const parsed = JSON.parse(fieldData);
      if (typeof parsed === 'object' && parsed !== null) {
        data = parsed; // Parse thành công, gán lại để xử lý bên dưới
      } else {
        return fieldData; // Nó là chuỗi chữ bình thường (VD: "Chó Corgi")
      }
    } catch (e) {
      return fieldData; // Parse lỗi -> Đích thị là chuỗi bình thường chưa convert
    }
  }

  // 2. Xử lý an toàn nếu dữ liệu là Mảng (VD: ["Playful", "Clingy"])
  if (Array.isArray(data)) {
    return data.join(', ');
  }

  // 3. Xử lý "Mở hộp" Object đa ngôn ngữ { vi: "còn đuôi", en: "has tail" }
  if (typeof data === 'object' && data !== null) {
    return data[currentLang] || data[fallbackLang] || data['vi'] || data['en'] || '';
  }

  return String(data);
};

export const getLocalizedArrayField = (
  fieldData: any,
  currentLang: string,
  fallbackLang: string = 'en'
): string => {
  if (!fieldData) return '';

  let data = fieldData;

  // Parse nếu Backend trả về mảng dưới dạng stringified JSON
  if (typeof fieldData === 'string') {
    try {
      const parsed = JSON.parse(fieldData);
      if (Array.isArray(parsed)) {
        data = parsed;
      } else {
        return fieldData;
      }
    } catch (e) {
      return fieldData;
    }
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => getLocalizedField(item, currentLang, fallbackLang))
      .filter(Boolean)
      .join(', ');
  }

  // Không phải mảng -> fallback dùng resolver gốc
  return getLocalizedField(data, currentLang, fallbackLang);
};
