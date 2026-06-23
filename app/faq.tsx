import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
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
      questionVi: 'PawLife là gì?',
      questionEn: 'What is PawLife?',
      answerVi: 'PawLife là nơi mỗi thú cưng có một hồ sơ riêng — được ghi lại, gìn giữ và đồng hành suốt đời.\nKhông chỉ để quản lý, mà để mỗi hành trình đều có ý nghĩa.',
      answerEn: 'PawLife is a place where every pet has their own profile — recorded, preserved, and carried with them for life.\nNot just for record-keeping, but so every journey has meaning.'
    },
    {
      id: 'g2',
      questionVi: 'PawHistory | Hành Trình là gì?',
      questionEn: 'What is PawHistory | Journey?',
      answerVi: 'PawHistory | Hành Trình là câu chuyện của mỗi bé — từ những cột mốc trong cuộc đời (ngày sinh, nhận nuôi, đổi chủ) đến những lần tiêm phòng, khám sức khoẻ, kiểm tra răng miệng định kì.\nMỗi dữ liệu đều được lưu lại để không điều gì bị lãng quên.',
      answerEn: "PawHistory | Journey is each pet's story — from life milestones (birth, adoption, change of ownership) to vaccinations, health check-ups, and regular dental check-ups.\nEvery record is kept so nothing is ever forgotten."
    },
    {
      id: 'g3',
      questionVi: 'Thông tin trên PawLife có đáng tin không?',
      questionEn: 'Can the information on PawLife be trusted?',
      answerVi: 'PawLife được xây dựng trên sự minh bạch và yêu thương vì các bé.\nNhững thông tin quan trọng đều được ghi nhận rõ ràng — để bạn có thể tin, và yên tâm.',
      answerEn: 'PawLife is built on transparency and love for pets.\nAll important information is clearly recorded — so you can trust it, and feel at ease.'
    },
    {
      id: 'g4',
      questionVi: 'QR tag dùng để làm gì?',
      questionEn: 'What is the QR tag for?',
      answerVi: 'Đó là cách để một bé luôn có thể "tìm đường về nhà".\nChỉ cần quét, người khác có thể biết bé là ai — và thuộc về ai.',
      answerEn: 'It\'s a way for a pet to always find their way back home.\nWith just a scan, anyone can know who they are — and who they belong to.'
    },
    {
      id: 'g5',
      questionVi: 'Nếu tôi thấy thông tin chưa đúng?',
      questionEn: 'What if I notice incorrect information?',
      answerVi: 'Bạn có thể báo cái lại cho PawLife qua email hello@pawlife.vn.\nVì mỗi chi tiết đều quan trọng với một cuộc đời nhỏ.',
      answerEn: 'You can report it to PawLife via email at hello@pawlife.vn.\nBecause every detail matters to a little life.'
    },
    {
      id: 'g6',
      questionVi: 'Tôi có thể thay đổi thông tin thú cưng không?',
      questionEn: "Can I change my pet's information?",
      answerVi: 'Bạn có thể thay đổi một số thông tin thú cưng, nhưng để đảm bảo tính minh bạch và tránh giả mạo/tráo đổi thú cưng, PawLife có một số giới hạn:\n\n• Tên thú cưng: có thể đổi mỗi 14 ngày / lần\n• Giống, loài, ngày sinh, giới tính: sẽ bị khóa sau 7 ngày kể từ khi tạo hồ sơ\n\nTrường hợp nhận nuôi (Pawdoption): bạn có thể đổi tên không giới hạn trong 30 ngày đầu. Sau 30 ngày, sẽ áp dụng lại quy định 14 ngày / lần.\n\nCác giới hạn này giúp đảm bảo thông tin của mỗi bé luôn chính xác và đáng tin cậy.',
      answerEn: "You can change some of your pet's information, but to ensure transparency and prevent impersonation or pet-swapping, PawLife applies a few limits:\n\n• Pet name: can be changed once every 14 days\n• Breed, species, date of birth, gender: locked 7 days after the profile is created\n\nFor adoption cases (Pawdoption): you can rename the pet as many times as you like within the first 30 days. After 30 days, the standard 14-day limit applies again.\n\nThese limits help ensure that every pet's information stays accurate and trustworthy."
    }
  ],
  Account: [
    {
      id: 'a1',
      questionVi: 'Tôi có thể cập nhật thông tin của mình không?',
      questionEn: 'Can I update my information?',
      answerVi: 'Có. Vì cuộc sống thay đổi — và PawLife đi cùng bạn theo những thay đổi đó.',
      answerEn: 'Yes. Because life changes — and PawLife grows with you through those changes.'
    },
    {
      id: 'a2',
      questionVi: 'Tôi có thể quản lý nhiều thú cưng không?',
      questionEn: 'Can I manage multiple pets?',
      answerVi: 'Có. Vì tình yêu không chỉ dành cho một.',
      answerEn: "Yes. Because love isn't reserved for just one."
    },
    {
      id: 'a3',
      questionVi: 'Tôi có thể thay đổi tên thú cưng không?',
      questionEn: "Can I change my pet's name?",
      answerVi: 'Tên của một bé gắn liền với toàn bộ hồ sơ trong PawLife, vì vậy không thể thay đổi tuỳ ý. Trong một số trường hợp đặc biệt (như vừa nhận nuôi), bạn sẽ có một khoảng thời gian ngắn để đặt lại tên cho bé. Sau đó, tên sẽ được giữ ổn định để đảm bảo lịch sử của bé luôn nhất quán.',
      answerEn: "A pet's name is tied to their entire profile in PawLife, so it can't be changed freely. In certain special cases (such as right after adoption), you'll have a short window of time to rename them. After that, the name stays fixed to keep their history consistent."
    },
    {
      id: 'a4',
      questionVi: 'Thông tin của tôi có được bảo mật không?',
      questionEn: 'Is my information kept secure?',
      answerVi: 'Thông tin của bạn chỉ được sử dụng khi thật sự cần thiết và được sự cho phép của bạn. Và luôn được giữ một cách tôn trọng.',
      answerEn: 'Your information is only used when truly necessary and with your permission. And it is always handled with respect.'
    }
  ],
  Services: [
    {
      id: 's1',
      questionVi: 'PawLife có những gì?',
      questionEn: 'What does PawLife offer?',
      answerVi: 'Từ nhận nuôi, lưu trữ hồ sơ, đến kết nối với các dịch vụ chăm sóc — mọi thứ đều xoay quanh việc giúp các bé có cuộc sống tốt hơn.',
      answerEn: "From adoption, profile record-keeping, to connecting with care services — everything revolves around helping pets live better lives."
    },
    {
      id: 's2',
      questionVi: 'PawHistory | Hành trình được lưu như thế nào?',
      questionEn: 'How is PawHistory | Journey recorded?',
      answerVi: 'Mỗi dữ liệu được ghi lại như một dòng thời gian — không chỉnh sửa, không xoá bỏ — chỉ thêm vào, như cách một cuộc đời diễn ra.',
      answerEn: 'Every record is kept like a timeline — never edited, never deleted — only added to, the way a life unfolds.'
    },
    {
      id: 's3',
      questionVi: 'PawLife có thu phí không?',
      questionEn: 'Does PawLife charge any fees?',
      answerVi: 'Phần lớn tính năng trên PawLife là miễn phí.\n\nThẻ QR đã kích hoạt có thể sử dụng để lưu trữ PawHistory | Hành Trình và chế độ thất lạc khi cần thiết — vì đây là cách giúp người khác quét và liên hệ với bạn khi tìm thấy bé.\n\nNếu chưa thực sự cần, bạn vẫn có thể sử dụng PawLife bình thường mà không tốn chi phí.',
      answerEn: "Most features on PawLife are free.\n\nAn activated QR tag can be used to store PawHistory | Journey and enable Lost Mode when needed — this is how others can scan and contact you if they find your pet.\n\nIf you don't need it right away, you can still use PawLife normally at no cost."
    },
    {
      id: 's4',
      questionVi: 'Ai có thể cập nhật PawHistory | Hành trình?',
      questionEn: 'Who can update PawHistory | Journey?',
      answerVi: 'Những người thực sự liên quan đến bé — chủ nuôi, trạm cứu hộ, hoặc đối tác. Nhưng một khi đã ghi lại, sẽ không ai có thể thay đổi nó.',
      answerEn: "People who are truly connected to the pet — owners, shelters, or partners. But once a record is made, no one can change it."
    },
    {
      id: 's5',
      questionVi: 'QR tag có thể đổi sang bé khác không?',
      questionEn: 'Can a QR tag be transferred to another pet?',
      answerVi: 'Không. Mỗi chiếc tag là dành riêng cho một bé — như một danh tính không thể thay thế, vì thế PawLife khuyến khích không đổi QR tag để tránh các trường hợp đáng tiếc xảy ra.',
      answerEn: "No. Each tag belongs to one pet only — like an identity that can't be replaced, which is why PawLife recommends never swapping a QR tag, to avoid any unfortunate situations."
    },
    {
      id: 's6',
      questionVi: 'Nếu thú cưng bị lạc thì sao?',
      questionEn: 'What if my pet gets lost?',
      answerVi: 'Bạn có thể kích hoạt chế độ thất lạc (Lost Mode) ngay trên app PawLife. Khi Lost Mode được bật: Thông tin liên hệ và trạng thái "bé đang thất lạc" sẽ được hiển thị khi ai đó quét thẻ QR của bé. Người tìm thấy có thể liên hệ trực tiếp với bạn hoặc chia sẻ vị trí của bé. Toàn bộ lịch sử quét và chia sẻ sẽ được lưu trên PawLife đến khi bé về đến nhà. Lưu ý: bạn cần có QR tag đã kích hoạt trước đó thì mới bật được Lost Mode. PawLife được thiết kế để khi có sự cố xảy ra, mọi người xung quanh đều có thể trở thành "người giúp tìm lại bé" một cách nhanh và minh bạch nhất.',
      answerEn: 'You can activate Lost Mode right in the PawLife app. When Lost Mode is on: contact information and a "currently lost" status will be shown when someone scans the pet\'s QR tag. Whoever finds them can contact you directly or share the pet\'s location. The entire scan and share history is kept on PawLife until the pet makes it home. Note: you need an already-activated QR tag to turn on Lost Mode. PawLife is designed so that when something goes wrong, anyone nearby can quickly and transparently become a "helper" in bringing the pet home.'
    },
    {
      id: 's7',
      questionVi: 'PawLife có kết nối với dịch vụ bên ngoài không?',
      questionEn: 'Does PawLife connect with external services?',
      answerVi: 'Có — và sẽ còn nhiều hơn nữa. Để việc chăm sóc mỗi bé không còn là hành trình của một mình bạn nữa đâu! Hãy đợi PawLife thêm xíu nữa nha!',
      answerEn: "Yes — and there will be even more to come. So that caring for your pet is no longer a journey you walk alone! Just wait a little longer for PawLife!"
    }
  ],
  Adoption: [
    {
      id: 'ad1',
      questionVi: 'Cách để nhận nuôi thú cưng trên PawLife?',
      questionEn: 'How do I adopt a pet on PawLife?',
      answerVi: 'Bạn có thể xem các bé đang tìm nhà trong mục Nhận nuôi. Khi tìm thấy bé phù hợp, điền và nộp đơn đăng ký nhận nuôi để gửi yêu cầu đến trạm cứu hộ.\n\nMỗi đơn sẽ được gửi trực tiếp đến trạm phụ trách bé. PawLife không can thiệp vào quyết định, nhưng sẽ giúp bạn theo dõi trạng thái đơn một cách minh bạch.\n\nBạn có thể có tối đa 5 đơn đang hoạt động cùng lúc. Để đảm bảo công bằng, hệ thống cũng giới hạn số lần nộp đơn mỗi ngày.',
      answerEn: "You can browse pets looking for a home in the Adoption section. Once you find a pet that's a good fit, fill out and submit an adoption application to send your request to the shelter.\n\nEach application goes directly to the shelter responsible for that pet. PawLife doesn't interfere with the decision, but helps you track your application status transparently.\n\nYou can have up to 5 active applications at the same time. To keep things fair, the system also limits how many applications you can submit per day."
    },
    {
      id: 'ad2',
      questionVi: 'Tôi có thể nhận nuôi từ bất kỳ trạm cứu hộ nào không?',
      questionEn: 'Can I adopt from any shelter?',
      answerVi: 'Có — bạn có thể nộp đơn tới bất kỳ trạm nào có đăng bé trên PawLife. Tuy nhiên, mỗi trạm sẽ có tiêu chí riêng (môi trường sống, kinh nghiệm nuôi, khu vực, v.v.). Việc duyệt đơn hoàn toàn do trạm quyết định để đảm bảo phù hợp lâu dài cho bé.',
      answerEn: 'Yes — you can apply to any shelter that has pets listed on PawLife. However, each shelter has its own criteria (living environment, pet-care experience, location, etc.). Approval is entirely up to the shelter, to ensure a good long-term fit for the pet.'
    },
    {
      id: 'ad3',
      questionVi: 'Làm thế nào để liên hệ với trạm cứu hộ về việc nhận nuôi?',
      questionEn: 'How do I contact a shelter about adoption?',
      answerVi: 'Trong mỗi hồ sơ thú cưng, bạn sẽ thấy thông tin liên hệ của trạm cứu hộ. Bạn có thể:\n\n• Trao đổi trực tiếp với trạm để hỏi thêm về bé\n• Hoặc chờ phản hồi từ đơn đã nộp trong ứng dụng\n\nPawLife khuyến khích giữ trao đổi rõ ràng, tôn trọng và minh bạch để quá trình nhận nuôi diễn ra suôn sẻ cho cả hai bên.',
      answerEn: "In every pet profile, you'll find the shelter's contact information. You can:\n\n• Reach out directly to the shelter to ask more about the pet\n• Or wait for a response on the application you submitted in the app\n\nPawLife encourages keeping communication clear, respectful, and transparent so the adoption process goes smoothly for everyone involved."
    },
    {
      id: 'ad4',
      questionVi: 'Đơn của tôi sẽ được xử lý trong bao lâu?',
      questionEn: 'How long will my application take to process?',
      answerVi: 'Thời gian phản hồi phụ thuộc vào từng trạm. Nếu sau 7–10 ngày chưa có phản hồi, đơn có thể tự động đóng để bạn tiếp tục tìm cơ hội phù hợp khác.',
      answerEn: "Response time depends on each shelter. If there's no response after 7–10 days, the application may automatically close so you can continue looking for other suitable opportunities."
    },
    {
      id: 'ad5',
      questionVi: 'Tôi có thể hủy đơn đã nộp không?',
      questionEn: 'Can I cancel an application I already submitted?',
      answerVi: 'Bạn có thể rút đơn bất kỳ lúc nào. Sau khi rút đơn, bạn sẽ cần chờ một khoảng thời gian ngắn trước khi nộp lại, để tránh spam và đảm bảo trải nghiệm công bằng cho tất cả mọi người.',
      answerEn: "You can withdraw your application at any time. After withdrawing, you'll need to wait a short period before reapplying, to prevent spam and keep the experience fair for everyone."
    },
    {
      id: 'ad6',
      questionVi: 'Sau khi được duyệt, tôi cần làm gì?',
      questionEn: 'What do I need to do after my application is approved?',
      answerVi: 'Khi đơn được chấp nhận, trạm cứu hộ sẽ hướng dẫn bạn các bước tiếp theo (gặp mặt, ký cam kết, bàn giao). Sau khi hoàn tất nhận nuôi, bé sẽ được cập nhật trạng thái trong PawLife và hồ sơ sẽ được lưu lại đầy đủ trong PawHistory.',
      answerEn: 'Once your application is accepted, the shelter will guide you through the next steps (meeting the pet, signing a commitment, handover). After the adoption is completed, the pet\'s status will be updated in PawLife and their full profile will be recorded in PawHistory.'
    }
  ],
};

