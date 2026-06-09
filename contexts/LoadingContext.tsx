// contexts/LoadingContext.tsx
import { CustomLoader } from '@/components/CustomLoader';
import React, { createContext, ReactNode, useContext, useState } from 'react';
import { View } from 'react-native';

interface LoadingContextType {
    showLoading: (text?: string) => void;
    hideLoading: () => void;
}

export const globalLoadingRef = React.createRef<LoadingContextType>();

const LoadingContext = createContext<LoadingContextType>({
    showLoading: () => {},
    hideLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Loading data...');

    const showLoading = (text = 'Loading data...') => {
        setLoadingText(text);
        setIsLoading(true);
    };

    const hideLoading = () => {
        setIsLoading(false);
    };

    React.useImperativeHandle(globalLoadingRef, () => ({
        showLoading,
        hideLoading,
    }));

    return (
        <LoadingContext.Provider value={{ showLoading, hideLoading }}>
            {/* LƯU Ý QUAN TRỌNG: Phải có style={{ flex: 1 }} ở đây */}
            <View style={{ flex: 1 }}> 
                {children}
                
                {isLoading && (
                    <CustomLoader text={loadingText} transparent={true} />
                )}
            </View>
        </LoadingContext.Provider>
    );
};