// utils/notificationI18n.ts
export const resolveNotificationText = (item: any, t: any) => {
  const i18n = item?.metadata?.i18n;
  if (i18n?.titleKey && i18n?.bodyKey && t) {
    return {
      title: t(i18n.titleKey, i18n.params || {}),
      body: t(i18n.bodyKey, i18n.params || {}),
    };
  }
  // fallback cho noti không có i18n metadata (cũ, hoặc loại không có dữ liệu động)
  return { title: item?.title, body: item?.body };
};