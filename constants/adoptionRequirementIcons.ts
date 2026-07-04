// constants/adoptionRequirementIcons.ts
import { ImageSourcePropType } from 'react-native';

export const ADOPTION_REQUIREMENT_ICONS: Record<string, ImageSourcePropType> = {
  'home-icon': require('../assets/icon/home-icon.png'),
  'dog-walk': require('../assets/icon/dog-walk.png'),
  'experience-icon': require('../assets/icon/experience-icon.png'),
  'no-cat-icon': require('../assets/icon/no-cat-icon.png'),
  'no-dog-icon': require('../assets/icon/no-dog-icon.png'),
  'no-small-pet-icon': require('../assets/icon/no-small-pet-icon.png'),
  'calendar-icon': require('../assets/icon/calendar-icon.png'),
};

export const DEFAULT_REQUIREMENT_ICON = ADOPTION_REQUIREMENT_ICONS['home-icon'];