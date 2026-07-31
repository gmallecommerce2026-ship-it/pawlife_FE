export type Badge = 'safe' | 'caution' | 'toxic' | 'emergency';
export type Bilingual = { vi: string; en: string };
export type BilingualList = { vi: string[]; en: string[] };

export const PET_TARGET_OPTIONS = [
  { label: 'Cả chó và mèo', value: ['dog', 'cat'] },
  { label: 'Chỉ dành cho Chó', value: ['dog'] },
  { label: 'Chỉ dành cho Mèo', value: ['cat'] },
];

export const BADGE_OPTIONS = [
  { label: 'An toàn (Safe)', value: 'safe' },
  { label: 'Cẩn thận (Caution)', value: 'caution' },
  { label: 'Có độc (Toxic)', value: 'toxic' },
  { label: 'Cấp cứu (Emergency)', value: 'emergency' },
];

export const ACTION_GUIDE_BY_BADGE: Partial<Record<Badge, { title: Bilingual; steps: BilingualList }>> = {
  caution: {
    title: { en: 'If your pet ate this', vi: 'Nếu thú cưng ăn phải' },
    steps: {
      en: [
        'Monitor for 12–24 hours',
        'Stop feeding more and make sure they drink enough water',
      ],
      vi: [
        'Theo dõi trong 12–24 giờ',
        'Ngưng cho ăn thêm và đảm bảo uống đủ nước',
      ],
    },
  },
  toxic: {
    title: { en: 'If your pet ate this', vi: 'Nếu thú cưng ăn phải' },
    steps: {
      en: [
        'Contact a vet as soon as possible for guidance',
        'Note down what and how much was eaten',
        "Don't self-treat without a vet's instruction",
      ],
      vi: [
        'Liên hệ thú y càng sớm càng tốt để được hướng dẫn',
        'Ghi nhớ đã ăn gì và lượng bao nhiêu',
        'Không tự xử lý nếu chưa có chỉ định từ bác sĩ',
      ],
    },
  },
  emergency: {
    title: { en: 'If your pet ate this', vi: 'Nếu thú cưng ăn phải' },
    steps: {
      en: [
        'Take your pet to the vet immediately',
        "Don't induce vomiting or attempt home treatment",
        'If seizures, difficulty breathing, or collapse occur → seek emergency care right away',
      ],
      vi: [
        'Đưa đến thú y ngay lập tức',
        'Không tự gây nôn / không tự xử lý tại nhà',
        'Nếu có co giật, khó thở, lịm → đi cấp cứu ngay',
      ],
    },
  },
};