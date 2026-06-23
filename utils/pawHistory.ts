type Language = 'en' | 'vi';

export function resolvePawHistoryItem(
    item: any,
    t: (key: string, params?: Record<string, any>) => string,
    l: (fieldData: any) => string,
    language: Language
): { title: string; description: string } {
    const i18n = item?.i18n;

    console.log('\n=============================================');
    console.log(`[DEBUG_PAW_HISTORY] RAW ITEM ID:`, item?.id);
    console.log(`[DEBUG_PAW_HISTORY] RAW I18N PARAMS:`, JSON.stringify(i18n?.params, null, 2));
    
    const extractSafeText = (val: any, paramKey: string) => {
        if (!val) return '';
        
        // Log xem giá trị đầu vào là gì và kiểu dữ liệu gì
        console.log(`[DEBUG_EXTRACT_SAFE - ${paramKey}] Type: ${typeof val} | Value:`, val);

        if (typeof val === 'string') {
            if (val === '[object Object]') {
                console.log(`⚠️ CẢNH BÁO: Dữ liệu của ${paramKey} đã bị hỏng (ép kiểu thành string) ngay từ Backend!`);
            }
            if (val.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(val);
                    return language === 'vi' ? (parsed.vi || parsed.en) : (parsed.en || parsed.vi);
                } catch {
                    return val;
                }
            }
            return val;
        }
        
        if (typeof val === 'object') {
            return language === 'vi' ? (val.vi || val.en) : (val.en || val.vi);
        }
        
        return String(val);
    };

    if (i18n?.titleKey && i18n?.bodyKey) {
        const resolvedParams: Record<string, any> = {};
        
        if (i18n.params) {
            Object.keys(i18n.params).forEach((key) => {
                resolvedParams[key] = extractSafeText(i18n.params[key], key);
            });

            if (i18n.params.recordNameEn !== undefined || i18n.params.recordNameVi !== undefined) {
                resolvedParams.recordName = language === 'vi'
                    ? (i18n.params.recordNameVi || i18n.params.recordNameEn || '')
                    : (i18n.params.recordNameEn || i18n.params.recordNameVi || '');
            }
        }
        
        const finalTitle = t(i18n.titleKey, resolvedParams);
        console.log(`[DEBUG_PAW_HISTORY] FINAL TITLE:`, finalTitle);
        console.log('=============================================\n');

        return {
            title: finalTitle,
            description: t(i18n.bodyKey, resolvedParams),
        };
    }

    return {
        title: extractSafeText(item?.title, 'fallback_title'),
        description: extractSafeText(item?.description, 'fallback_desc'),
    };
}