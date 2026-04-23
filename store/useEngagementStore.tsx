import { create } from 'zustand';

interface EngagementState {
    // Lưu trạng thái: { 'event_1': true, 'event_2': false }
    interestedEvents: Record<string, boolean>;
    followedShelters: Record<string, boolean>;
    
    // Actions để khởi tạo data khi fetch API về
    setInitialEventInterest: (eventId: string, isInterested: boolean) => void;
    setInitialShelterFollow: (shelterId: string, isFollowed: boolean) => void;

    // Actions để toggle (Optimistic Update)
    toggleEventInterest: (eventId: string) => void;
    toggleShelterFollow: (shelterId: string) => void;
}



export const useEngagementStore = create<EngagementState>((set) => ({
    interestedEvents: {},
    followedShelters: {},

    setInitialEventInterest: (eventId, isInterested) => 
        set((state) => ({
            interestedEvents: { ...state.interestedEvents, [eventId]: isInterested }
        })),

    setInitialShelterFollow: (shelterId, isFollowed) => 
        set((state) => ({
            followedShelters: { ...state.followedShelters, [shelterId]: isFollowed }
        })),

    toggleEventInterest: (eventId) => 
        set((state) => ({
            interestedEvents: { 
                ...state.interestedEvents, 
                [eventId]: !state.interestedEvents[eventId] 
            }
        })),

    toggleShelterFollow: (shelterId) => 
        set((state) => ({
            followedShelters: { 
                ...state.followedShelters, 
                [shelterId]: !state.followedShelters[shelterId] 
            }
        })),
}));