import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated, DeviceEventEmitter, Dimensions,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.82;
const SPACING = 16;
const ITEM_SIZE = CARD_WIDTH + SPACING;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

const NAV_BTN_SIZE = 46;
const NAV_BTN_RADIUS = NAV_BTN_SIZE / 2;
const BORDER_THIN = 0.25;
const BORDER_THICK = 0.75;
LocaleConfig.locales['vi'] = {
    monthNames: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
    monthNamesShort: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
    dayNames: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
    dayNamesShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    today: 'Hôm nay',
};

LocaleConfig.locales['en'] = {
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    today: 'Today',
};

const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};
function StoryDatePickerModal({
    visible,
    title,
    value,
    minDate,
    maxDate,
    isVi,
    onChange,
    onRequestClose,
}: {
    visible: boolean;
    title: string;
    value: Date;
    minDate?: Date;
    maxDate?: Date;
    isVi?: boolean;
    onChange: (date: Date) => void;
    onRequestClose: () => void;
}) {
    if (!visible) return null;

    LocaleConfig.defaultLocale = isVi ? 'vi' : 'en';
    const selectedStr = toYMD(value);

    return (
        <View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFillObject, { zIndex: 999, elevation: 20 }]}
            className="justify-center items-center px-6"
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onRequestClose}
                style={StyleSheet.absoluteFillObject}
                className="bg-black/40"
            />

            <View
                className="bg-white rounded-[20px] w-full max-w-[320px] overflow-hidden"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25,
                    shadowRadius: 20,
                    elevation: 20,
                }}
            >
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
                    <Text className="text-[14px] font-semibold text-black">{title}</Text>
                    <TouchableOpacity onPress={onRequestClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Feather name="x" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <Calendar
                    current={selectedStr}
                    minDate={minDate ? toYMD(minDate) : undefined}
                    maxDate={maxDate ? toYMD(maxDate) : undefined}
                    markedDates={{ [selectedStr]: { selected: true, selectedColor: '#E89B5A' } }}
                    onDayPress={(day) => onChange(new Date(day.year, day.month - 1, day.day))}
                    theme={{
                        todayTextColor: '#E89B5A',
                        arrowColor: '#E89B5A',
                        selectedDayBackgroundColor: '#E89B5A',
                    }}
                />
            </View>
        </View>
    );
}
// Nút "+" thêm mới dùng chung kỹ thuật viền vát (bevel ring) với GlassNavButton,
// nhưng theo tông kính đen (dark glass) thay vì kính trắng.
const ADD_BTN_SIZE = 56;
const ADD_BTN_RADIUS = ADD_BTN_SIZE / 2;
const ADD_BORDER_THIN = 0.25;
const ADD_BORDER_THICK = 1.75;

// Số ảnh tối đa cho phần "Ảnh" của câu chuyện (thẻ card dùng ảnh đầu tiên,
// 2 ảnh kế tiếp hiện ở trạng thái mở rộng, phần dư hiện dạng "+N").
const MAX_STORY_IMAGES = 9;

// --- TYPES ---
type Lang = 'en' | 'vi';

export interface Bilingual {
    en: string;
    vi: string;
}

export interface BilingualList {
    en: string[];
    vi: string[];
}

export interface StoryItem {
    id: string;
    avatar: string;
    title: Bilingual;
    subtitle: Bilingual;
    content: Bilingual;
    fullContent: BilingualList;
    quote: Bilingual;
    afterQuote: Bilingual;
    date: string; // ISO date — hiển thị được format theo ngôn ngữ lúc render (giống field `dob` ở Edit Pet Screen)
    images: string[]; // images[0] = ảnh thẻ, images[0..2] = 3 ảnh preview khi mở rộng, phần dư => "+N"
}

// Định dạng ngày hiển thị theo ngôn ngữ — cùng ý tưởng với formatShortDate trong
// AddMedicalRecordModal, nhưng cho ra 2 định dạng đầy đủ khác nhau giữa VI/EN.
const formatStoryDate = (date: Date, lang: Lang) => {
    if (lang === 'vi') {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `Ngày ${day} tháng ${month} năm ${year}`;
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
};

// Dữ liệu mẫu dùng làm placeholder trước khi fetch xong (nếu API lỗi/chưa có, màn hình vẫn có gì đó để xem)
const FALLBACK_STORIES: StoryItem[] = [
    {
        id: '1',
        avatar: 'https://i.pravatar.cc/150?img=47',
        title: { vi: 'Qin Phan', en: 'Qin Phan' },
        subtitle: { vi: 'từ PawLife Shelter', en: 'from PawLife Shelter' },
        content: {
            vi: 'Từ một cuộc gặp gỡ tình cờ, con đã trở thành một phần trong gia đình. Những tiếng chạy chân nhỏ mỗi buổi sáng, những lần con chờ mình về...',
            en: 'From a chance encounter, you became part of our family. Little footsteps every morning, the moments you waited for me to come home...',
        },
        fullContent: {
            vi: [
                'Ngày đầu gặp con, mình chưa biết rằng một bé nhỏ như vậy có thể thay đổi cuộc sống của mình nhiều đến thế.',
                'Từ một cuộc gặp gỡ tình cờ, con đã trở thành một phần trong gia đình. Những tiếng chạy chân nhỏ mỗi buổi sáng, những lần con chờ mình về, và những khoảnh khắc bình dị mỗi ngày đều trở thành những điều thật đặc biệt.',
            ],
            en: [
                'The day we met, I did not yet know a little one like you could change my life so much.',
                'From a chance encounter, you became part of our family. Little footsteps every morning, the moments you waited for me to come home, and every simple moment together became something truly special.',
            ],
        },
        quote: {
            vi: 'Cảm ơn con vì đã đến bên gia đình. Hy vọng từ hôm nay, chúng ta sẽ cùng nhau tạo thật nhiều kỷ niệm.',
            en: 'Thank you for coming into our family. From today, I hope we create so many memories together.',
        },
        afterQuote: {
            vi: 'Nhận nuôi không chỉ là cho một bé thú một mái ấm. Đó là khi mình tìm thấy một người bạn sẽ cùng mình viết tiếp câu chuyện yêu thương.',
            en: 'Adopting is not just giving a pet a home. It is finding a friend who will keep writing a story of love with you.',
        },
        date: '2025-01-01T00:00:00.000Z',
        images: [
            'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1543852786-1cf6624b9987?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=900&auto=format&fit=crop',
        ],
    },
];

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function GlassNavButton({
    onPress,
    disabled,
    iconName,
}: {
    onPress: () => void;
    disabled: boolean;
    iconName: React.ComponentProps<typeof Feather>['name'];
}) {
    const cx = NAV_BTN_RADIUS;
    const cy = NAV_BTN_RADIUS;
    const rOuter = NAV_BTN_RADIUS - 0.5;
    const rx = rOuter - BORDER_THICK;
    const ry = rOuter - BORDER_THIN;

    const ringPath = `
    M ${cx - rOuter} ${cy}
    A ${rOuter} ${rOuter} 0 1 0 ${cx + rOuter} ${cy}
    A ${rOuter} ${rOuter} 0 1 0 ${cx - rOuter} ${cy}
    Z
    M ${cx - rx} ${cy}
    A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy}
    A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}
    Z
  `;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            disabled={disabled}
            style={{
                width: NAV_BTN_SIZE,
                height: NAV_BTN_SIZE,
                borderRadius: NAV_BTN_RADIUS,
                overflow: 'hidden',
            }}
        >
            <BlurView
                intensity={30}
                tint="light"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#FFFFFF',
                        opacity: disabled ? 0.3 : 0.3,
                    }}
                />
                <Svg
                    width={NAV_BTN_SIZE}
                    height={NAV_BTN_SIZE}
                    viewBox={`0 0 ${NAV_BTN_SIZE} ${NAV_BTN_SIZE}`}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                >
                    <Path
                        d={ringPath}
                        fill="#FFFFFF"
                        fillOpacity={disabled ? 0.5 : 0.5}
                        fillRule="evenodd"
                        transform={`rotate(45 ${cx} ${cy})`}
                    />
                </Svg>
                <Feather name={iconName} size={22} color={disabled ? '#4A4A4A' : '#4A4A4A'} />
            </BlurView>
        </TouchableOpacity>
    );
}

