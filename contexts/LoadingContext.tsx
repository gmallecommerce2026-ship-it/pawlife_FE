// contexts/LoadingContext.tsx
import { CustomLoader } from '@/components/CustomLoader';
import React, { createContext, ReactNode, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
            <View style={{ flex: 1 }}>
                {children}

                {/* Phủ toàn màn hình phía trên tất cả children */}
                {isLoading && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
                        <CustomLoader text={loadingText} />
                    </View>
                )}
            </View>
        </LoadingContext.Provider>
    );
};