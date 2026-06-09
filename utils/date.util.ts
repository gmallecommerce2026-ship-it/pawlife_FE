// src/utils/date.util.ts

export const getTimeAgo = (
  dateInput?: string | number | Date | null, 
  isVi: boolean = false
): string => {
  if (!dateInput) return isVi ? 'Trước đây' : 'Previously';

  const time = new Date(dateInput).getTime();
  if (isNaN(time)) return isVi ? 'Trước đây' : 'Previously';

  const now = Date.now();
  const diffInSeconds = Math.floor((now - time) / 1000);

  // 1. Dưới 60 giây
  if (diffInSeconds < 60) {
    return isVi ? 'Vừa xong' : 'Just now';
  }

  // 2. Dưới 60 phút
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return isVi ? `${diffInMinutes} phút trước` : `${diffInMinutes} min ago`;
  }

  // 3. Dưới 24 giờ
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return isVi ? `${diffInHours} giờ trước` : `${diffInHours} hr ago`;
  }

  // 4. Trên 24 giờ (quy đổi thành ngày)
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return isVi ? `${diffInDays} ngày trước` : `${diffInDays} days ago`;
  }

  // Các đơn vị lớn hơn
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInDays < 365) {
    return isVi ? `${diffInMonths} tháng trước` : `${diffInMonths} months ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return isVi ? `${diffInYears} năm trước` : `${diffInYears} years ago`;
};

export const getTime = (
  dateInput?: string | number | Date | null, 
  isVi: boolean = false
): string => {
  if (!dateInput) return '';

  const time = new Date(dateInput).getTime();
  if (isNaN(time)) return '';

  const now = Date.now();
  const diffInSeconds = Math.floor((now - time) / 1000);

  // 1. Dưới 60 giây
  if (diffInSeconds < 60) {
    return '';
  }

  // 2. Dưới 60 phút
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return isVi ? `${diffInMinutes} phút` : `${diffInMinutes} ${diffInMinutes > 1 ? 'mins': 'min'}`;
  }

  // 3. Dưới 24 giờ
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return isVi ? `${diffInHours} giờ` : `${diffInHours} hr`;
  }

  // 4. Trên 24 giờ (quy đổi thành ngày)
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return isVi ? `${diffInDays} ngày` : `${diffInDays} ${diffInDays > 1 ? 'days': 'day'}`;
  }

  // Các đơn vị lớn hơn
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInDays < 365) {
    return isVi ? `${diffInMonths} tháng` : `${diffInMonths} ${diffInMonths > 1 ? 'months': 'month'}`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return isVi ? `${diffInYears} năm` : `${diffInYears} ${diffInYears > 1 ? 'years': 'year'}`;
};

export const formatMinutes = (minutes: number, isVi: boolean): string => {
  if (minutes < 60) {
    return isVi ? `${minutes} phút` : `${minutes} ${minutes > 1 ? 'mins' : 'min'}`;
  } 
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return isVi ? `${hours} giờ` : `${hours} hr`;
  }
  
  const days = Math.floor(hours / 24);
  return isVi ? `${days} ngày` : `${days} ${days > 1 ? 'days' : 'day'}`;
};