// --- Nút nổi "+" — kính đen, viền đen vát (dày ở góc trên-trái, mỏng ở góc dưới-phải)
// dùng đúng kỹ thuật SVG ring + rotate(45deg) như GlassNavButton, chỉ đổi tông màu.
function GlassAddButton({ onPress }: { onPress: () => void }) {
    const cx = ADD_BTN_RADIUS;
    const cy = ADD_BTN_RADIUS;
    const rOuter = ADD_BTN_RADIUS - 0.5;
    const rx = rOuter - ADD_BORDER_THICK;
    const ry = rOuter - ADD_BORDER_THIN;

    const ringPath = `
    M ${cx - rOuter} ${cy}
    A ${rOuter} ${rOuter} 0 1 0 ${cx + rOuter} ${cy}
    A ${rOuter} ${rOuter} 0 1 0 ${cx - rOuter} ${cy}
    Z
    M ${cx - rx} ${cy}
    A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy}
    A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}
    Z
  `;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            className="absolute bottom-6 right-6 z-50"
            style={{
                width: ADD_BTN_SIZE,
                height: ADD_BTN_SIZE,
                borderRadius: ADD_BTN_RADIUS,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 14,
                elevation: 10,
            }}
        >
            <BlurView
                intensity={40}
                tint="dark"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#0B0B0C',
                        opacity: 0.62,
                    }}
                />
                <Svg
                    width={ADD_BTN_SIZE}
                    height={ADD_BTN_SIZE}
                    viewBox={`0 0 ${ADD_BTN_SIZE} ${ADD_BTN_SIZE}`}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                >
                    <Path
                        d={ringPath}
                        fill="#000000"
                        fillOpacity={0.95}
                        fillRule="evenodd"
                        transform={`rotate(45 ${cx} ${cy})`}
                    />
                </Svg>
                <Feather name="plus" size={24} color="#FFFFFF" />
            </BlurView>
        </TouchableOpacity>
    );
}

