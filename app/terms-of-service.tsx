// app/terms-of-service.tsx
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { openWebLink } from '@/utils/browser';

// Component hỗ trợ render các mục có gạch đầu dòng với UI căn lề thẳng tắp
const BulletPoint = ({ title, text }: { title?: string; text: string }) => (
  <View className="flex-row mb-2.5">
    <Text className="text-sm text-gray-600 leading-6 mr-2 mt-[1px]">●</Text>
    <Text className="text-sm text-gray-600 leading-6 flex-1 text-justify">
      {title && <Text className="font-semibold text-gray-800">{title}: </Text>}
      {text}
    </Text>
  </View>
);

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleOpenWebTerms = () => {
    // Bạn có thể thay đổi link Notion này thành link Terms of Service thực tế của bạn
    openWebLink('https://elfin-pajama-4bb.notion.site/I-U-KHO-N-D-CH-V-PAWLIFE-36c6c8475df6802d9157e559e3eb422c?pvs=73');
  };
  
  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
            <Feather name="chevron-left" size={28} color="#000000" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            <Text className="text-[24px] font-bold text-black">{t("Terms of Service")}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100">
                <Text className="text-[13px] font-medium text-gray-500 mb-4 italic">
                    {t("Last updated: May 2025")}
                </Text>

                <Text className="text-sm text-gray-600 leading-6 mb-6 text-justify">
                    {t("Please read these terms carefully before using the PawLife app. By creating an account or using PawLife, you agree to be bound by the terms below.")}
                </Text>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("1. INTRODUCTION")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">
                        {t("PawLife (\"We\", \"App\") is a pet management and community connection platform for pet lovers in Vietnam, provided completely free of charge for social purposes. These terms govern the relationship between PawLife and users (\"You\") when using the app.")}
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("2. TERMS OF USE")}</Text>
                    <BulletPoint text={t("You must be 13 years or older to create an account and use PawLife.")} />
                    <BulletPoint text={t("If you are under 18, consent from a parent or legal guardian is required.")} />
                    <BulletPoint text={t("You are responsible for keeping your login information secure and for all activities under your account.")} />
                    <BulletPoint text={t("Each user is only allowed to create one account. Creating multiple accounts to bypass rules or commit fraud is a violation of these terms.")} />
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("3. USER ACCOUNT")}</Text>
                    
                    <Text className="text-[15px] font-semibold text-gray-800 mb-2 mt-2">{t("3.1 Registration")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 mb-4 text-justify">{t("You commit to providing accurate, complete, and up-to-date information when registering. False information may result in account suspension or deletion.")}</Text>

                    <Text className="text-[15px] font-semibold text-gray-800 mb-2">{t("3.2 Account Security")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 mb-4 text-justify">{t("You are responsible for keeping your password secure and not sharing your account with others. PawLife is not liable for any loss arising from your disclosure of login information.")}</Text>

                    <Text className="text-[15px] font-semibold text-gray-800 mb-2">{t("3.3 Account Deletion")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">{t("You can delete your account at any time via Settings → Delete Account. Upon deletion, all personal data and pet profiles will be permanently deleted from the system within 30 days.")}</Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("4. COMMUNITY GUIDELINES")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 mb-2 text-justify">
                      {t("When using PawLife's community features (posting, commenting, sharing info, adoption, exchanging pets), you commit")} <Text className="font-bold text-red-500">{t("NOT")}</Text> {t("to:")}
                    </Text>
                    <BulletPoint text={t("Post false or misleading information about the health condition or origin of pets.")} />
                    <BulletPoint text={t("Use PawLife to buy or sell pets for commercial profit.")} />
                    <BulletPoint text={t("Post content that is violent, abusive, or harmful to animals.")} />
                    <BulletPoint text={t("Harass, threaten, or insult other users.")} />
                    <BulletPoint text={t("Post content that violates the copyright, trademark, or intellectual property rights of third parties.")} />
                    <BulletPoint text={t("Use bots, automated scripts, or any tools to manipulate content or interactions on the app.")} />
                    <BulletPoint text={t("Post other people's personal information without consent.")} />
                    <Text className="text-sm text-gray-600 leading-6 mt-2 text-justify italic">
                        {t("Violating the above rules may result in content deletion, account suspension, or permanent ban without prior notice.")}
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("5. ADOPTION & EXCHANGE FEATURES")}</Text>
                    
                    <Text className="text-[15px] font-semibold text-gray-800 mb-2 mt-2">{t("5.1 PawLife's Role")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 mb-4 text-justify">{t("PawLife acts only as a connecting platform between parties. We are NOT an intermediary, broker, or guarantor for any adoption transactions or agreements between users.")}</Text>

                    <Text className="text-[15px] font-semibold text-gray-800 mb-2">{t("5.2 User Responsibility")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 mb-4 text-justify">{t("The poster and adopter are fully responsible for the accuracy of information, the pet's actual health condition, and any agreements between parties. PawLife is not legally responsible for any disputes, losses, or damages arising from these transactions.")}</Text>

                    <Text className="text-[15px] font-semibold text-gray-800 mb-2">{t("5.3 Strictly Prohibited Sales")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">{t("Using the adoption feature to buy and sell pets for money is strictly prohibited. Any detected acts will result in post deletion and permanent account ban.")}</Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("6. PET MATCHING FEATURE")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">
                        {t("The matching feature on PawLife connects pets for companionship or responsible breeding. PawLife does not guarantee the outcome of any match. Users are solely responsible for all decisions regarding pet breeding.")}
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("7. LOST PET SEARCH & GPS")}</Text>
                    
                    <Text className="text-[15px] font-semibold text-gray-800 mb-2 mt-2">{t("7.1 Limitation of Liability")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 mb-4 text-justify">{t("The lost location notification feature depends on the finder actively scanning the QR code and allowing location sharing. PawLife does not guarantee that your pet will be found through the app.")}</Text>

                    <Text className="text-[15px] font-semibold text-gray-800 mb-2">{t("7.2 GPS Accuracy")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">{t("The GPS location sent is based on data from the scanner's device and may not be completely accurate due to technical limitations of GPS indoors or in weak signal areas.")}</Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("8. VIDEO CONTENT & CARE INFO")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">
                        {t("Videos and pet care instruction content on PawLife are aggregated from multiple sources for reference purposes. This is not professional medical advice from a veterinarian. For serious pet health issues, you should consult a qualified veterinarian.")}
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("9. PET MEDICAL RECORDS")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">
                        {t("Health and medical records stored on PawLife are entered and managed by users. PawLife does not verify the accuracy of this information. We are not responsible for any medical decisions made based on data stored in the app.")}
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("10. INTELLECTUAL PROPERTY")}</Text>
                    
                    <Text className="text-[15px] font-semibold text-gray-800 mb-2 mt-2">{t("10.1 PawLife's Rights")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 mb-4 text-justify">{t("The entire interface, design, logo, PawLife brand name, and app source code are our intellectual property, protected under Vietnamese law.")}</Text>

                    <Text className="text-[15px] font-semibold text-gray-800 mb-2">{t("10.2 User Content")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">{t("You retain ownership of the content you post on PawLife (pet photos, posts, comments). However, by posting content, you grant PawLife the right to use, display, and distribute that content within the scope of the app's operations.")}</Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("11. LIMITATION OF LIABILITY")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 mb-2 text-justify">{t("To the maximum extent permitted by law, PawLife is not liable for:")}</Text>
                    <BulletPoint text={t("Loss or damage arising from the use or inability to use the app.")} />
                    <BulletPoint text={t("Content posted by other users.")} />
                    <BulletPoint text={t("Outcomes of adoption, exchange, or pet matching agreements between users.")} />
                    <BulletPoint text={t("Service interruption due to maintenance, technical errors, or causes beyond our control.")} />
                    <BulletPoint text={t("Damages resulting from a pet not being found despite using the lost report feature.")} />
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("12. TERMINATION OF SERVICE")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">
                        {t("PawLife reserves the right to suspend or terminate your account if you violate these terms. We also reserve the right to discontinue the service at any time with at least 30 days' notice, except in cases of force majeure.")}
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("13. CHANGES TO TERMS")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">
                        {t("We may update these terms from time to time. When significant changes are made, we will notify you via email or in-app notification. Continued use of PawLife after the effective date means you accept the new terms.")}
                    </Text>
                </View>

                <View className="mb-4">
                    <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("14. GOVERNING LAW")}</Text>
                    <Text className="text-sm text-gray-600 leading-6 text-justify">
                        {t("These terms are governed by the laws of the Socialist Republic of Vietnam. Any arising disputes will be resolved at a competent court in Vietnam.")}
                    </Text>
                </View>
                
                <TouchableOpacity 
                    onPress={handleOpenWebTerms}
                    activeOpacity={0.8}
                    className="w-full mt-6 bg-[#E89B5A] py-[16px] rounded-[16px] shadow-sm items-center flex-row justify-center"
                >
                    <Feather name="file-text" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-[16px]">{t("Web Terms of Service")}</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}