const CATEGORIES = ['General', 'Account', 'Services', 'Adoption'];

export default function FAQScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(Object.keys(FAQ_DATA)[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
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
        (faq) =>
          (isVi ? faq.questionVi : faq.questionEn).toLowerCase().includes(lowerQuery) ||
          (isVi ? faq.answerVi : faq.answerEn).toLowerCase().includes(lowerQuery)
      );
    }
    return currentFaqs;
  }, [activeCategory, searchQuery, isVi]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">

      {/* --- HEADER --- */}
      <View className="flex-row items-center px-4 py-3 bg-white z-10 relative">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
          <Feather name="chevron-left" size={24} color="#000000" />
        </TouchableOpacity>
        <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
          <Text className="text-[20px] font-semibold text-black">FAQ</Text>
        </View>
      </View>

      {/* --- SEARCH BAR --- */}
      <View className="flex-row items-center bg-[#F8F8F8] mx-5 mt-2.5 mb-5 rounded-full px-4 h-12">
        <Feather name="search" size={20} color="#8E8E93" className="mr-2.5" />
        <TextInput
          className="flex-1 text-[15px] text-[#333333] h-full"
          placeholder={isVi ? "Tìm kiếm câu trả lời..." : "Search for answers..."}
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
                className={`px-5 py-2.5 rounded-[20px] justify-center items-center ${isActive ? 'bg-[#E89B5A]' : 'bg-[#F5F5F5]'
                  }`}
              >
                <Text
                  className={`text-[14px] font-medium ${isActive ? 'text-white' : 'text-[#666666]'
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
                  {isVi ? faq.questionVi : faq.questionEn}
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
                    {isVi ? faq.answerVi : faq.answerEn}
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