export default function ForeverStoriesScreen() {
    const router = useRouter();
    const { user } = useContext(AuthContext) as any;
    const { t, language } = useLanguage();
    const isVi = language === 'vi';
    const lang: Lang = language === 'vi' ? 'vi' : 'en';
    const isAdmin = user?.email === 'hello@pawlife.vn';
    const flatListRef = useRef<any>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    // --- DỮ LIỆU TỪ API ---
    const [storiesData, setStoriesData] = useState<StoryItem[]>(FALLBACK_STORIES);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStories = async () => {
        try {
            const res = await axiosClient.get('/stories');
            setStoriesData(res.data);
        } catch (error) {
            console.error('Error fetching stories', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, []);

    // Nếu số thẻ thay đổi (thêm/xoá), giữ currentIndex trong giới hạn hợp lệ
    useEffect(() => {
        setCurrentIndex((prev) => Math.max(0, Math.min(prev, storiesData.length - 1)));
    }, [storiesData.length]);

    // --- Trạng thái mở rộng thẻ ---
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const expandAnim = useRef(new Animated.Value(0)).current;
    const expandedItem = storiesData.find((s) => s.id === expandedId) ?? null;

    // --- Trạng thái xem toàn bộ ảnh (gallery modal) ---
    const [galleryVisible, setGalleryVisible] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);

    const openStory = (id: string) => {
        setExpandedId(id);
        expandAnim.setValue(0);
        Animated.spring(expandAnim, {
            toValue: 1,
            useNativeDriver: true,
            damping: 18,
            stiffness: 140,
        }).start();
    };

    const closeStory = () => {
        Animated.timing(expandAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setExpandedId(null));
    };

    const openGallery = (index: number) => {
        setGalleryIndex(index);
        setGalleryVisible(true);
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const handleNext = () => {
        if (currentIndex < storiesData.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
        }
    };

    const getItemLayout = (_: any, index: number) => ({
        length: ITEM_SIZE,
        offset: ITEM_SIZE * index,
        index,
    });

    // ===================== ADMIN: STATE FORM (song ngữ VI/EN) =====================
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formLang, setFormLang] = useState<Lang>('vi');

    // Ảnh đại diện — chọn từ thư viện (giống Avatar Section ở Edit Pet Screen).
    // Giá trị có thể là local file:// uri (mới chọn, chưa upload) hoặc http(s) url (đã có sẵn).
    const [avatar, setAvatar] = useState('');

    // Ảnh minh hoạ — chọn nhiều từ thư viện, xử lý giống hệt handleUploadPhotos
    // trong AddMedicalRecordModal (local uri hoặc http(s) url đã upload).
    const [images, setImages] = useState<string[]>([]);
    const [adminImageViewerVisible, setAdminImageViewerVisible] = useState(false);
    const [adminImageViewerIndex, setAdminImageViewerIndex] = useState(0);

    // Ngày — chọn bằng CalendarPopupField giống field `dob` ở Edit Pet Screen,
    // hiển thị được format lại theo từng ngôn ngữ lúc render (formatStoryDate).
    const [storyDate, setStoryDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Trường song ngữ — mỗi field có bản VI và bản EN riêng
    const [titleVi, setTitleVi] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [subtitleVi, setSubtitleVi] = useState('');
    const [subtitleEn, setSubtitleEn] = useState('');
    const [contentVi, setContentVi] = useState('');
    const [contentEn, setContentEn] = useState('');
    const [fullContentViText, setFullContentViText] = useState(''); // mỗi đoạn 1 dòng
    const [fullContentEnText, setFullContentEnText] = useState('');
    const [quoteVi, setQuoteVi] = useState('');
    const [quoteEn, setQuoteEn] = useState('');
    const [afterQuoteVi, setAfterQuoteVi] = useState('');
    const [afterQuoteEn, setAfterQuoteEn] = useState('');

    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleFieldFocus = (field: string) => setFocusedField(field);
    const handleFieldBlur = () => setFocusedField(null);

    const resetForm = () => {
        setAvatar('');
        setImages([]);
        setStoryDate(new Date());
        setTitleVi(''); setTitleEn('');
        setSubtitleVi(''); setSubtitleEn('');
        setContentVi(''); setContentEn('');
        setFullContentViText(''); setFullContentEnText('');
        setQuoteVi(''); setQuoteEn('');
        setAfterQuoteVi(''); setAfterQuoteEn('');
    };

    const handleOpenAddStory = () => {
        setEditId(null);
        resetForm();
        setFormLang(lang);
        setFocusedField(null);
        setShowAdminModal(true);
    };

    const handleOpenEditStory = (item: StoryItem) => {
        setEditId(item.id);
        setAvatar(item.avatar || '');
        setImages(Array.isArray(item.images) ? item.images.filter(Boolean) : []);
        setStoryDate(item.date ? new Date(item.date) : new Date());

        setTitleVi(item.title?.vi || '');
        setTitleEn(item.title?.en || '');
        setSubtitleVi(item.subtitle?.vi || '');
        setSubtitleEn(item.subtitle?.en || '');
        setContentVi(item.content?.vi || '');
        setContentEn(item.content?.en || '');
        setFullContentViText((item.fullContent?.vi || []).join('\n'));
        setFullContentEnText((item.fullContent?.en || []).join('\n'));
        setQuoteVi(item.quote?.vi || '');
        setQuoteEn(item.quote?.en || '');
        setAfterQuoteVi(item.afterQuote?.vi || '');
        setAfterQuoteEn(item.afterQuote?.en || '');

        setFormLang(lang);
        setFocusedField(null);
        setShowAdminModal(true);
    };

    const handleDeleteStory = (id: string, name: string) => {
        Alert.alert(
            isVi ? 'Xoá câu chuyện' : 'Delete story',
            isVi ? `Bạn có chắc chắn muốn xoá "${name}"?` : `Are you sure you want to delete "${name}"?`,
            [
                { text: isVi ? 'Hủy' : 'Cancel', style: 'cancel' },
                {
                    text: isVi ? 'Xoá' : 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axiosClient.delete(`/stories/${id}`);
                            if (expandedId === id) {
                                expandAnim.setValue(0);
                                setExpandedId(null);
                            }
                            Alert.alert(
                                isVi ? 'Thành công' : 'Success',
                                isVi ? 'Đã xoá câu chuyện.' : 'Story deleted.'
                            );
                            fetchStories();
                            DeviceEventEmitter.emit('STORIES_UPDATED');
                        } catch (error) {
                            Alert.alert(
                                isVi ? 'Lỗi' : 'Error',
                                isVi ? 'Không thể xoá câu chuyện.' : 'Could not delete the story.'
                            );
                        }
                    },
                },
            ]
        );
    };

    // --- Chọn ảnh đại diện (1 ảnh, có allowsEditing để crop vuông) ---
    const handlePickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
            setAvatar(result.assets[0].uri);
        }
    };

    // --- Chọn nhiều ảnh minh hoạ — giống hệt handleUploadPhotos trong AddMedicalRecordModal ---
    const handleUploadStoryPhotos = async () => {
        const remainingSlots = MAX_STORY_IMAGES - images.length;
        if (remainingSlots <= 0) {
            Alert.alert(
                isVi ? 'Giới hạn' : 'Limit reached',
                isVi ? `Tối đa ${MAX_STORY_IMAGES} ảnh!` : `Maximum ${MAX_STORY_IMAGES} photos!`
            );
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remainingSlots,
            quality: 0.8,
        });
        if (!result.canceled && result.assets) {
            setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    // Upload 1 ảnh local lên R2 qua presigned URL — cùng logic với khối upload
    // medicalRecords.images trong handleSubmit của Edit Pet Screen. Ảnh http(s)
    // có sẵn thì bỏ qua (trả về nguyên uri).
    const uploadLocalImage = async (uri: string, folder: string): Promise<string | null> => {
        if (uri.startsWith('http')) return uri;
        try {
            const filename = uri.split('/').pop() || `story-${Date.now()}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const ext = match ? match[1].toLowerCase() : 'jpg';
            let type = 'image/jpeg';
            if (ext === 'png') type = 'image/png';
            else if (ext === 'webp') type = 'image/webp';

            const presignedRes = await axiosClient.post('/storage/presigned-url', {
                fileName: filename,
                fileType: type,
                folder,
            });
            const { uploadUrl, fileUrl } = presignedRes.data;
            const localFileFetch = await fetch(uri);
            const fileBlob = await localFileFetch.blob();
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': type },
                body: fileBlob,
            });
            if (!uploadRes.ok) throw new Error('Upload R2 failed');
            return fileUrl;
        } catch (err) {
            console.error(`[Upload Lỗi] Không thể upload ảnh ${uri}:`, err);
            return null;
        }
    };

    const handleSaveStory = async () => {
        if (!titleVi.trim() || !titleEn.trim() || !subtitleVi.trim() || !subtitleEn.trim()) {
            Alert.alert(
                isVi ? 'Lỗi' : 'Error',
                isVi
                    ? 'Vui lòng nhập tiêu đề và phụ đề cho cả 2 ngôn ngữ (VI/EN).'
                    : 'Please enter the title and subtitle for both languages (VI/EN).'
            );
            return;
        }
        if (images.length === 0) {
            Alert.alert(
                isVi ? 'Lỗi' : 'Error',
                isVi ? 'Vui lòng tải lên ít nhất 1 ảnh.' : 'Please upload at least 1 photo.'
            );
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload ảnh đại diện + toàn bộ ảnh minh hoạ (chỉ ảnh local mới cần upload thật)
            const uploadedAvatar = avatar ? await uploadLocalImage(avatar, 'stories') : '';
            const uploadedImagesRaw = await Promise.all(images.map((uri) => uploadLocalImage(uri, 'stories')));
            const parsedImages = uploadedImagesRaw.filter(Boolean) as string[];

            if (parsedImages.length === 0) {
                Alert.alert(
                    isVi ? 'Lỗi' : 'Error',
                    isVi ? 'Không thể tải ảnh lên, vui lòng thử lại.' : 'Could not upload photos, please try again.'
                );
                setIsSubmitting(false);
                return;
            }

            const slugSource = (titleEn || titleVi)
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '_');
            const generateId = editId || `${slugSource}_${Date.now()}`;

            const payload = {
                id: generateId,
                avatar: uploadedAvatar || '',
                title: { vi: titleVi.trim(), en: titleEn.trim() },
                subtitle: { vi: subtitleVi.trim(), en: subtitleEn.trim() },
                content: { vi: contentVi.trim(), en: contentEn.trim() },
                fullContent: {
                    vi: fullContentViText.split('\n').map((s) => s.trim()).filter(Boolean),
                    en: fullContentEnText.split('\n').map((s) => s.trim()).filter(Boolean),
                },
                quote: { vi: quoteVi.trim(), en: quoteEn.trim() },
                afterQuote: { vi: afterQuoteVi.trim(), en: afterQuoteEn.trim() },
                date: storyDate.toISOString(),
                images: parsedImages,
            };

            if (editId) {
                await axiosClient.patch(`/stories/${editId}`, payload);
                Alert.alert(
                    isVi ? 'Thành công' : 'Success',
                    isVi ? 'Đã cập nhật câu chuyện.' : 'Story updated.'
                );
            } else {
                await axiosClient.post('/stories', payload);
                Alert.alert(
                    isVi ? 'Thành công' : 'Success',
                    isVi ? 'Đã thêm câu chuyện mới.' : 'New story added.'
                );
            }
            setShowAdminModal(false);
            fetchStories();
            DeviceEventEmitter.emit('STORIES_UPDATED');
        } catch (error: any) {
            Alert.alert(
                isVi ? 'Lỗi' : 'Error',
                error?.response?.data?.message || (isVi ? 'Không thể lưu câu chuyện.' : 'Could not save the story.')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const viMissing = !titleVi.trim() || !subtitleVi.trim();
    const enMissing = !titleEn.trim() || !subtitleEn.trim();

    return (
        <ImageBackground
            source={require('../assets/images/forever-story-background.png')}
            resizeMode="cover"
            style={{ flex: 1 }}
        >
            <SafeAreaView className="flex-1">
                {!expandedId && (
                    <View className="flex-row items-center justify-center px-4 py-4 relative z-10">
                        <Text className="text-[18px] font-bold text-[#A39281]">{isVi ? "Hành trình hạnh phúc" : "Forever Stories"}</Text>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="absolute right-5 w-8 h-8 bg-white rounded-full items-center justify-center shadow-sm"
                        >
                            <Feather name="x" size={16} color="#A39281" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ flex: 1 }}>
                    {isLoading ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="#A39281" />
                        </View>
                    ) : expandedItem ? (
                        // ================== TRẠNG THÁI MỞ RỘNG ==================
                        <Animated.View
                            style={{
                                flex: 1,
                                opacity: expandAnim,
                                transform: [
                                    { scale: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                                ],
                            }}
                        >
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={{
                                    paddingHorizontal: SIDE_PADDING - 6,
                                    paddingTop: 16,
                                    paddingBottom: 32,
                                }}
                                showsVerticalScrollIndicator={false}
                            >
                                <View
                                    style={{
                                        borderRadius: 32,
                                        shadowColor: '#5025001A',
                                        shadowOffset: { width: 2, height: 6 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 16,
                                        elevation: 6,
                                    }}
                                >
                                    <View
                                        style={{
                                            borderRadius: 32,
                                            overflow: 'hidden',
                                            borderWidth: 0.75,
                                            borderColor: '#FFFFFF',
                                        }}
                                    >
                                        <BlurView intensity={35} tint="light" style={{ padding: 21 }}>
                                            <View
                                                pointerEvents="none"
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: '#FFFFFF',
                                                    opacity: 0.28,
                                                }}
                                            />

                                            <View style={{ zIndex: 1 }}>
                                                <View className="flex-row items-center mb-4">
                                                    <Image
                                                        source={{ uri: expandedItem.avatar }}
                                                        className="w-[42px] h-[42px] rounded-full bg-gray-200"
                                                    />
                                                    <View className="ml-3 flex-1">
                                                        <Text className="text-[14px] font-bold text-black">{expandedItem.title[lang]}</Text>
                                                        <Text className="text-[12px] text-[#8E8E93] italic mt-0.5">{expandedItem.subtitle[lang]}</Text>
                                                    </View>

                                                    {/* chỉ admin mới thấy nút sửa/xoá */}
                                                    {isAdmin && (
                                                        <View className="flex-row items-center mr-2">
                                                            <TouchableOpacity
                                                                onPress={() => handleOpenEditStory(expandedItem)}
                                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                                className="mr-3"
                                                            >
                                                                <Feather name="edit-2" size={14} color="#6B7280" />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                onPress={() => handleDeleteStory(expandedItem.id, expandedItem.title[lang])}
                                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                            >
                                                                <Feather name="trash-2" size={14} color="#EF4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}

                                                    <TouchableOpacity
                                                        onPress={closeStory}
                                                        className="w-8 h-8 bg-white rounded-full items-center justify-center shadow-sm"
                                                    >
                                                        <Feather name="x" size={16} color="#A39281" />
                                                    </TouchableOpacity>
                                                </View>

                                                {expandedItem.fullContent[lang].map((paragraph, idx) => (
                                                    <Text key={idx} className="text-[14px] text-[#757575] leading-[22px] mb-3">
                                                        {paragraph}
                                                    </Text>
                                                ))}

                                                {!!expandedItem.quote[lang] && (
                                                    <Text className="text-[14px] text-[#757575] italic leading-[22px] mb-3">
                                                        "{expandedItem.quote[lang]}"
                                                    </Text>
                                                )}

                                                {!!expandedItem.afterQuote[lang] && (
                                                    <Text className="text-[14px] text-[#757575] leading-[22px] mb-3">
                                                        {expandedItem.afterQuote[lang]}
                                                    </Text>
                                                )}

                                                <Text className="text-[12px] text-[#A39281] mb-4">
                                                    - {formatStoryDate(new Date(expandedItem.date), lang)}
                                                </Text>

                                                <TouchableOpacity activeOpacity={0.9} onPress={() => openGallery(0)}>
                                                    <Image
                                                        source={{ uri: expandedItem.images[0] }}
                                                        style={{ width: '100%', height: 190, borderRadius: 22 }}
                                                        resizeMode="cover"
                                                    />
                                                </TouchableOpacity>

                                                {expandedItem.images.length > 1 && (
                                                    <View className="flex-row mt-2" style={{ gap: 8 }}>
                                                        <TouchableOpacity
                                                            activeOpacity={0.9}
                                                            style={{ flex: 1, aspectRatio: 1, borderRadius: 18, overflow: 'hidden' }}
                                                            onPress={() => openGallery(1)}
                                                        >
                                                            <Image
                                                                source={{ uri: expandedItem.images[1] }}
                                                                style={{ width: '100%', height: '100%' }}
                                                                resizeMode="cover"
                                                            />
                                                        </TouchableOpacity>

                                                        {expandedItem.images.length > 2 && (
                                                            <TouchableOpacity
                                                                activeOpacity={0.85}
                                                                style={{ flex: 1, aspectRatio: 1, borderRadius: 18, overflow: 'hidden' }}
                                                                onPress={() => openGallery(2)}
                                                            >
                                                                <Image
                                                                    source={{ uri: expandedItem.images[2] }}
                                                                    style={{ width: '100%', height: '100%' }}
                                                                    resizeMode="cover"
                                                                />
                                                                {expandedItem.images.length > 3 && (
                                                                    <View
                                                                        pointerEvents="none"
                                                                        style={{
                                                                            position: 'absolute',
                                                                            top: 0,
                                                                            left: 0,
                                                                            right: 0,
                                                                            bottom: 0,
                                                                            backgroundColor: 'rgba(0,0,0,0.45)',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                        }}
                                                                    >
                                                                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>
                                                                            + {expandedItem.images.length - 3}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        </BlurView>
                                    </View>
                                </View>
                            </ScrollView>
                        </Animated.View>
                    ) : (
                        // ================== TRẠNG THÁI BÌNH THƯỜNG (carousel) ==================
                        <>
                            <View className="flex-1 mt-6">
                                <Animated.FlatList
                                    ref={flatListRef}
                                    data={storiesData}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    snapToInterval={ITEM_SIZE}
                                    decelerationRate="fast"
                                    bounces={false}
                                    contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
                                    getItemLayout={getItemLayout}
                                    initialScrollIndex={currentIndex}
                                    scrollEventThrottle={16}
                                    onScroll={Animated.event(
                                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                        { useNativeDriver: false }
                                    )}
                                    onViewableItemsChanged={onViewableItemsChanged}
                                    viewabilityConfig={viewabilityConfig}
                                    ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
                                    renderItem={({ item, index }) => {
                                        const inputRange = [
                                            (index - 1) * ITEM_SIZE,
                                            index * ITEM_SIZE,
                                            (index + 1) * ITEM_SIZE,
                                        ];

                                        const scale = scrollX.interpolate({
                                            inputRange,
                                            outputRange: [0.93, 1, 0.93],
                                            extrapolate: 'clamp',
                                        });
                                        const cardOpacity = scrollX.interpolate({
                                            inputRange,
                                            outputRange: [0.55, 1, 0.55],
                                            extrapolate: 'clamp',
                                        });
                                        const glassOpacity = scrollX.interpolate({
                                            inputRange,
                                            outputRange: [0.3, 0.28, 0.3],
                                            extrapolate: 'clamp',
                                        });

                                        return (
                                            <Animated.View
                                                style={{
                                                    width: CARD_WIDTH,
                                                    opacity: cardOpacity,
                                                    transform: [{ scale }],
                                                    borderRadius: 32,
                                                    shadowColor: '#5025001A',
                                                    shadowOffset: { width: 2, height: 6 },
                                                    shadowOpacity: 0.08,
                                                    shadowRadius: 12,
                                                    elevation: 4,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        borderRadius: 32,
                                                        borderWidth: 0.75,
                                                        borderColor: '#FFFFFF',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <TouchableOpacity
                                                        activeOpacity={0.92}
                                                        onPress={() => openStory(item.id)}
                                                        style={{ flex: 1 }}
                                                    >
                                                        <BlurView intensity={30} tint="light" style={{ flex: 1, padding: 21 }}>
                                                            <Animated.View
                                                                pointerEvents="none"
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    right: 0,
                                                                    bottom: 0,
                                                                    backgroundColor: '#FFFFFF',
                                                                    opacity: glassOpacity,
                                                                }}
                                                            />

                                                            <View style={{ flex: 1, zIndex: 1 }}>
                                                                <View className="flex-row items-center mb-4">
                                                                    <Image source={{ uri: item.avatar }} className="w-[42px] h-[42px] rounded-full bg-gray-200" />
                                                                    <View className="ml-3 flex-1">
                                                                        <Text className="text-[14px] font-bold text-black">{item.title[lang]}</Text>
                                                                        <Text className="text-[12px] text-[#8E8E93] italic mt-0.5">{item.subtitle[lang]}</Text>
                                                                    </View>

                                                                    {/* nút sửa/xoá — chỉ admin mới thấy */}
                                                                    {isAdmin && (
                                                                        <View className="flex-row items-center ml-2">
                                                                            <TouchableOpacity
                                                                                onPress={() => handleOpenEditStory(item)}
                                                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                                                className="mr-3"
                                                                            >
                                                                                <Feather name="edit-2" size={14} color="#6B7280" />
                                                                            </TouchableOpacity>
                                                                            <TouchableOpacity
                                                                                onPress={() => handleDeleteStory(item.id, item.title[lang])}
                                                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                                            >
                                                                                <Feather name="trash-2" size={14} color="#EF4444" />
                                                                            </TouchableOpacity>
                                                                        </View>
                                                                    )}
                                                                </View>

                                                                <Text className="text-[14px] text-[#757575] leading-[22px] mb-[12px]">
                                                                    {item.content[lang]}
                                                                </Text>

                                                                <Image
                                                                    source={{ uri: item.images[0] }}
                                                                    className="w-full flex-1 rounded-[24px] bg-gray-200"
                                                                    resizeMode="cover"
                                                                />
                                                            </View>
                                                        </BlurView>
                                                    </TouchableOpacity>
                                                </View>
                                            </Animated.View>
                                        );
                                    }}
                                />
                            </View>

                            <View className="flex-row justify-center items-center py-6 gap-6">
                                <GlassNavButton onPress={handlePrev} disabled={currentIndex === 0} iconName="chevron-left" />
                                <GlassNavButton onPress={handleNext} disabled={currentIndex === storiesData.length - 1} iconName="chevron-right" />
                            </View>
                        </>
                    )}

                    {/* Nút nổi "+" thêm câu chuyện mới — kính đen, chỉ admin, ẩn khi đang mở rộng thẻ */}
                    {isAdmin && !expandedItem && !isLoading && (
                        <GlassAddButton onPress={handleOpenAddStory} />
                    )}
                </View>
            </SafeAreaView>

            {/* Modal xem toàn bộ ảnh (gallery) — dùng cho ảnh câu chuyện đã publish */}
            <Modal
                visible={galleryVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setGalleryVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
                    <View
                        className="flex-row justify-end px-5"
                        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
                    >
                        <TouchableOpacity
                            onPress={() => setGalleryVisible(false)}
                            className="w-9 h-9 rounded-full items-center justify-center"
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        >
                            <Feather name="x" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {expandedItem && (
                        <>
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                contentOffset={{ x: galleryIndex * width, y: 0 }}
                                onMomentumScrollEnd={(e) => {
                                    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                                    setGalleryIndex(idx);
                                }}
                            >
                                {expandedItem.images.map((uri, idx) => (
                                    <View key={idx} style={{ width, alignItems: 'center', justifyContent: 'center' }}>
                                        <Image
                                            source={{ uri }}
                                            style={{ width: width - 40, height: width - 40, borderRadius: 16 }}
                                            resizeMode="cover"
                                        />
                                    </View>
                                ))}
                            </ScrollView>

                            <Text
                                className="text-center text-white/80 text-[13px]"
                                style={{ paddingBottom: insets.bottom + 16 }}
                            >
                                {galleryIndex + 1} / {expandedItem.images.length}
                            </Text>
                        </>
                    )}
                </View>
            </Modal>

            {/* Modal Thêm / Sửa câu chuyện — song ngữ VI/EN, chỉ admin mở được */}
            <Modal visible={showAdminModal} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/50">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ height: '92%' }}
                    >
                        <View className="flex-1 bg-white rounded-t-[28px] px-6 pt-3 pb-6">
                            <View className="items-center mb-4">
                                <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: '#E5E7EB' }} />
                            </View>

                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-xl font-bold text-gray-900">
                                    {editId
                                        ? (isVi ? 'Sửa câu chuyện' : 'Edit story')
                                        : (isVi ? 'Thêm câu chuyện mới' : 'Add new story')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowAdminModal(false)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                                >
                                    <Feather name="x" size={18} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
                                {/* PREVIEW */}
                                <View
                                    className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-3 py-3 mb-4"
                                    style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
                                >
                                    <Image
                                        source={avatar ? { uri: avatar } : undefined}
                                        className="w-[42px] h-[42px] rounded-full bg-gray-200"
                                    />
                                    <View className="flex-1 ml-3">
                                        <Text className="text-[14px] font-semibold text-gray-900" numberOfLines={1}>
                                            {(formLang === 'vi' ? titleVi : titleEn) || (formLang === 'vi' ? 'Tên nhân vật' : 'Character name')}
                                        </Text>
                                        <Text className="text-[12px] text-[#8E8E93]" numberOfLines={1}>
                                            {(formLang === 'vi' ? subtitleVi : subtitleEn) || (formLang === 'vi' ? 'Phụ đề...' : 'Subtitle...')}
                                        </Text>
                                    </View>
                                </View>

                                {/* TAB CHUYỂN NGÔN NGỮ — giống ingredient-check */}
                                <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
                                    <TouchableOpacity
                                        onPress={() => setFormLang('vi')}
                                        activeOpacity={0.8}
                                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${formLang === 'vi' ? 'bg-white' : ''}`}
                                        style={formLang === 'vi' ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : undefined}
                                    >
                                        <Text className={`text-sm font-semibold ${formLang === 'vi' ? 'text-[#E89B5A]' : 'text-gray-500'}`}>
                                            🇻🇳 Tiếng Việt
                                        </Text>
                                        {viMissing && <View className="w-1.5 h-1.5 rounded-full bg-red-400 ml-1.5" />}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setFormLang('en')}
                                        activeOpacity={0.8}
                                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${formLang === 'en' ? 'bg-white' : ''}`}
                                        style={formLang === 'en' ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : undefined}
                                    >
                                        <Text className={`text-sm font-semibold ${formLang === 'en' ? 'text-[#E89B5A]' : 'text-gray-500'}`}>
                                            🇬🇧 English
                                        </Text>
                                        {enMissing && <View className="w-1.5 h-1.5 rounded-full bg-red-400 ml-1.5" />}
                                    </TouchableOpacity>
                                </View>

                                {/* ẢNH ĐẠI DIỆN — chọn từ thư viện, giống Avatar Section ở Edit Pet Screen */}
                                <Text className="text-sm font-medium text-gray-700 mb-1.5">
                                    {isVi ? 'Ảnh đại diện' : 'Avatar'}
                                </Text>
                                <TouchableOpacity
                                    onPress={handlePickAvatar}
                                    activeOpacity={0.8}
                                    className="w-[64px] h-[64px] rounded-full bg-gray-100 border border-gray-200 items-center justify-center overflow-hidden mb-4"
                                >
                                    {avatar ? (
                                        <Image source={{ uri: avatar }} className="w-full h-full" />
                                    ) : (
                                        <Feather name="camera" size={22} color="#9CA3AF" />
                                    )}
                                </TouchableOpacity>

                                <Text className="text-[11px] font-semibold text-gray-400 tracking-wider mb-2.5">
                                    {formLang === 'vi' ? 'NỘI DUNG (TIẾNG VIỆT)' : 'CONTENT (ENGLISH)'}
                                </Text>

                                {formLang === 'vi' ? (
                                    <>
                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Tên</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-2.5 mb-3 text-base text-black"
                                            style={{ borderColor: focusedField === 'titleVi' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'titleVi' ? 1.5 : 1 }}
                                            placeholder="VD: Qin Phan"
                                            value={titleVi}
                                            onChangeText={setTitleVi}
                                            onFocus={() => handleFieldFocus('titleVi')}
                                            onBlur={handleFieldBlur}
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Phụ đề</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-2.5 mb-3 text-base text-black"
                                            style={{ borderColor: focusedField === 'subtitleVi' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'subtitleVi' ? 1.5 : 1 }}
                                            placeholder="VD: từ PawLife Shelter"
                                            value={subtitleVi}
                                            onChangeText={setSubtitleVi}
                                            onFocus={() => handleFieldFocus('subtitleVi')}
                                            onBlur={handleFieldBlur}
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Nội dung rút gọn (hiện trên thẻ)</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-3 mb-3 text-base text-black min-h-[60px]"
                                            style={{ borderColor: focusedField === 'contentVi' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'contentVi' ? 1.5 : 1 }}
                                            placeholder="Câu mở đầu ngắn gọn..."
                                            value={contentVi}
                                            onChangeText={setContentVi}
                                            onFocus={() => handleFieldFocus('contentVi')}
                                            onBlur={handleFieldBlur}
                                            multiline
                                            textAlignVertical="top"
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Nội dung đầy đủ (mỗi đoạn 1 dòng)</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-3 mb-3 text-base text-black min-h-[100px]"
                                            style={{ borderColor: focusedField === 'fullContentVi' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'fullContentVi' ? 1.5 : 1 }}
                                            placeholder={'Đoạn 1...\nĐoạn 2...'}
                                            value={fullContentViText}
                                            onChangeText={setFullContentViText}
                                            onFocus={() => handleFieldFocus('fullContentVi')}
                                            onBlur={handleFieldBlur}
                                            multiline
                                            textAlignVertical="top"
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Trích dẫn (in nghiêng)</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-3 mb-3 text-base text-black min-h-[60px]"
                                            style={{ borderColor: focusedField === 'quoteVi' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'quoteVi' ? 1.5 : 1 }}
                                            placeholder="Cảm ơn con vì..."
                                            value={quoteVi}
                                            onChangeText={setQuoteVi}
                                            onFocus={() => handleFieldFocus('quoteVi')}
                                            onBlur={handleFieldBlur}
                                            multiline
                                            textAlignVertical="top"
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Đoạn sau trích dẫn</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-3 mb-3 text-base text-black min-h-[60px]"
                                            style={{ borderColor: focusedField === 'afterQuoteVi' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'afterQuoteVi' ? 1.5 : 1 }}
                                            placeholder="Nhận nuôi không chỉ là..."
                                            value={afterQuoteVi}
                                            onChangeText={setAfterQuoteVi}
                                            onFocus={() => handleFieldFocus('afterQuoteVi')}
                                            onBlur={handleFieldBlur}
                                            multiline
                                            textAlignVertical="top"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Name</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-2.5 mb-3 text-base text-black"
                                            style={{ borderColor: focusedField === 'titleEn' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'titleEn' ? 1.5 : 1 }}
                                            placeholder="e.g. Qin Phan"
                                            value={titleEn}
                                            onChangeText={setTitleEn}
                                            onFocus={() => handleFieldFocus('titleEn')}
                                            onBlur={handleFieldBlur}
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Subtitle</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-2.5 mb-3 text-base text-black"
                                            style={{ borderColor: focusedField === 'subtitleEn' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'subtitleEn' ? 1.5 : 1 }}
                                            placeholder="e.g. from PawLife Shelter"
                                            value={subtitleEn}
                                            onChangeText={setSubtitleEn}
                                            onFocus={() => handleFieldFocus('subtitleEn')}
                                            onBlur={handleFieldBlur}
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Short content (shown on card)</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-3 mb-3 text-base text-black min-h-[60px]"
                                            style={{ borderColor: focusedField === 'contentEn' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'contentEn' ? 1.5 : 1 }}
                                            placeholder="A short opening line..."
                                            value={contentEn}
                                            onChangeText={setContentEn}
                                            onFocus={() => handleFieldFocus('contentEn')}
                                            onBlur={handleFieldBlur}
                                            multiline
                                            textAlignVertical="top"
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Full content (1 paragraph per line)</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-3 mb-3 text-base text-black min-h-[100px]"
                                            style={{ borderColor: focusedField === 'fullContentEn' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'fullContentEn' ? 1.5 : 1 }}
                                            placeholder={'Paragraph 1...\nParagraph 2...'}
                                            value={fullContentEnText}
                                            onChangeText={setFullContentEnText}
                                            onFocus={() => handleFieldFocus('fullContentEn')}
                                            onBlur={handleFieldBlur}
                                            multiline
                                            textAlignVertical="top"
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Quote (italic)</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-3 mb-3 text-base text-black min-h-[60px]"
                                            style={{ borderColor: focusedField === 'quoteEn' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'quoteEn' ? 1.5 : 1 }}
                                            placeholder="Thank you for..."
                                            value={quoteEn}
                                            onChangeText={setQuoteEn}
                                            onFocus={() => handleFieldFocus('quoteEn')}
                                            onBlur={handleFieldBlur}
                                            multiline
                                            textAlignVertical="top"
                                        />

                                        <Text className="text-sm font-medium text-gray-700 mb-1.5">Paragraph after quote</Text>
                                        <TextInput
                                            className="bg-gray-50 border rounded-xl px-4 py-3 mb-3 text-base text-black min-h-[60px]"
                                            style={{ borderColor: focusedField === 'afterQuoteEn' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'afterQuoteEn' ? 1.5 : 1 }}
                                            placeholder="Adopting is not just..."
                                            value={afterQuoteEn}
                                            onChangeText={setAfterQuoteEn}
                                            onFocus={() => handleFieldFocus('afterQuoteEn')}
                                            onBlur={handleFieldBlur}
                                            multiline
                                            textAlignVertical="top"
                                        />
                                    </>
                                )}

                                {/* NGÀY — chọn bằng CalendarPopupField, giống hệt field "Ngày sinh" ở Edit Pet Screen */}
                                <Text className="text-sm font-medium text-gray-700 mb-1.5">
                                    {formLang === 'vi' ? 'Ngày' : 'Date'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.8}
                                    className="bg-gray-50 border rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
                                    style={{ borderColor: '#E5E7EB', borderWidth: 1 }}
                                >
                                    <Text className="text-base text-black">{formatStoryDate(storyDate, formLang)}</Text>
                                    <Feather name="calendar" size={18} color="#9CA3AF" />
                                </TouchableOpacity>

                                {/* ẢNH MINH HOẠ — chọn nhiều từ thư viện, giống hệt khối Upload Photos trong AddMedicalRecordModal */}
                                <Text className="text-sm font-medium text-gray-700 mb-1.5">
                                    {isVi
                                        ? `Ảnh (Tối đa ${MAX_STORY_IMAGES} — ảnh đầu tiên dùng làm ảnh thẻ)`
                                        : `Photos (Max ${MAX_STORY_IMAGES} — the first photo is used as the card image)`}
                                </Text>

                                {images.length < MAX_STORY_IMAGES && (
                                    <TouchableOpacity
                                        onPress={handleUploadStoryPhotos}
                                        activeOpacity={0.7}
                                        className="flex-row border border-dashed border-[#E5E5E5] rounded-[12px] py-[12px] items-center justify-center mb-3"
                                    >
                                        <Ionicons name="cloud-upload-outline" size={20} color="#9CA3AF" />
                                        <Text className="text-[12px] text-black font-regular ml-2">
                                            {isVi ? `Tải ảnh lên (Tối đa ${MAX_STORY_IMAGES})` : `Upload photos (Max ${MAX_STORY_IMAGES})`}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {images.length > 0 && (
                                    <View className="flex-row flex-wrap gap-2 mb-4">
                                        {images.map((url, index) => (
                                            <View key={index} style={{ width: '31%', aspectRatio: 1 }} className="relative">
                                                <TouchableOpacity
                                                    activeOpacity={0.85}
                                                    onPress={() => {
                                                        setAdminImageViewerIndex(index);
                                                        setAdminImageViewerVisible(true);
                                                    }}
                                                    className="w-full h-full"
                                                >
                                                    <Image source={{ uri: url }} className="w-full h-full rounded-[12px]" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleRemoveImage(index)}
                                                    className="absolute -top-1.5 -right-1.5 bg-white rounded-full"
                                                >
                                                    <Ionicons name="close-circle" size={18} color="#FF3B30" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <TouchableOpacity
                                    className={`w-full py-4 rounded-xl flex-row justify-center items-center ${isSubmitting ? 'bg-orange-300' : 'bg-[#E89B5A]'}`}
                                    onPress={handleSaveStory}
                                    disabled={isSubmitting}
                                    style={{ shadowColor: '#E89B5A', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-base">
                                            {isVi ? 'Lưu câu chuyện' : 'Save story'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                        <StoryDatePickerModal
                            visible={showDatePicker}
                            title={formLang === 'vi' ? 'Chọn ngày' : 'Select date'}
                            value={storyDate}
                            maxDate={new Date()}
                            isVi={formLang === 'vi'}
                            onChange={(d) => {
                                setStoryDate(d);
                                setShowDatePicker(false);
                            }}
                            onRequestClose={() => setShowDatePicker(false)}
                        />
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Trình xem ảnh toàn màn hình cho phần Ảnh minh hoạ trong form admin —
          cùng cấu trúc với Modal xem ảnh trong AddMedicalRecordModal (vuốt ngang, dot ở dưới). */}
            <Modal
                visible={adminImageViewerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAdminImageViewerVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
                    <TouchableOpacity
                        onPress={() => setAdminImageViewerVisible(false)}
                        style={{
                            position: 'absolute',
                            top: 50,
                            right: 20,
                            zIndex: 100,
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>

                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        contentOffset={{ x: adminImageViewerIndex * width, y: 0 }}
                        onMomentumScrollEnd={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                            setAdminImageViewerIndex(idx);
                        }}
                        style={{ flex: 1 }}
                    >
                        {images.map((uri, idx) => (
                            <View
                                key={idx}
                                style={{ width, height: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
                            >
                                <Image source={{ uri }} style={{ width: '100%', height: '70%' }} resizeMode="contain" />
                            </View>
                        ))}
                    </ScrollView>

                    {images.length > 1 && (
                        <View
                            style={{
                                position: 'absolute',
                                bottom: 50,
                                left: 0,
                                right: 0,
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            {images.map((_, idx) => (
                                <View
                                    key={idx}
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        marginHorizontal: 4,
                                        backgroundColor: idx === adminImageViewerIndex ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                                    }}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </Modal>
        </ImageBackground>
    );
}