import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
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

// Dữ liệu FAQ theo yêu cầu
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
  const [activeCategory, setActiveCategory] = useState('General');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredData = useMemo(() => {
    const currentData = FAQ_DATA[activeCategory as keyof typeof FAQ_DATA];
    if (!searchQuery.trim()) return currentData;
    
    return currentData.filter(item => 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeCategory, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9E9E9E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQ..."
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.chipsContainer}
          contentContainerStyle={styles.chipsContent}
        >
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => {
                  setActiveCategory(category);
                  setExpandedId(null); // Reset accordion when changing tabs
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FAQ List */}
        <View style={styles.faqListContainer}>
          {filteredData.length > 0 ? (
            filteredData.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <View key={item.id} style={styles.faqItemContainer}>
                  <TouchableOpacity 
                    style={styles.faqQuestionRow} 
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#4A4A4A" 
                    />
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.faqAnswerContainer}>
                      <Text style={styles.faqAnswerText}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    height: '100%',
  },
  chipsContainer: {
    marginBottom: 20,
  },
  chipsContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#4A4A4A',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  faqListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  faqItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    paddingRight: 16,
    lineHeight: 22,
  },
  faqAnswerContainer: {
    paddingBottom: 18,
    paddingRight: 20,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#9E9E9E',
    marginTop: 40,
    fontSize: 15,
  }
});