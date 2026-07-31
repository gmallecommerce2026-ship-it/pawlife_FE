// app/privacy-policy.tsx
import { AntDesign, Feather } from '@expo/vector-icons';
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

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleOpenWebPolicy = () => {
    openWebLink('https://elfin-pajama-4bb.notion.site/CH-NH-S-CH-B-O-M-T-PAWLIFE-36c6c8475df680fa8064e7ebf82d0933?pvs=73');
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
            <Text className="text-[24px] font-bold text-black">{t("Privacy Policy")}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100">
            <Text className="text-[13px] font-medium text-gray-500 mb-4 italic">
              {t("Last updated: December 2025")}
            </Text>

            <Text className="text-sm text-gray-600 leading-6 mb-6 text-justify">
              {t("PawLife (\"We\") is committed to protecting your privacy. This privacy policy explains how we collect, use, store, and protect your personal information when you use the PawLife app.")}
            </Text>

            <View className="mb-6">
              <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("1. INFORMATION WE COLLECT")}</Text>

              <Text className="text-[15px] font-semibold text-gray-800 mb-2 mt-2">{t("1.1 Information you provide directly")}</Text>
              <BulletPoint title={t("Account information")} text={t("full name, email address, phone number, password (encrypted).")} />
              <BulletPoint title={t("Pet profile")} text={t("name, breed, age, gender, photos, vaccination history, medical records, and health notes.")} />
              <BulletPoint title={t("User content")} text={t("community posts, comments, and pet exchanges.")} />
              <BulletPoint
                title={t("Adoption application information")}
                text={t("when you submit an adoption application, we collect your full name, phone number, Zalo/WhatsApp number, the address where the pet will be kept, housing type, whether children live in your household, employment status, previous pet-raising experience, adoption reason, and care commitments (vaccination, medical costs, home visits, etc.). This information is used by shelters to review and contact you.")}
              />
              <BulletPoint
                title={t("Identity verification")}
                text={t("in some cases you may be asked to confirm your willingness to provide ID (CCCD/CMND) details to verify your identity before a pet is handed over. If collected, ID information is used solely for verification, never displayed publicly, and is not retained longer than necessary for the handover process.")}
              />

              <Text className="text-[15px] font-semibold text-gray-800 mb-2 mt-4">{t("1.2 Information collected automatically")}</Text>
              <BulletPoint title={t("Location data (GPS)")} text={t("only collected when you activate the 'Lost Pet' feature, when using the swipe feature to adopt a pet, or when someone scans your pet's collar QR tag and confirms sending a notification. Background location is not collected when the app is inactive, unless you grant 'Always' permission and enable automatic tracking.")} />
              <BulletPoint title={t("Camera data")} text={t("only used to scan QR codes on pet ID tags. Images from the camera are not stored on our servers without your explicit consent.")} />
              <BulletPoint title={t("Photo library")} text={t("only accessed when you actively select a photo to update a pet profile or save a QR code. Your entire library is not read automatically.")} />
              <BulletPoint title={t("Device data")} text={t("device type, iOS version, push notification tokens, crash logs (anonymized).")} />
              <BulletPoint text={t("Connect the pet-loving community, supporting free exchange and adoption features.")} />
              <BulletPoint text={t("Review adoption applications and contact you about their status via phone/Zalo/WhatsApp.")} />
              <BulletPoint text={t("Improve app quality through anonymized data analysis.")} />
            </View>

            <View className="mb-6">
              <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("2. HOW WE USE YOUR INFORMATION")}</Text>
              <Text className="text-sm text-gray-600 leading-6 mb-2">{t("We use the collected information to:")}</Text>
              <BulletPoint text={t("Create and manage user accounts.")} />
              <BulletPoint text={t("Store and display your pet profiles.")} />
              <BulletPoint text={t("Send location notifications when your pet is reported lost.")} />
              <BulletPoint text={t("Connect the pet-loving community, supporting free exchange and adoption features.")} />
              <BulletPoint text={t("Improve app quality through anonymized data analysis.")} />
              <BulletPoint text={t("Send event notifications and pet-related updates (if you allow).")} />
              <BulletPoint text={t("Comply with legal requirements when necessary.")} />
            </View>

            <View className="mb-6">
              <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("3. SHARING INFORMATION WITH THIRD PARTIES")}</Text>
              <Text className="text-sm text-gray-600 leading-6 mb-2 text-justify">
                {t("We")} <Text className="font-bold text-red-500">{t("DO NOT")}</Text> {t("sell your personal information. Information is only shared in the following cases:")}
              </Text>
              <BulletPoint title={t("With other users")} text={t("pet profile information is displayed publicly only when you create community posts or list a pet for adoption.")} />
              <BulletPoint title={t("With other users")} text={t("pet profile information is displayed publicly only when you create community posts or list a pet for adoption.")} />
              <BulletPoint
                title={t("With relevant shelters/owners")}
                text={t("information in your adoption application (name, phone number, address, and commitments) is shared with the shelter or owner who listed the pet, for the purpose of reviewing your application and arranging handover.")}
              />
              <BulletPoint title={t("With service providers")} text={t("Firebase (Google) for authentication and database, Apple Push Notification Service for push notifications.")} />
              <BulletPoint title={t("When required by law")} text={t("providing information per the order of competent authorities.")} />
            </View>

            <View className="mb-6">
              <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("4. DATA STORAGE AND SECURITY")}</Text>
              <BulletPoint text={t("Data is stored on secure servers with SSL/TLS encryption.")} />
              <BulletPoint text={t("Passwords are one-way encrypted (bcrypt), we cannot view your password.")} />
              <BulletPoint text={t("GPS location data is only stored temporarily during lost notification processing and is deleted after 30 days.")} />
              <BulletPoint text={t("Adoption application data is retained while your application is pending; you may withdraw your application at any time in 'My Applications', which closes and removes the associated data upon request.")} />
              <BulletPoint text={t("You can delete all your data using the 'Delete Account' feature in Settings.")} />
            </View>

            <View className="mb-6">
              <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("5. USER RIGHTS")}</Text>
              <Text className="text-sm text-gray-600 leading-6 mb-2">{t("You have the following rights regarding your personal data:")}</Text>
              <BulletPoint title={t("Right of access")} text={t("view all the data we store about you.")} />
              <BulletPoint title={t("Right to rectification")} text={t("update account information and pet profiles at any time.")} />
              <BulletPoint title={t("Right to erasure")} text={t("delete your account and all related data via Settings → Delete Account.")} />
              <BulletPoint title={t("Right to withdraw consent")} text={t("disable Camera, Location, Bluetooth, and Notification access at any time in OS Settings.")} />
              <BulletPoint title={t("Right to object")} text={t("send a complaint to hello@pawlife.vn if you believe your data is being misused.")} />
            </View>

            <View className="mb-6">
              <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("6. CHILDREN'S PRIVACY")}</Text>
              <Text className="text-sm text-gray-600 leading-6 text-justify">
                {t("PawLife is not directed at users under 13 years old and does not knowingly collect personal information from children. If we discover that we have collected data from a child under 13, we will delete that data immediately. If you are a parent and discover your child has registered an account, please contact")} <Text className="font-bold text-[#E89B5A]">hello@pawlife.vn</Text> {t("for assistance in deleting the account.")}
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-[17px] font-bold text-gray-900 mb-3">{t("7. CHANGES TO PRIVACY POLICY")}</Text>
              <Text className="text-sm text-gray-600 leading-6 text-justify">
                {t("We may update this policy from time to time. When material changes are made, we will notify you via your registered email or through an in-app notification. The last updated date is always displayed at the top of this page. Continued use of the app after the effective date means you agree to the new policy.")}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleOpenWebPolicy}
              activeOpacity={0.8}
              className="w-full mt-6 bg-[#E89B5A] py-[16px] rounded-[16px] shadow-sm items-center flex-row justify-center"
            >
              <AntDesign name="global" size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-[16px]">{t("PawLife Web Policy")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}