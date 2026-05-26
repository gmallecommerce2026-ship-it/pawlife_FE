// utils/dateHelper.ts (hoặc để trực tiếp vào component)
export const calculateAge = (dob: string | Date | null | undefined): string | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }
  
  if (years <= 0) {
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + m;
    return months > 0 ? `${months} months` : 'Newborn';
  }
  
  return `${years} year${years > 1 ? 's' : ''}`;
};