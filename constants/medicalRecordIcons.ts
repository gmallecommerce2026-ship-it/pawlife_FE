// constants/medicalRecordIcons.ts
const MEDICAL_RECORD_ICON_MAP: Record<string, any> = {
  VACCINE:        require('../assets/icon/vaccine.png'),
  VACCINATION:    require('../assets/icon/vaccine.png'),
  DENTAL_CARE:    require('../assets/icon/teeth-icon.png'),
  EXAMINATION:    require('../assets/icon/anual-icon.png'),
  DENTAL:         require('../assets/icon/teeth-icon.png'),
  CHECKUP:        require('../assets/icon/anual-icon.png'),
  ANNUAL_CHECKUP: require('../assets/icon/anual-icon.png'),
  OTHER:          require('../assets/icon/shield.png'),
};

const DEFAULT_MEDICAL_ICON = require('../assets/icon/vacc-icon-report.png');

export const getMedicalRecordIcon = (type?: string) =>
  MEDICAL_RECORD_ICON_MAP[(type || '').toUpperCase()] || DEFAULT_MEDICAL_ICON;