// app/blocked-list.tsx
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    FlatList,
    Image,
    Modal,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authService } from '@/services/authService';
import { shelterService } from '@/services/shelterService';
import { useQueryClient } from '@tanstack/react-query';

type EntityKind = 'shelter' | 'user';

interface BlockedEntity {
    id: string;
    name: string;
    avatarUrl: string;
    blockedAt: string;
    kind: EntityKind; // ✅ gắn thêm loại để biết gọi unblockShelter hay unblockUser
}

export default function BlockedListScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { language } = useLanguage();
    const isVi = language === 'vi';

    const [combinedList, setCombinedList] = useState<BlockedEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedEntity, setSelectedEntity] = useState<BlockedEntity | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isUnblocking, setIsUnblocking] = useState(false);

    // ✅ Gọi riêng từng cái, mỗi cái tự try/catch — nếu getBlockedUsers() lỗi
    // (kể cả lỗi navigation-context bí ẩn) thì vẫn không làm mất danh sách shelters.
    const fetchAllBlockedData = useCallback(async () => {
        setIsLoading(true);

        let shelters: any[] = [];
        let users: any[] = [];

        try {
            shelters = (await shelterService.getBlockedShelters()) || [];
        } catch (error) {
            console.error('[FETCH BLOCKED SHELTERS] Error:', error);
        }

        try {
            users = (await authService.getBlockedUsers()) || [];
        } catch (error) {
            console.error('[FETCH BLOCKED USERS] Error:', error);
        }

        const merged: BlockedEntity[] = [
            ...shelters.map((s: any) => ({ ...s, kind: 'shelter' as EntityKind })),
            ...users.map((u: any) => ({ ...u, kind: 'user' as EntityKind })),
        ];

        // Mới bị chặn gần đây lên trước
        merged.sort((a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime());

        setCombinedList(merged);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAllBlockedData();
    }, [fetchAllBlockedData]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const handlePressUnblock = (entity: BlockedEntity) => {
        setSelectedEntity(entity);
        setShowConfirmModal(true);
    };

    const handleConfirmUnblock = async () => {
        if (!selectedEntity) return;
        try {
            setIsUnblocking(true);

            if (selectedEntity.kind === 'shelter') {
                await shelterService.unblockShelter(selectedEntity.id);
            } else {
                await authService.unblockUser(selectedEntity.id);
            }

            setCombinedList((prev) => prev.filter((e) => e.id !== selectedEntity.id));

            setShowConfirmModal(false);
            setSelectedEntity(null);

            queryClient.invalidateQueries({ queryKey: ['pets-feed'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['shelters-nearby'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['pets-list'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['search-shelters'], refetchType: 'all' });

            DeviceEventEmitter.emit('REFETCH_DATA_AFTER_UNBLOCK');
        } catch (error) {
            console.error('[UNBLOCK] Error:', error);
            Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Không thể bỏ chặn.' : 'Failed to unblock.');
        } finally {
            setIsUnblocking(false);
        }
    };

    const renderItem = ({ item }: { item: BlockedEntity }) => (
        <View className="flex-row items-center px-6 py-3.5">
            <View className="relative">
                <Image
                    source={{ uri: item.avatarUrl || 'https://via.placeholder.com/150' }}
                    className="w-[48px] h-[48px] rounded-full bg-gray-100"
                />
                {/* Badge nhỏ phân biệt Shelter / User */}
                <View
                    className={`absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full items-center justify-center border-2 border-white ${item.kind === 'shelter' ? 'bg-[#E89B5A]' : 'bg-[#6B7280]'
                        }`}
                >
                    <Feather
                        name={item.kind === 'shelter' ? 'home' : 'user'}
                        size={9}
                        color="white"
                    />
                </View>
            </View>
            <View className="flex-1 ml-3.5">
                <Text className="text-[15px] font-semibold text-black" numberOfLines={1}>
                    {item.name}
                </Text>
                <Text className="text-[12px] text-[#8E8E93] mt-0.5">
                    {item.kind === 'shelter'
                        ? (isVi ? 'Trạm cứu hộ · ' : 'Shelter · ')
                        : (isVi ? 'Người dùng · ' : 'User · ')}
                    {isVi ? 'Đã chặn ' : 'Blocked '}{formatDate(item.blockedAt)}
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => handlePressUnblock(item)}
                activeOpacity={0.7}
                className="border border-[#E5E5E5] px-4 py-2 rounded-full"
            >
                <Text className="text-[13px] font-semibold text-black">
                    {isVi ? 'Bỏ chặn' : 'Unblock'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView edges={['top', 'bottom']} className="flex-1">
                {/* --- HEADER --- */}
                <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
                        <Feather name="chevron-left" size={20} color="#000000" />
                    </TouchableOpacity>
                    <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                        <Text className="text-[20px] font-semibold text-black">
                            {isVi ? 'Đã chặn' : 'Blocked List'}
                        </Text>
                    </View>
                </View>

                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#E89B5A" />
                    </View>
                ) : combinedList.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-10">
                        <View className="w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-4">
                            <Feather name="slash" size={24} color="#D1D5DB" />
                        </View>
                        <Text className="text-[15px] font-semibold text-black text-center mb-1.5">
                            {isVi ? 'Chưa chặn ai' : 'Nothing blocked yet'}
                        </Text>
                        <Text className="text-[13px] text-[#8E8E93] text-center leading-5">
                            {isVi
                                ? 'Những trạm cứu hộ và người dùng bạn chặn sẽ xuất hiện ở đây, bạn có thể bỏ chặn bất cứ lúc nào.'
                                : 'Shelters and users you block will appear here. You can unblock them anytime.'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={combinedList}
                        keyExtractor={(item) => `${item.kind}-${item.id}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View className="h-[1px] bg-[#F3F4F6] mx-6" />}
                        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
                    />
                )}
            </SafeAreaView>

            {/* --- MODAL XÁC NHẬN BỎ CHẶN --- */}
            <Modal
                visible={showConfirmModal}
                animationType="fade"
                transparent
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/60 px-5">
                    <View className="bg-white w-full rounded-[28px] p-7 items-center shadow-2xl">
                        <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center mb-5 border border-orange-100">
                            <Feather name="user-check" size={26} color="#E89B5A" />
                        </View>

                        <Text className="text-[20px] font-bold text-gray-900 text-center mb-3 tracking-tight">
                            {isVi ? `Bỏ chặn ${selectedEntity?.name}?` : `Unblock ${selectedEntity?.name}?`}
                        </Text>

                        <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6 px-1">
                            {selectedEntity?.kind === 'shelter'
                                ? (isVi
                                    ? `Bạn sẽ thấy lại bài đăng và thú cưng từ ${selectedEntity?.name} như bình thường.`
                                    : `You will see posts and pets from ${selectedEntity?.name} again as normal.`)
                                : (isVi
                                    ? `${selectedEntity?.name} sẽ có thể gửi yêu cầu chuyển nhượng và tương tác với bạn trở lại.`
                                    : `${selectedEntity?.name} will be able to send transfer requests and interact with you again.`)}
                        </Text>

                        <View className="w-full flex-col gap-3.5">
                            <TouchableOpacity
                                className={`w-full py-4 rounded-[14px] items-center shadow-sm shadow-orange-200 ${isUnblocking ? 'bg-orange-300' : 'bg-[#E89B5A]'
                                    }`}
                                activeOpacity={0.8}
                                disabled={isUnblocking}
                                onPress={handleConfirmUnblock}
                            >
                                {isUnblocking ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text className="text-white font-bold text-[15px] tracking-wide">
                                        {isVi ? 'Xác nhận bỏ chặn' : 'Confirm Unblock'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-full bg-gray-50 py-4 rounded-[14px] items-center border border-gray-100"
                                activeOpacity={0.7}
                                onPress={() => setShowConfirmModal(false)}
                                disabled={isUnblocking}
                            >
                                <Text className="text-gray-600 font-bold text-[15px]">
                                    {isVi ? 'Hủy bỏ' : 'Cancel'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}