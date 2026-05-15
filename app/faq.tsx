import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Dữ liệu FAQ 
const FAQ_DATA = {
  General: [
    {
      id: 'g1',
      question: 'What is PetID?',
      answer: "PetID is a free pet identification and lost-pet recovery platform that uses QR codes and NFC tags to help reunite lost pets with their owners quickly and easily. The service is completely free - you only pay for the physical tag itself."
    },
    {
      id: 'g2',
      question: 'How does the QR code work?',
      answer: "Each pet gets a unique QR code tag. When scanned, it displays the pet's profile and owner contact information, making it easy for anyone who finds your pet to contact you."
    },
    {
      id: 'g3',
      question: 'Is my personal information secure?',
      answer: "Yes, we take data security seriously. Your personal information is encrypted and stored securely. You control what information is displayed when someone scans your pet's tag."
    }
  ],
  Account: [
    {
      id: 'a1',
      question: 'How do I create an account?',
      answer: 'Download the PetID app, tap "Sign Up", and follow the registration process. You\'ll need to provide your email address and create a secure password.'
    },
    {
      id: 'a2',
      question: 'Can I add multiple pets to one account?',
      answer: 'Yes! You can add as many pets as you want to a single account. Each pet will have their own unique profile and QR code.'
    },
    {
      id: 'a3',
      question: 'How do I reset my password?',
      answer: 'On the login screen, tap "Forgot Password" and follow the instructions. We\'ll send a password reset link to your registered email address.'
    }
  ],
  Services: [
    {
      id: 's1',
      question: 'Is PetID really free?',
      answer: 'Yes! PetID is a completely free service. You only need to purchase the physical QR code or NFC tag for your pet. All app features, pet profiles, lost pet alerts, and the recovery network are free to use.'
    },
    {
      id: 's2',
      question: 'What do I need to pay for?',
      answer: 'The only cost is the physical tag itself (QR code or NFC tag). Once you have the tag, all PetID services including pet profile management, lost pet alerts, and access to our finder network are completely free.'
    }
  ],
  Adoption: [
    {
      id: 'ad1',
      question: 'How do I apply for pet adoption?',
      answer: "Browse adoptable pets in the Adoption section of the app. When you find a pet you're interested in, you can apply for adoption at any shelter, as long as the shelter agrees. Each pet profile includes the shelter's contact information within PetID."
    },
    {
      id: 'ad2',
      question: 'Can I adopt from any shelter?',
      answer: 'Yes! You can apply to adopt from any shelter listed in PetID, provided the shelter approves your application. Each shelter sets their own adoption requirements and process.'
    },
    {
      id: 'ad3',
      question: 'How do I contact a shelter about adoption?',
      answer: 'All shelter contact information is provided directly in their PetID profile. You can view phone numbers, email addresses, and location details to reach out and begin the adoption process.'
    }
  ]
};

const CATEGORIES = ['General', 'Account', 'Services', 'Adoption'];

export default function FAQScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(Object.keys(FAQ_DATA)[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = Object.keys(FAQ_DATA);

  // Xử lý hiệu ứng mở rộng mượt mà
  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  // Lọc dữ liệu FAQ theo Tab và từ khóa tìm kiếm
  const filteredFaqs = useMemo(() => {
    let currentFaqs = FAQ_DATA[activeCategory as keyof typeof FAQ_DATA] || [];
    
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      return currentFaqs.filter(
        (faq) => faq.question.toLowerCase().includes(lowerQuery) || faq.answer.toLowerCase().includes(lowerQuery)
      );
    }
    return currentFaqs;
  }, [activeCategory, searchQuery]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      
      {/* --- HEADER --- */}
      <View className="flex-row items-center px-4 py-3 bg-white z-10 relative">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
          <Feather name="chevron-left" size={24} color="#000000" />
        </TouchableOpacity>
        <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
          <Text className="text-[24px] font-semibold text-black">FAQ</Text>
        </View>
      </View>

      {/* --- SEARCH BAR --- */}
      <View className="flex-row items-center bg-[#F8F8F8] mx-5 mt-2.5 mb-5 rounded-full px-4 h-12">
        <Feather name="search" size={20} color="#8E8E93" className="mr-2.5" />
        <TextInput
          className="flex-1 text-[15px] text-[#333333] h-full"
          placeholder="Search for answers..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* --- CATEGORY CHIPS --- */}
      <View className="mb-5">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-2.5" // Dùng contentContainerClassName thay vì truyền vào style
        >
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <TouchableOpacity
                key={category}
                activeOpacity={0.7}
                onPress={() => {
                  setActiveCategory(category);
                  setExpandedId(null); // Reset mục đang mở khi chuyển tab
                }}
                className={`px-5 py-2.5 rounded-[20px] justify-center items-center ${
                  isActive ? 'bg-[#E89B5A]' : 'bg-[#F5F5F5]'
                }`}
              >
                <Text
                  className={`text-[14px] font-medium ${
                    isActive ? 'text-white' : 'text-[#666666]'
                  }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* --- FAQ LIST --- */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        {filteredFaqs.map((faq) => {
          const isExpanded = expandedId === faq.id;
          return (
            <TouchableOpacity
              key={faq.id}
              activeOpacity={0.7}
              onPress={() => toggleExpand(faq.id)}
              className="border-b border-[#F0F0F0] py-4"
            >
              <View className="flex-row justify-between items-center">
                <Text className="flex-1 text-[16px] font-medium text-[#333333] pr-4">
                  {faq.question}
                </Text>
                <Feather
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#666666"
                />
              </View>
              
              {/* Nội dung câu trả lời sẽ mở ra khi tap vào */}
              {isExpanded && (
                <View className="mt-3 pr-6">
                  <Text className="text-[14px] leading-[22px] text-[#666666]">
                    {faq.answer}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {filteredFaqs.length === 0 && (
          <View className="items-center justify-center py-10">
            <Text className="text-gray-400 text-[14px]">No answers found matching your search.</Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}