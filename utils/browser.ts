import * as WebBrowser from 'expo-web-browser';

export const openWebLink = async (url: string) => {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, // Mở popup trượt chuẩn iOS
    });
  } catch (error) {
    console.error("Lỗi khi mở In-App Browser:", error);
  }
};