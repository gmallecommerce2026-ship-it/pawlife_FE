// contexts/PetVisibilityContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'hidden_pet_ids_v1';

type PetVisibilityContextType = {
  hiddenPetIds: Set<string>;
  hidePet: (petId: string, ownerId?: string | null, shelterId?: string | null) => void;
  hiddenOwnerIds: Set<string>;
  hiddenShelterIds: Set<string>;
  filterPets: <T extends { id: string; ownerId?: string; shelterId?: string }>(list: T[]) => T[];
};

const PetVisibilityContext = createContext<PetVisibilityContextType | null>(null);

export const PetVisibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const [hiddenPetIds, setHiddenPetIds] = useState<Set<string>>(new Set());
  const [hiddenOwnerIds, setHiddenOwnerIds] = useState<Set<string>>(new Set());
  const [hiddenShelterIds, setHiddenShelterIds] = useState<Set<string>>(new Set());
  const loaded = useRef(false);

  // Load từ AsyncStorage khi mount (giữ trạng thái ẩn qua các lần mở app)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setHiddenPetIds(new Set(parsed.pets || []));
          setHiddenOwnerIds(new Set(parsed.owners || []));
          setHiddenShelterIds(new Set(parsed.shelters || []));
        }
      } finally {
        loaded.current = true;
      }
    })();
  }, []);

  const persist = useCallback((pets: Set<string>, owners: Set<string>, shelters: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      pets: Array.from(pets), owners: Array.from(owners), shelters: Array.from(shelters),
    })).catch(() => {});
  }, []);

  const hidePet = useCallback((petId: string, ownerId?: string | null, shelterId?: string | null) => {
    setHiddenPetIds(prev => {
      const next = new Set(prev); next.add(petId);
      setHiddenOwnerIds(prevO => {
        const nextO = ownerId ? new Set(prevO).add(ownerId) : prevO;
        setHiddenShelterIds(prevS => {
          const nextS = shelterId ? new Set(prevS).add(shelterId) : prevS;
          persist(next, nextO, nextS);
          return nextS;
        });
        return nextO;
      });
      return next;
    });
  }, [persist]);

  const filterPets = useCallback(<T extends { id: string; ownerId?: string; shelterId?: string }>(list: T[]) => {
    if (hiddenPetIds.size === 0 && hiddenOwnerIds.size === 0 && hiddenShelterIds.size === 0) return list;
    return list.filter(p =>
      !hiddenPetIds.has(p.id) &&
      !(p.ownerId && hiddenOwnerIds.has(p.ownerId)) &&
      !(p.shelterId && hiddenShelterIds.has(p.shelterId))
    );
  }, [hiddenPetIds, hiddenOwnerIds, hiddenShelterIds]);

  return (
    <PetVisibilityContext.Provider value={{ hiddenPetIds, hiddenOwnerIds, hiddenShelterIds, hidePet, filterPets }}>
      {children}
    </PetVisibilityContext.Provider>
  );
};

export const usePetVisibility = () => {
  const ctx = useContext(PetVisibilityContext);
  if (!ctx) throw new Error('usePetVisibility must be used within PetVisibilityProvider');
  return ctx;
};