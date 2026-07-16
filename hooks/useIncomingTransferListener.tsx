import axiosClient from '@/api/axiosClient';
import { socket } from '@/utils/socket';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface IncomingTransfer {
    transferId: string;
    petId: string;
    pet?: any;
    senderName?: string;
}

export function useIncomingTransferListener(isAuthenticated: boolean) {
    const [incomingRequest, setIncomingRequest] = useState<IncomingTransfer | null>(null);
    const dismissedIds = useRef<Set<string>>(new Set());

    const applyIfNotDismissed = useCallback((data: IncomingTransfer) => {
        if (!data?.transferId) return;
        if (dismissedIds.current.has(data.transferId)) return;
        setIncomingRequest(data);
    }, []);

    // 1. Check ngay khi app mở / mount: có transfer PENDING nào đang chờ mình không
    const checkPendingOnLaunch = useCallback(async () => {
        try {
            const res = await axiosClient.get('/pets/transfer-requests/pending');
            const pending = res.data;
            if (pending?.id) {
                applyIfNotDismissed({
                    transferId: pending.id,
                    petId: pending.petId,
                    pet: pending.pet,
                    senderName: pending.sender?.name,
                });
            }
        } catch (e) {
            // im lặng — không có pending transfer hoặc lỗi mạng tạm thời, không cần báo user
        }
    }, [applyIfNotDismissed]);

    useEffect(() => {
        if (isAuthenticated) checkPendingOnLaunch();
    }, [isAuthenticated, checkPendingOnLaunch]);


    // 2. Lắng nghe realtime — bắt được ngay cả khi app đang mở ở bất kỳ screen nào
    useEffect(() => {
        const handleRequested = (data: IncomingTransfer) => {
            applyIfNotDismissed(data);
        };

        const clearIfMatches = (data: { transferId?: string; petId?: string }) => {
            setIncomingRequest(prev => {
                if (!prev) return prev;
                if (prev.transferId === data.transferId || prev.petId === data.petId) {
                    return null;
                }
                return prev;
            });
        };

        socket.on('transfer_requested', handleRequested);
        socket.on('transfer_completed', clearIfMatches);
        socket.on('transfer_cancelled', clearIfMatches);

        return () => {
            socket.off('transfer_requested', handleRequested);
            socket.off('transfer_completed', clearIfMatches);
            socket.off('transfer_cancelled', clearIfMatches);
        };
    }, [applyIfNotDismissed]);

    const dismiss = useCallback(() => {
        if (incomingRequest?.transferId) {
            dismissedIds.current.add(incomingRequest.transferId);
        }
        setIncomingRequest(null);
    }, [incomingRequest]);

    return { incomingRequest, dismiss, refetchPending: checkPendingOnLaunch };
}