// Detailed feeding/preparation guide content for every 'safe' ingredient.
// Each entry replaces the existing (short) `benefits.feeding` field with
// 3 more informative bullets: how to prepare, how much/how, and a tip.
// Run apply-feeding-guide.js to merge this into constants/ingredient.ts.

export const FEEDING_GUIDE_DETAILED: Record<string, { en: string[]; vi: string[] }> = {
  cooked_chicken_breast: {
    en: ['Boil or bake plain, no skin, bones, salt, or seasoning', 'Shred or cut into bite-sized pieces', 'Up to 10% of daily meal, mixed with regular food'],
    vi: ['Luộc hoặc nướng chín, bỏ da, xương, không muối/gia vị', 'Xé nhỏ hoặc cắt miếng vừa ăn', 'Tối đa 10% khẩu phần, trộn cùng thức ăn chính'],
  },
  cooked_turkey: {
    en: ['Roast or boil plain, remove skin and all bones', 'Cut into small cubes', 'Serve 2–3 times a week as a lean protein swap'],
    vi: ['Luộc hoặc nướng chín, bỏ da và toàn bộ xương', 'Cắt thành khối nhỏ', 'Dùng 2–3 lần/tuần thay thế nguồn protein'],
  },
  boiled_beef_lean: {
    en: ['Boil until fully cooked, skim off excess fat, no seasoning', 'Cut into small chunks', 'Limit to 1–2 times a week due to richness'],
    vi: ['Luộc chín kỹ, vớt bớt mỡ nổi, không nêm gia vị', 'Cắt thành miếng nhỏ', 'Chỉ nên cho ăn 1–2 lần/tuần vì khá giàu đạm'],
  },
  cooked_salmon: {
    en: ['Bake or steam thoroughly — never serve raw or smoked (parasite risk)', 'Remove all bones before serving', 'Once a week is plenty for the omega-3 benefit'],
    vi: ['Nướng hoặc hấp chín kỹ — không cho ăn sống/hun khói (nguy cơ ký sinh trùng)', 'Gỡ bỏ hết xương trước khi cho ăn', 'Cho ăn 1 lần/tuần là đủ để bổ sung omega-3'],
  },
  cooked_white_fish: {
    en: ['Steam or poach plain, no oil or salt', 'Debone carefully into small flakes', 'Good gentle option 1–2 times a week for sensitive stomachs'],
    vi: ['Hấp hoặc luộc chín, không dầu mỡ hay muối', 'Gỡ xương kỹ, xé thành miếng nhỏ', 'Lựa chọn nhẹ nhàng, cho ăn 1–2 lần/tuần với bụng nhạy cảm'],
  },
  cooked_egg: {
    en: ['Boil or scramble plain, no oil, butter, or salt', 'Chop or mash before serving', '1 whole egg, 2–3 times a week'],
    vi: ['Luộc hoặc chiên chín, không dầu/bơ/muối', 'Cắt nhỏ hoặc nghiền trước khi cho ăn', '1 quả/lần, 2–3 lần một tuần'],
  },
  carrot: {
    en: ['Wash and slice into thin coins or sticks', 'Can be served raw (crunchy) or lightly steamed', 'Great low-calorie treat or chew toy substitute'],
    vi: ['Rửa sạch, cắt lát mỏng hoặc que nhỏ', 'Có thể ăn sống (giòn) hoặc hấp sơ', 'Món ăn vặt ít calo, thay thế đồ gặm nhấm'],
  },
  pumpkin_cooked: {
    en: ['Steam or bake plain pumpkin flesh until soft', 'Mash and mix a spoonful into meals', 'Helpful for firming loose stool'],
    vi: ['Hấp hoặc nướng thịt bí đến khi mềm', 'Nghiền nhuyễn, trộn một thìa vào bữa ăn', 'Hỗ trợ làm săn phân khi bị tiêu chảy nhẹ'],
  },
  sweet_potato_cooked: {
    en: ['Boil or bake until soft, skip the skin if tough', 'Mash or cube into small pieces', 'A few tablespoons alongside the main meal'],
    vi: ['Luộc hoặc nướng đến khi mềm, bỏ vỏ nếu dai', 'Nghiền hoặc cắt hạt lựu nhỏ', 'Vài thìa canh kèm bữa ăn chính'],
  },
  white_rice_cooked: {
    en: ['Cook in plain water until soft, no salt or oil', 'Let cool before serving', 'Great bland-diet base during mild stomach upset'],
    vi: ['Nấu chín với nước, không muối/dầu mỡ', 'Để nguội trước khi cho ăn', 'Nền tảng tốt cho chế độ ăn nhạt khi bụng khó chịu'],
  },
  brown_rice_cooked: {
    en: ['Cook thoroughly (needs longer than white rice)', 'Cool and mix into the regular meal', 'A steady energy source a few times a week'],
    vi: ['Nấu chín kỹ (lâu hơn gạo trắng)', 'Để nguội, trộn vào bữa ăn thường ngày', 'Nguồn năng lượng ổn định, dùng vài lần/tuần'],
  },
  oatmeal_plain: {
    en: ['Cook with water (not milk), no sugar or flavoring', 'Let cool to room temperature', 'A gentle breakfast topper, especially for sensitive skin'],
    vi: ['Nấu với nước (không dùng sữa), không đường', 'Để nguội về nhiệt độ phòng', 'Món ăn sáng nhẹ nhàng, tốt cho da nhạy cảm'],
  },
  apple_no_seeds: {
    en: ['Wash, core, and remove all seeds (they contain cyanide compounds)', 'Cut into thin slices or small cubes', 'A crisp occasional snack, not a daily staple'],
    vi: ['Rửa sạch, bỏ lõi và toàn bộ hạt (chứa hợp chất xyanua)', 'Cắt lát mỏng hoặc hạt lựu nhỏ', 'Món ăn vặt giòn, không nên cho ăn hằng ngày'],
  },
  blueberries: {
    en: ['Rinse well, serve fresh or frozen (thawed)', 'Offer whole or lightly mashed for small mouths', 'A handful as a training treat'],
    vi: ['Rửa sạch, dùng tươi hoặc đông lạnh (rã đông)', 'Cho ăn nguyên quả hoặc nghiền nhẹ cho thú nhỏ', 'Một nắm nhỏ làm phần thưởng huấn luyện'],
  },
  banana: {
    en: ['Peel and slice into small rounds', 'Mash for smaller pets or picky eaters', 'Small portion — high in natural sugar'],
    vi: ['Bóc vỏ, cắt lát nhỏ', 'Nghiền nhuyễn cho thú nhỏ hoặc kén ăn', 'Cho ăn lượng nhỏ vì khá nhiều đường tự nhiên'],
  },
  watermelon_no_seeds: {
    en: ['Remove rind and all seeds', 'Cube into bite-sized pieces', 'Good hot-weather hydration treat'],
    vi: ['Bỏ vỏ và toàn bộ hạt', 'Cắt miếng vừa ăn', 'Món giải khát tốt vào ngày nóng'],
  },
  cucumber: {
    en: ['Wash and peel if waxy, slice thin', 'Serve raw and chilled', 'Low-calorie, hydrating snack for weight-watching pets'],
    vi: ['Rửa sạch, gọt vỏ nếu có sáp, cắt lát mỏng', 'Cho ăn sống, để lạnh càng tốt', 'Món ăn ít calo, cấp nước cho thú cưng đang giảm cân'],
  },
  zucchini: {
    en: ['Wash and slice; serve raw or lightly steamed', 'No seasoning or oil', 'A light vegetable side a few times a week'],
    vi: ['Rửa sạch, cắt lát; ăn sống hoặc hấp sơ', 'Không thêm gia vị hay dầu mỡ', 'Món rau nhẹ, dùng vài lần/tuần'],
  },
  green_beans: {
    en: ['Trim ends, steam until just tender or serve raw', 'Cut into shorter pieces for small pets', 'Popular low-calorie filler for weight management'],
    vi: ['Cắt bỏ đầu, hấp vừa mềm hoặc ăn sống', 'Cắt khúc ngắn hơn cho thú nhỏ', 'Thường dùng làm món no bụng ít calo khi giảm cân'],
  },
  spinach_cooked: {
    en: ['Steam or blanch briefly, drain well', 'Chop finely and mix into food', 'Small amounts only — high in oxalates'],
    vi: ['Hấp hoặc trụng sơ, để ráo nước', 'Băm nhỏ, trộn vào thức ăn', 'Chỉ dùng lượng nhỏ vì chứa nhiều oxalat'],
  },
  broccoli_cooked: {
    en: ['Steam until tender, no oil or salt', 'Chop into small florets', 'Keep portions small — large amounts can cause gas'],
    vi: ['Hấp đến khi mềm, không dầu/muối', 'Cắt thành từng bông nhỏ', 'Cho ăn lượng ít vì dễ gây đầy hơi nếu ăn nhiều'],
  },
  kale_cooked: {
    en: ['Steam briefly to soften tough leaves', 'Chop finely before mixing in', 'Occasional topper, not a daily green'],
    vi: ['Hấp sơ để lá bớt dai', 'Băm nhỏ trước khi trộn vào thức ăn', 'Dùng thỉnh thoảng, không nên ăn hằng ngày'],
  },
  peas: {
    en: ['Use fresh or frozen (thawed), cook or serve raw', 'Mash for smaller pets', 'A handful mixed into the bowl'],
    vi: ['Dùng đậu tươi hoặc đông lạnh (rã đông), nấu chín hoặc ăn sống', 'Nghiền nhuyễn cho thú nhỏ', 'Một nắm nhỏ trộn vào bát ăn'],
  },
  cauliflower: {
    en: ['Steam until soft, no seasoning', 'Cut into small florets', 'Light vegetable option, serve occasionally'],
    vi: ['Hấp đến khi mềm, không nêm gia vị', 'Cắt thành bông nhỏ', 'Lựa chọn rau nhẹ, dùng thỉnh thoảng'],
  },
  plain_yogurt: {
    en: ['Choose plain, unsweetened, no xylitol', 'Start with one teaspoon to check tolerance', '1–2 tablespoons a few times a week'],
    vi: ['Chọn loại nguyên chất, không đường, không xylitol', 'Thử một thìa cà phê trước để kiểm tra dung nạp', '1–2 thìa canh, vài lần/tuần'],
  },
  cottage_cheese: {
    en: ['Choose plain, low-sodium cottage cheese', 'Serve a small spoonful mixed with food', 'Good occasional protein topper'],
    vi: ['Chọn loại phô mai tươi ít natri', 'Cho một thìa nhỏ trộn vào thức ăn', 'Món bổ sung protein tốt, dùng thỉnh thoảng'],
  },
  peanut_butter_xylitol_free: {
    en: ['Double-check the label for zero xylitol', 'Spread a thin layer or a small dollop', 'Great occasional treat or pill-hider'],
    vi: ['Kiểm tra kỹ nhãn để chắc chắn không có xylitol', 'Phết một lớp mỏng hoặc một chút nhỏ', 'Món thưởng ngon, hoặc dùng để giấu thuốc'],
  },
  coconut_fresh: {
    en: ['Use unsweetened fresh coconut, remove hard shell', 'Shred finely, serve tiny amounts', 'Rich in fat — treat only, not a regular food'],
    vi: ['Dùng dừa tươi không đường, bỏ vỏ cứng', 'Bào sợi nhỏ, cho ăn lượng rất ít', 'Nhiều chất béo — chỉ nên là món thưởng thỉnh thoảng'],
  },
  coconut_oil: {
    en: ['Melt slightly and drizzle over food', 'Start with a quarter teaspoon, increase slowly', 'Watch for loose stool if overdone'],
    vi: ['Làm tan chảy nhẹ rồi rưới lên thức ăn', 'Bắt đầu với 1/4 thìa cà phê, tăng dần', 'Theo dõi phân lỏng nếu dùng quá nhiều'],
  },
  olive_oil: {
    en: ['Drizzle a small amount directly onto food', 'No need to cook — add raw', 'A few drops to half a teaspoon depending on size'],
    vi: ['Rưới một lượng nhỏ trực tiếp lên thức ăn', 'Không cần nấu — thêm sống', 'Vài giọt đến nửa thìa cà phê tùy kích thước thú cưng'],
  },
  liver_cooked: {
    en: ['Boil or bake fully, no seasoning', 'Cut into small cubes', 'Small portion once a week — too much can cause vitamin A excess'],
    vi: ['Luộc hoặc nướng chín kỹ, không gia vị', 'Cắt thành khối nhỏ', 'Lượng nhỏ, 1 lần/tuần — ăn nhiều dễ dư thừa vitamin A'],
  },
  heart_cooked: {
    en: ['Boil or grill plain until fully cooked', 'Slice into small strips', 'A lean, nutrient-dense treat a couple times a week'],
    vi: ['Luộc hoặc nướng chín kỹ, không gia vị', 'Cắt thành dải nhỏ', 'Món ăn giàu dinh dưỡng, dùng vài lần/tuần'],
  },
  lamb_cooked_lean: {
    en: ['Boil or roast, trim off excess fat', 'Cut into small pieces', 'Good alternative protein for allergy-prone pets'],
    vi: ['Luộc hoặc nướng, lọc bớt mỡ thừa', 'Cắt miếng nhỏ', 'Nguồn protein thay thế tốt cho thú dễ dị ứng'],
  },
  duck_cooked: {
    en: ['Roast or boil, remove skin to cut fat', 'Cut into small pieces', 'Serve occasionally as protein variety'],
    vi: ['Nướng hoặc luộc, bỏ da để giảm béo', 'Cắt miếng nhỏ', 'Dùng thỉnh thoảng để đa dạng nguồn protein'],
  },
  pork_lean_cooked: {
    en: ['Cook thoroughly — never serve raw or undercooked', 'Trim visible fat, cut into small pieces', 'Occasional lean protein option'],
    vi: ['Nấu chín kỹ — tuyệt đối không ăn sống hoặc tái', 'Lọc bớt mỡ nhìn thấy, cắt miếng nhỏ', 'Lựa chọn protein nạc dùng thỉnh thoảng'],
  },
  quinoa_cooked: {
    en: ['Rinse well before cooking to remove bitterness', 'Cook fully in water, no seasoning', 'A protein-rich grain swap a few times a week'],
    vi: ['Vo kỹ trước khi nấu để loại bỏ vị đắng', 'Nấu chín với nước, không gia vị', 'Ngũ cốc giàu protein, thay thế vài lần/tuần'],
  },
  barley_cooked: {
    en: ['Cook until soft in plain water', 'Cool before mixing into meals', 'Good fiber boost for digestion'],
    vi: ['Nấu mềm với nước lọc', 'Để nguội trước khi trộn vào bữa ăn', 'Bổ sung chất xơ tốt cho tiêu hóa'],
  },
  millet_cooked: {
    en: ['Rinse and cook fully in water', 'Serve plain, cooled', 'Gluten-free grain option for sensitive pets'],
    vi: ['Vo sạch và nấu chín với nước', 'Cho ăn khi đã nguội, không gia vị', 'Lựa chọn ngũ cốc không gluten cho thú nhạy cảm'],
  },
  pear_no_seeds: {
    en: ['Wash, core, and remove all seeds', 'Cut into small slices', 'A juicy, fibrous occasional treat'],
    vi: ['Rửa sạch, bỏ lõi và toàn bộ hạt', 'Cắt thành lát nhỏ', 'Món ăn mọng nước, giàu chất xơ, dùng thỉnh thoảng'],
  },
  mango_no_seed: {
    en: ['Peel and remove the large pit completely', 'Cut flesh into small cubes', 'Small portion — quite sugary'],
    vi: ['Gọt vỏ và bỏ hoàn toàn hạt lớn', 'Cắt thịt quả thành khối nhỏ', 'Lượng nhỏ vì khá ngọt'],
  },
  strawberries: {
    en: ['Wash well, remove the green top', 'Slice or quarter for easy chewing', 'A sweet vitamin-C treat in moderation'],
    vi: ['Rửa sạch, bỏ phần cuống lá xanh', 'Cắt lát hoặc bổ tư cho dễ nhai', 'Món ăn ngọt giàu vitamin C, dùng vừa phải'],
  },
  raspberries: {
    en: ['Rinse gently, serve whole (they are small)', 'Fine for fresh or frozen (thawed)', 'A few berries as an antioxidant snack'],
    vi: ['Rửa nhẹ nhàng, cho ăn nguyên quả (quả nhỏ)', 'Dùng tươi hoặc đông lạnh (rã đông) đều được', 'Vài quả làm món ăn vặt chống oxy hóa'],
  },
  pineapple: {
    en: ['Peel and remove the tough core', 'Cut into small chunks', 'Small portion — natural enzymes can irritate in excess'],
    vi: ['Gọt vỏ, bỏ phần lõi cứng', 'Cắt thành miếng nhỏ', 'Lượng nhỏ vì enzyme tự nhiên có thể gây kích ứng nếu ăn nhiều'],
  },
  papaya: {
    en: ['Peel, deseed completely, cut into small pieces', 'Serve ripe and soft', 'Gentle fruit that can help digestion'],
    vi: ['Gọt vỏ, bỏ hết hạt, cắt miếng nhỏ', 'Chọn quả chín mềm', 'Trái cây dịu nhẹ, hỗ trợ tiêu hóa'],
  },
  honey_raw_small: {
    en: ['Use raw, unprocessed honey', 'Offer a tiny lick or mix a quarter teaspoon into food', 'Avoid in diabetic or overweight pets'],
    vi: ['Dùng mật ong nguyên chất, chưa qua chế biến', 'Cho liếm một chút hoặc trộn 1/4 thìa cà phê vào thức ăn', 'Tránh dùng cho thú bị tiểu đường hoặc thừa cân'],
  },
  bone_broth: {
    en: ['Simmer bones/meat in water only — no onion, garlic, or salt', 'Strain out solids, cool completely before serving', 'Pour over dry food or serve alone for hydration'],
    vi: ['Ninh xương/thịt chỉ với nước — không hành, tỏi, muối', 'Lọc bỏ cặn, để nguội hoàn toàn trước khi cho ăn', 'Rưới lên thức ăn khô hoặc cho ăn riêng để bổ sung nước'],
  },
  sardines_cooked: {
    en: ['Choose plain, boneless, packed in water (not oil/salt)', 'Mash slightly before serving', 'A couple of small sardines, 1–2 times a week'],
    vi: ['Chọn loại không xương, đóng hộp trong nước lọc (không dầu/muối)', 'Nghiền nhẹ trước khi cho ăn', 'Vài con nhỏ, 1–2 lần/tuần'],
  },
  tuna_cooked: {
    en: ['Cook plain or use tuna packed in water, drained', 'Flake into small pieces', 'Occasional treat — limit due to mercury content'],
    vi: ['Nấu chín hoặc dùng cá ngừ đóng hộp trong nước, để ráo', 'Xé thành miếng nhỏ', 'Món thỉnh thoảng — hạn chế vì có thể chứa thủy ngân'],
  },
  shrimp_cooked: {
    en: ['Cook thoroughly, peel and de-vein', 'Chop into small pieces', 'A couple of shrimp as an occasional treat'],
    vi: ['Nấu chín kỹ, bóc vỏ và bỏ chỉ đen', 'Cắt thành miếng nhỏ', 'Vài con làm món thưởng thỉnh thoảng'],
  },
  crab_meat: {
    en: ['Cook thoroughly, remove all shell fragments', 'Shred into small pieces', 'Occasional seafood treat, watch for allergies'],
    vi: ['Nấu chín kỹ, gỡ bỏ hết mảnh vỏ', 'Xé thành sợi nhỏ', 'Món hải sản thỉnh thoảng, chú ý dấu hiệu dị ứng'],
  },
  tofu_plain: {
    en: ['Use plain, unseasoned tofu', 'Cut into small cubes, can serve raw or lightly cooked', 'Good plant protein option a few times a week'],
    vi: ['Dùng đậu phụ nguyên chất, không gia vị', 'Cắt khối nhỏ, ăn sống hoặc nấu sơ đều được', 'Nguồn protein thực vật tốt, dùng vài lần/tuần'],
  },
  edamame_cooked: {
    en: ['Boil until tender, shell completely (no pods)', 'Serve beans only, unsalted', 'Small handful as a protein-rich snack'],
    vi: ['Luộc mềm, bóc bỏ hoàn toàn vỏ', 'Chỉ cho ăn phần hạt, không muối', 'Một nắm nhỏ làm món ăn giàu protein'],
  },
  parsley: {
    en: ['Use flat or curly parsley, wash well', 'Chop finely, sprinkle a pinch over food', 'Best as a garnish, not a main ingredient'],
    vi: ['Dùng rau mùi tây lá phẳng hoặc xoăn, rửa sạch', 'Băm nhỏ, rắc một chút lên thức ăn', 'Dùng để trang trí, không phải nguyên liệu chính'],
  },
  basil: {
    en: ['Use fresh leaves, washed and finely chopped', 'Sprinkle a small pinch into meals', 'Occasional herb boost, not daily'],
    vi: ['Dùng lá tươi, rửa sạch và băm nhỏ', 'Rắc một ít vào bữa ăn', 'Bổ sung thảo mộc thỉnh thoảng, không dùng hằng ngày'],
  },
  mint_small: {
    en: ['Use fresh mint leaves, finely chopped', 'A tiny sprinkle for breath freshness', 'Occasional use only'],
    vi: ['Dùng lá bạc hà tươi, băm nhỏ', 'Rắc một chút để hơi thở thơm mát', 'Chỉ dùng thỉnh thoảng'],
  },
  ginger_tiny: {
    en: ['Peel and grate finely', 'Use a pinch mixed into food, especially for mild nausea', 'Not for pets on certain medications — check with a vet'],
    vi: ['Gọt vỏ và bào nhuyễn', 'Dùng một chút trộn vào thức ăn, đặc biệt khi buồn nôn nhẹ', 'Không dùng nếu thú đang uống một số loại thuốc — hỏi bác sĩ thú y'],
  },
  turmeric_small: {
    en: ['Use a small pinch of ground turmeric', 'Mix well into food (bitter alone)', 'Pair with a little healthy fat for better absorption'],
    vi: ['Dùng một chút bột nghệ', 'Trộn kỹ vào thức ăn (vị đắng nếu ăn riêng)', 'Kết hợp với chút chất béo lành mạnh để hấp thu tốt hơn'],
  },
  pumpkin_seeds: {
    en: ['Roast plain (no salt/oil) and grind or crush', 'Sprinkle a small amount over food', 'Good occasional fiber and mineral boost'],
    vi: ['Rang chín (không muối/dầu) rồi xay hoặc giã nhỏ', 'Rắc một lượng nhỏ lên thức ăn', 'Bổ sung chất xơ và khoáng chất tốt, dùng thỉnh thoảng'],
  },
  sunflower_seeds: {
    en: ['Choose unsalted, shelled seeds', 'Crush or grind before serving', 'A small sprinkle a couple times a week'],
    vi: ['Chọn hạt đã bóc vỏ, không muối', 'Giã hoặc xay nhỏ trước khi cho ăn', 'Rắc một ít, vài lần/tuần'],
  },
  flaxseed: {
    en: ['Grind fresh — whole seeds pass through undigested', 'Sprinkle a small amount over meals', 'Store ground flax in the fridge to keep it fresh'],
    vi: ['Xay ngay trước khi dùng — hạt nguyên khó tiêu hóa', 'Rắc một lượng nhỏ lên thức ăn', 'Bảo quản hạt đã xay trong tủ lạnh để giữ độ tươi'],
  },
  chia_seeds_soaked: {
    en: ['Soak in water until gel-like before serving (never dry)', 'Mix a small spoonful into food', 'Great for adding hydration and fiber'],
    vi: ['Ngâm nước cho đến khi sệt lại trước khi cho ăn (không dùng khô)', 'Trộn một thìa nhỏ vào thức ăn', 'Tốt để bổ sung nước và chất xơ'],
  },
  apple_sauce_no_sugar: {
    en: ['Choose unsweetened, no added sugar or cinnamon blends with xylitol', 'Serve a small spoonful plain', 'Gentle option for pets who can\'t chew whole fruit'],
    vi: ['Chọn loại không đường, không pha thêm hỗn hợp có xylitol', 'Cho ăn một thìa nhỏ, nguyên chất', 'Lựa chọn dịu nhẹ cho thú không nhai được trái cây nguyên miếng'],
  },
  baby_spinach: {
    en: ['Wash thoroughly, serve raw or lightly wilted', 'Chop finely for easy digestion', 'Small amounts only — same oxalate caution as regular spinach'],
    vi: ['Rửa sạch, ăn sống hoặc chần sơ', 'Băm nhỏ để dễ tiêu hóa', 'Chỉ dùng lượng nhỏ — vẫn cần lưu ý oxalat như rau bina thường'],
  },
  romaine_lettuce: {
    en: ['Wash well, chop into small strips', 'Serve raw, crisp and cold', 'Good low-calorie filler for hot days'],
    vi: ['Rửa sạch, cắt thành sợi nhỏ', 'Cho ăn sống, giòn và mát', 'Món no bụng ít calo tốt cho ngày nóng'],
  },
  asparagus_cooked: {
    en: ['Steam until tender, trim woody ends', 'Cut into small pieces to avoid choking', 'Occasional vegetable side'],
    vi: ['Hấp đến khi mềm, cắt bỏ phần gốc dai', 'Cắt miếng nhỏ để tránh nghẹn', 'Món rau phụ dùng thỉnh thoảng'],
  },
  celery: {
    en: ['Wash and cut into small sticks or slices, remove stringy fibers', 'Serve raw and crunchy', 'Low-calorie snack, good for dental chewing'],
    vi: ['Rửa sạch, cắt thành que hoặc lát nhỏ, tước bỏ xơ dai', 'Cho ăn sống, giòn', 'Món ăn ít calo, tốt để nhai làm sạch răng'],
  },
  bell_pepper: {
    en: ['Wash, remove seeds and stem', 'Cut into thin strips or small pieces', 'Red/yellow varieties are sweeter and well tolerated'],
    vi: ['Rửa sạch, bỏ hạt và cuống', 'Cắt thành lát mỏng hoặc miếng nhỏ', 'Loại đỏ/vàng ngọt hơn và dễ ăn hơn'],
  },
  butternut_squash: {
    en: ['Peel, deseed, and steam or bake until soft', 'Mash or cube into small pieces', 'Good fiber-rich alternative to pumpkin'],
    vi: ['Gọt vỏ, bỏ hạt, hấp hoặc nướng đến khi mềm', 'Nghiền hoặc cắt hạt lựu nhỏ', 'Lựa chọn giàu chất xơ thay thế bí đỏ'],
  },
  turnip_cooked: {
    en: ['Peel and boil or steam until soft', 'Mash or cut into small pieces', 'Mild root vegetable, serve occasionally'],
    vi: ['Gọt vỏ, luộc hoặc hấp đến khi mềm', 'Nghiền hoặc cắt miếng nhỏ', 'Rau củ vị nhẹ, dùng thỉnh thoảng'],
  },
  beet_cooked_small: {
    en: ['Boil or roast until soft, peel after cooking', 'Cut into small cubes, serve sparingly', 'Can tint urine/stool reddish — this is normal'],
    vi: ['Luộc hoặc nướng đến khi mềm, gọt vỏ sau khi nấu', 'Cắt hạt lựu nhỏ, cho ăn lượng ít', 'Có thể làm nước tiểu/phân hơi đỏ — đây là bình thường'],
  },
  apricot_no_pit: {
    en: ['Wash, cut in half and remove the pit completely', 'Slice flesh into small pieces', 'Sweet occasional treat, watch sugar intake'],
    vi: ['Rửa sạch, bổ đôi và bỏ hoàn toàn hạt', 'Cắt thịt quả thành miếng nhỏ', 'Món ngọt thỉnh thoảng, lưu ý lượng đường'],
  },
  peach_no_pit: {
    en: ['Wash, remove the pit entirely, peel if desired', 'Cut into small pieces', 'Juicy summer treat in small amounts'],
    vi: ['Rửa sạch, bỏ hoàn toàn hạt, gọt vỏ nếu muốn', 'Cắt thành miếng nhỏ', 'Món giải khát mùa hè, dùng lượng nhỏ'],
  },
  plum_no_pit_small: {
    en: ['Remove the pit completely (choking/toxin risk)', 'Cut flesh into small pieces', 'Very small portion, occasional only'],
    vi: ['Bỏ hoàn toàn hạt (nguy cơ nghẹn/độc tố)', 'Cắt thịt quả thành miếng nhỏ', 'Lượng rất nhỏ, chỉ thỉnh thoảng'],
  },
  kiwi: {
    en: ['Peel the fuzzy skin, slice the flesh', 'Cut into small bite-sized pieces', 'Vitamin-rich treat in moderation'],
    vi: ['Gọt bỏ vỏ lông, thái lát phần thịt', 'Cắt thành miếng vừa ăn', 'Món giàu vitamin, dùng vừa phải'],
  },
  cranberries: {
    en: ['Use fresh or dried unsweetened, no raisin mixes', 'Offer a few berries or mash into food', 'Tart taste — introduce slowly'],
    vi: ['Dùng quả tươi hoặc sấy khô không đường, không lẫn nho khô', 'Cho vài quả hoặc nghiền vào thức ăn', 'Vị chua — nên tập cho ăn từ từ'],
  },
  blackberries: {
    en: ['Rinse well, serve whole or halved', 'Fresh or frozen (thawed) both work', 'A small handful as an antioxidant snack'],
    vi: ['Rửa sạch, cho ăn nguyên quả hoặc bổ đôi', 'Dùng tươi hoặc đông lạnh (rã đông) đều được', 'Một nắm nhỏ làm món ăn chống oxy hóa'],
  },
  gooseberries: {
    en: ['Wash well, trim any stems', 'Serve a few whole or halved for small pets', 'Occasional tart treat'],
    vi: ['Rửa sạch, cắt bỏ cuống nếu có', 'Cho ăn vài quả nguyên hoặc bổ đôi cho thú nhỏ', 'Món ăn vị chua, dùng thỉnh thoảng'],
  },
  cod_liver_oil: {
    en: ['Use a pet-specific formula and dosing chart', 'Mix directly into food', 'Start small and monitor for loose stool'],
    vi: ['Dùng loại dành riêng cho thú cưng, theo đúng liều khuyến nghị', 'Trộn trực tiếp vào thức ăn', 'Bắt đầu lượng nhỏ, theo dõi phân lỏng'],
  },
  whey_protein_plain: {
    en: ['Choose plain, unflavored whey isolate', 'Mix a small amount into food or water', 'Best for active or recovering pets, occasional use'],
    vi: ['Chọn whey nguyên chất, không hương liệu', 'Trộn một lượng nhỏ vào thức ăn hoặc nước', 'Phù hợp cho thú vận động nhiều hoặc đang hồi phục, dùng thỉnh thoảng'],
  },
  goat_milk_small: {
    en: ['Choose plain, unsweetened goat milk', 'Offer a small amount to test tolerance first', 'A few tablespoons as an occasional treat'],
    vi: ['Chọn sữa dê nguyên chất, không đường', 'Cho thử lượng nhỏ trước để kiểm tra dung nạp', 'Vài thìa canh làm món thưởng thỉnh thoảng'],
  },
  duck_egg: {
    en: ['Boil or scramble plain, fully cooked', 'Chop before serving', 'Richer than chicken egg — smaller portion, less often'],
    vi: ['Luộc hoặc chiên chín, không gia vị', 'Cắt nhỏ trước khi cho ăn', 'Béo hơn trứng gà — cho ăn lượng ít hơn, ít lần hơn'],
  },
  quail_egg: {
    en: ['Boil fully, peel the shell', 'Can serve whole for small pets or halved', 'Great small-portion protein for toy breeds'],
    vi: ['Luộc chín kỹ, bóc vỏ', 'Có thể cho ăn nguyên quả với thú nhỏ hoặc bổ đôi', 'Nguồn protein khẩu phần nhỏ, tốt cho giống chó nhỏ'],
  },
  venison_lean: {
    en: ['Cook thoroughly, trim any fat', 'Cut into small pieces', 'Novel protein choice for pets with common-meat allergies'],
    vi: ['Nấu chín kỹ, lọc bỏ mỡ', 'Cắt thành miếng nhỏ', 'Nguồn protein mới cho thú dị ứng với thịt thông thường'],
  },
  rabbit_meat: {
    en: ['Cook thoroughly, debone completely', 'Shred into small pieces', 'Lean, hypoallergenic option for sensitive pets'],
    vi: ['Nấu chín kỹ, gỡ bỏ hoàn toàn xương', 'Xé thành miếng nhỏ', 'Lựa chọn ít béo, ít gây dị ứng cho thú nhạy cảm'],
  },
  oat_bran: {
    en: ['Cook briefly in water until soft', 'Stir a spoonful into regular meals', 'Good fiber add-in for digestive support'],
    vi: ['Nấu sơ với nước đến khi mềm', 'Khuấy một thìa vào bữa ăn thường ngày', 'Bổ sung chất xơ tốt cho tiêu hóa'],
  },
  whole_wheat_pasta_plain: {
    en: ['Boil plain until soft, no sauce or salt', 'Cut into small pieces if long', 'Occasional carb source, not a regular staple'],
    vi: ['Luộc chín mềm, không nước sốt hay muối', 'Cắt ngắn nếu sợi mì dài', 'Nguồn tinh bột dùng thỉnh thoảng, không nên ăn thường xuyên'],
  },
  rice_cakes_plain: {
    en: ['Choose plain, unsalted, unflavored rice cakes', 'Break into small pieces', 'Light occasional snack, not very nutritious'],
    vi: ['Chọn loại nguyên chất, không muối, không hương liệu', 'Bẻ thành miếng nhỏ', 'Món ăn vặt nhẹ, dùng thỉnh thoảng, ít dinh dưỡng'],
  },
  polenta: {
    en: ['Cook in water until soft and smooth, no butter or cheese', 'Let cool before serving', 'Easy-to-digest carb alternative'],
    vi: ['Nấu với nước đến khi mềm mịn, không bơ/phô mai', 'Để nguội trước khi cho ăn', 'Lựa chọn tinh bột dễ tiêu hóa'],
  },
  lentils_cooked: {
    en: ['Rinse and cook thoroughly until soft, no seasoning', 'Mash or serve whole depending on size', 'Good plant-based protein and fiber source'],
    vi: ['Vo sạch và nấu chín mềm, không gia vị', 'Nghiền hoặc để nguyên hạt tùy kích thước thú', 'Nguồn protein thực vật và chất xơ tốt'],
  },
  chickpeas_cooked: {
    en: ['Boil thoroughly until soft, rinse canned ones well', 'Mash or halve for easier chewing', 'A fiber and protein-rich occasional add-in'],
    vi: ['Luộc chín mềm, nếu dùng đóng hộp cần rửa kỹ', 'Nghiền hoặc bổ đôi cho dễ nhai', 'Bổ sung chất xơ và protein, dùng thỉnh thoảng'],
  },
  green_peas_puree: {
    en: ['Steam peas then puree until smooth', 'Serve a small spoonful mixed into food', 'Gentle option for puppies/seniors or picky eaters'],
    vi: ['Hấp đậu rồi nghiền nhuyễn mịn', 'Cho một thìa nhỏ trộn vào thức ăn', 'Lựa chọn dịu nhẹ cho chó con/lớn tuổi hoặc kén ăn'],
  },
  cabbage_cooked: {
    en: ['Steam or boil until tender, no seasoning', 'Chop finely', 'Small portions — can cause gas in larger amounts'],
    vi: ['Hấp hoặc luộc đến khi mềm, không gia vị', 'Băm nhỏ', 'Cho ăn lượng ít — ăn nhiều dễ gây đầy hơi'],
  },
  seaweed_small: {
    en: ['Use plain, unsalted dried seaweed made for pets', 'Crumble a small amount over food', 'Too much iodine can affect the thyroid — keep it minimal'],
    vi: ['Dùng rong biển khô, không muối, dành riêng cho thú cưng', 'Bóp vụn một lượng nhỏ rắc lên thức ăn', 'Quá nhiều i-ốt có thể ảnh hưởng tuyến giáp — dùng thật ít'],
  },
  dandelion_greens: {
    en: ['Wash thoroughly, use young tender leaves', 'Chop finely and mix in a small amount', 'Only from pesticide-free sources'],
    vi: ['Rửa thật sạch, chọn lá non', 'Băm nhỏ, trộn một lượng ít vào thức ăn', 'Chỉ dùng lá không phun thuốc trừ sâu'],
  },
  alfalfa_sprouts: {
    en: ['Rinse well before serving, use fresh sprouts', 'Chop finely for easier digestion', 'Small garnish amount, not a main food'],
    vi: ['Rửa sạch trước khi cho ăn, dùng giá đỗ tươi', 'Băm nhỏ để dễ tiêu hóa', 'Chỉ dùng lượng nhỏ trang trí, không phải món chính'],
  },
  broth_rice_mix: {
    en: ['Cook rice in plain low-sodium broth (no onion/garlic)', 'Serve warm, not hot', 'Soothing meal for upset stomach or recovery'],
    vi: ['Nấu cơm với nước dùng ít muối, không hành/tỏi', 'Cho ăn khi còn ấm, không nóng', 'Bữa ăn dịu nhẹ khi bụng khó chịu hoặc đang hồi phục'],
  },
  boiled_potato_plain: {
    en: ['Peel and boil until soft, no butter or salt', 'Mash or cube into small pieces', 'Never serve raw or green-skinned potato'],
    vi: ['Gọt vỏ, luộc mềm, không bơ/muối', 'Nghiền hoặc cắt hạt lựu nhỏ', 'Không bao giờ cho ăn khoai sống hoặc vỏ đã chuyển xanh'],
  },
  eggshell_powder: {
    en: ['Bake clean shells briefly then grind into fine powder', 'Sprinkle a small pinch over food', 'Follow a calcium dosage guide for the pet\'s size'],
    vi: ['Nướng sơ vỏ trứng sạch rồi xay thành bột mịn', 'Rắc một chút lên thức ăn', 'Tuân theo liều canxi phù hợp với kích thước thú cưng'],
  },
  sardine_oil: {
    en: ['Use a pet-specific sardine or fish oil', 'Drizzle the recommended dose over food', 'Introduce gradually to avoid stomach upset'],
    vi: ['Dùng dầu cá mòi dành riêng cho thú cưng', 'Rưới đúng liều khuyến nghị lên thức ăn', 'Cho dùng từ từ để tránh rối loạn tiêu hóa'],
  },
  homemade_dog_food: {
    en: ['Combine cooked lean protein, veggies, and a safe carb in balanced ratios', 'Avoid onion, garlic, excess salt, and seasoning', 'Consult a vet or pet nutritionist to balance vitamins/minerals long-term'],
    vi: ['Kết hợp protein nạc đã nấu chín, rau củ và tinh bột an toàn theo tỉ lệ cân đối', 'Tránh hành, tỏi, quá nhiều muối và gia vị', 'Nên hỏi bác sĩ thú y hoặc chuyên gia dinh dưỡng để cân bằng vitamin/khoáng chất lâu dài'],
  },
};