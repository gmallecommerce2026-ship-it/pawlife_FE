import { Text } from '@/components/AppText';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type AnchorLayout = { x: number; y: number; width: number; height: number };

export type OpenParams = {
    value: Date;
    minimumDate?: Date;
    maximumDate?: Date;
    locale?: string;
    onChange: (date: Date) => void;
    anchorLayout: AnchorLayout;
    labels?: { cancel: string; done: string };
};

interface EngineState {
    request: OpenParams | null;
    mounted: boolean;
    requestId: number;
    pickerLayout: { x: number; y: number; width: number };
    pickerOpacity: Animated.Value;
    pickerTranslateY: Animated.Value;
}

interface DatePickerContextValue {
    open: (params: OpenParams) => void;
    close: (onDone?: () => void) => void;
    state: EngineState;
    /**
     * Gọi khi 1 <Modal> muốn "claim" quyền render overlay picker bên trong
     * chính nó (vì native Modal luôn nổi trên mọi View không nằm trong Modal).
     * Trả về hàm cleanup để bỏ claim khi Modal đóng/unmount.
     * Khi có >=1 host đang claim, DatePickerProvider ở root sẽ NGỪNG tự render
     * overlay — đảm bảo CHỈ MỘT nơi render DateTimePicker native tại 1 thời điểm.
     */
    registerModalHost: () => () => void;
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null);

export function useGlobalDatePicker() {
    const ctx = useContext(DatePickerContext);
    if (!ctx) throw new Error('useGlobalDatePicker phải được dùng bên trong <DatePickerProvider>');
    return ctx;
}

function computeLayout(anchor: AnchorLayout) {
    const dropdownWidth = 340;
    const dropdownHeight = 380;
    const finalX = (SCREEN_WIDTH - dropdownWidth) / 2;
    let finalY = anchor.y + anchor.height + 8;
    if (finalY + dropdownHeight > SCREEN_HEIGHT) {
        finalY = anchor.y - dropdownHeight - 8;
        if (finalY < 40) finalY = 40;
    }
    return { x: finalX, y: finalY, width: dropdownWidth };
}

export function DatePickerOverlayContent({
    request, mounted, requestId, pickerLayout, pickerOpacity, pickerTranslateY, onClose,
}: {
    request: OpenParams | null;
    mounted: boolean;
    requestId: number;
    pickerLayout: { x: number; y: number; width: number };
    pickerOpacity: Animated.Value;
    pickerTranslateY: Animated.Value;
    onClose: () => void;
}) {
    if (!request) return null;

    return (
        <View pointerEvents="box-none" style={{ flex: 1 }}>
            <TouchableOpacity
                activeOpacity={1}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                onPress={onClose}
            />
            <Animated.View
                style={{
                    position: 'absolute',
                    top: pickerLayout.y,
                    left: pickerLayout.x,
                    width: pickerLayout.width,
                    opacity: pickerOpacity,
                    transform: [{ translateY: pickerTranslateY }],
                    borderRadius: 16,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: 10,
                }}
            >
                <BlurView tint="dark" intensity={65} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,15,15,0.45)' }} />

                <View className="flex-row justify-between items-center px-[16px] py-[12px] border-b border-white/10 relative z-10">
                    <TouchableOpacity onPress={onClose}>
                        <Text className="text-[16px] text-[#A1A1AA] font-medium">{request.labels?.cancel ?? 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose}>
                        <Text className="text-[16px] font-semibold text-[#E89B5A]">{request.labels?.done ?? 'Done'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ paddingTop: 4, paddingBottom: 4, paddingHorizontal: 10, alignItems: 'center' }} className="relative z-10">
                    {mounted && (
                        <DateTimePicker
                            key={`inline-date-picker-${requestId}`}
                            value={request.value}
                            mode="date"
                            display="inline"
                            themeVariant="dark"
                            locale={request.locale}
                            minimumDate={request.minimumDate}
                            maximumDate={request.maximumDate}
                            style={{ width: 320, height: 315, alignSelf: 'center' }}
                            accentColor="#E89B5A"
                            onChange={(_, selectedDate) => {
                                if (selectedDate) request.onChange(selectedDate);
                            }}
                        />
                    )}
                </View>
            </Animated.View>
        </View>
    );
}

export function DatePickerProvider({ children }: { children: React.ReactNode }) {
    const [request, setRequest] = useState<OpenParams | null>(null);
    const requestRef = useRef<OpenParams | null>(null);
    useEffect(() => { requestRef.current = request; }, [request]);

    const [mounted, setMounted] = useState(false);
    const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
    const pickerOpacity = useRef(new Animated.Value(0)).current;
    const pickerTranslateY = useRef(new Animated.Value(-8)).current;
    const closingRef = useRef(false);
    const requestIdRef = useRef(0);
    const [requestId, setRequestId] = useState(0);
    const hostCountRef = useRef(0);
    const [hostCount, setHostCount] = useState(0);

    useEffect(() => {
        if (request) {
            const timer = setTimeout(() => setMounted(true), 100);
            return () => clearTimeout(timer);
        }
        setMounted(false);
    }, [request]);

    const requestTokenRef = useRef(0);

    const actuallyOpen = useCallback((params: OpenParams) => {
        requestIdRef.current += 1;
        const myToken = requestIdRef.current;
        requestTokenRef.current = myToken;
        requestRef.current = params;          // 👈 gán ĐỒNG BỘ ngay, không chờ effect
        setRequestId(myToken);
        setPickerLayout(computeLayout(params.anchorLayout));
        setRequest(params);
        pickerOpacity.setValue(0);
        pickerTranslateY.setValue(-8);
        Animated.parallel([
            Animated.timing(pickerOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(pickerTranslateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        ]).start();
    }, [pickerOpacity, pickerTranslateY]);

    const close = useCallback((onDone?: () => void) => {
        if (!requestRef.current) { onDone?.(); return; }
        const myToken = requestTokenRef.current;
        closingRef.current = true;
        Animated.parallel([
            Animated.timing(pickerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(pickerTranslateY, { toValue: -8, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            // Chỉ dọn state nếu KHÔNG có request mới nào đã mở đè lên trong lúc animation chạy
            if (requestTokenRef.current === myToken) {
                requestRef.current = null;
                setRequest(null);
                setMounted(false);
            }
            setTimeout(() => {
                closingRef.current = false;
                onDone?.();
            }, 60);
        });
    }, [pickerOpacity, pickerTranslateY]);


    const open = useCallback((params: OpenParams) => {
        if (requestRef.current || closingRef.current) {
            close(() => actuallyOpen(params));
        } else {
            actuallyOpen(params);
        }
    }, [close, actuallyOpen]);


    const registerModalHost = useCallback(() => {
        close();
        hostCountRef.current += 1;
        setHostCount(hostCountRef.current);
        return () => {
            hostCountRef.current = Math.max(0, hostCountRef.current - 1);
            setHostCount(hostCountRef.current);
        };
    }, [close]);


    const state: EngineState = { request, mounted, requestId, pickerLayout, pickerOpacity, pickerTranslateY };



    return (
        <DatePickerContext.Provider value={{ open, close, state, registerModalHost }}>
            {children}
            {Platform.OS === 'ios' && !!request && hostCount === 0 && (
                <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <DatePickerOverlayContent
                        request={request}
                        mounted={mounted}
                        requestId={requestId}
                        pickerLayout={pickerLayout}
                        pickerOpacity={pickerOpacity}
                        pickerTranslateY={pickerTranslateY}
                        onClose={() => close()}
                    />
                </View>
            )}
        </DatePickerContext.Provider>
    );
}