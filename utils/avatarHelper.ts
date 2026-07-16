// utils/avatarHelper.ts

export const DogAvatars: Record<string, any> = {
  // BẮT BUỘC: Bạn phải require tĩnh từng ảnh tương ứng với tên giống chó
  'Unknown Breed': require('@/assets/images/dog-avatar/Labrador-Retriever.png'),
  'Mixed Breed': require('@/assets/images/dog-avatar/Mix-Breed.png'),
  'VN Local Dog': require('@/assets/images/dog-avatar/Vn-local.png'),
  'Poodle': require('@/assets/images/dog-avatar/Poodle.png'),
  'Pomeranian': require('@/assets/images/dog-avatar/Pomeranian.png'),
  'Corgi': require('@/assets/images/dog-avatar/Corgi.png'),
  'Golden Retriever': require('@/assets/images/dog-avatar/Golden-Retriever.png'),
  'Labrador Retriever': require('@/assets/images/dog-avatar/Labrador-Retriever.png'),
  'Chihuahua': require('@/assets/images/dog-avatar/Labrador-Retriever.png'),
  'French Bulldog': require('@/assets/images/dog-avatar/French-bulldog.png'),
  'Husky': require('@/assets/images/dog-avatar/Husky.png'),
  'Shiba Inu': require('@/assets/images/dog-avatar/Labrador-Retriever.png'),
  'Samoyed': require('@/assets/images/dog-avatar/Samoyed.png'),
  'Dachshund': require('@/assets/images/dog-avatar/Dachshund.png'),
  'Beagle': require('@/assets/images/dog-avatar/Beagle.png'),
  'Pug': require('@/assets/images/dog-avatar/Pug.png'),
  'Border Collie': require('@/assets/images/dog-avatar/Border-Collie.png'),
  'Maltese': require('@/assets/images/dog-avatar/Maltese.png'),
  'Yorkshire Terrier': require('@/assets/images/dog-avatar/Yorkshire-Terrier.png'),
  'Schnauzer': require('@/assets/images/dog-avatar/Schnauzer.png'),
  'Chow Chow': require('@/assets/images/dog-avatar/Chow-chow.png'),
  'Alaskan Malamute': require('@/assets/images/dog-avatar/Alaskan-Malamute.png'),
  'Akita': require('@/assets/images/dog-avatar/Labrador-Retriever.png'),
  'Doberman': require('@/assets/images/dog-avatar/Doberman.png'),
  'Rottweiler': require('@/assets/images/dog-avatar/Rottweiler.png'),
  'German Shepherd': require('@/assets/images/dog-avatar/German-Sher.png'),
  'Phu Quoc Ridgeback': require('@/assets/images/dog-avatar/Labrador-Retriever.png'),
  'Bac Ha Dog': require('@/assets/images/dog-avatar/Labrador-Retriever.png'),
  'H’Mong Bobtail': require('@/assets/images/dog-avatar/Labrador-Retriever.png'),
};

export const CatAvatars = [
  require('@/assets/images/cat-avatar/1783506762125_789031897865753932_789031897865753932_c6ba071c1317cb7c5e9deb7765e41df5.jpg'),
  require('@/assets/images/cat-avatar/1783506762137_789031897865753932_789031897865753932_a66afc6952155d58cf2061624173b62d.jpg'),
  require('@/assets/images/cat-avatar/1783506762148_789031897865753932_789031897865753932_fd5d07a41d8b5c1788b1713cb1ddc8fc.jpg'),
  require('@/assets/images/cat-avatar/1783506762158_789031897865753932_789031897865753932_b0523be794256d31512a1208f986103f.jpg'),
  require('@/assets/images/cat-avatar/1783506762167_789031897865753932_789031897865753932_34cc4e8d3a54d8dc5f34cda46588c304.jpg'),
  require('@/assets/images/cat-avatar/1783506762175_789031897865753932_789031897865753932_22b8afa64c8dca3b08aeedd0901487eb.jpg'),
  require('@/assets/images/cat-avatar/1783506762183_789031897865753932_789031897865753932_3c37a7cf0d56fa755e8630faffcab15e.jpg'),
  require('@/assets/images/cat-avatar/1783506762189_789031897865753932_789031897865753932_01bd69a7fc2cc213517fab3d805278ba.jpg'),
  require('@/assets/images/cat-avatar/1783506762196_789031897865753932_789031897865753932_f39155ea901059abbd09067758661b57.jpg'),
  require('@/assets/images/cat-avatar/1783506762202_789031897865753932_789031897865753932_2e9a43b9c9feab4dde015d4521d5c758.jpg'),
  require('@/assets/images/cat-avatar/1783506762208_789031897865753932_789031897865753932_c3225ff050bc4bc207e63464b895fa15.jpg'),
  require('@/assets/images/cat-avatar/1783506762214_789031897865753932_789031897865753932_2103a04868ce5caa530ab7626d49b820.jpg'),
  require('@/assets/images/cat-avatar/1783506762221_789031897865753932_789031897865753932_bb5c2efb0e6351647d34a688395c686b.jpg'),
  require('@/assets/images/cat-avatar/1783506762227_789031897865753932_789031897865753932_cc3ae73a2d9d4a545c3c51f2d454fce2.jpg'),
  require('@/assets/images/cat-avatar/1783506762233_789031897865753932_789031897865753932_084ec1bba3e1c1b91b7b3d5f454c6bab.jpg'),
  require('@/assets/images/cat-avatar/1783506762239_789031897865753932_789031897865753932_05ed8fd46d7acf310a8b36600f360352.jpg'),
  require('@/assets/images/cat-avatar/1783506762245_789031897865753932_789031897865753932_6d41072d45c89cc9b90445b93a9b9829.jpg'),
  require('@/assets/images/cat-avatar/1783506762251_789031897865753932_789031897865753932_28fc4e396cc12874d95f9a73b47571c5.jpg'),
];

export const getDefaultAvatar = (species: 'Dog' | 'Cat', breed?: string) => {
  if (species === 'Dog' && breed) {
    // Trả về ảnh theo giống chó, nếu không có ảnh trùng khớp thì trả về undefined
    return DogAvatars[breed]; 
  }
  
  if (species === 'Cat' && CatAvatars.length > 0) {
    // Random ảnh mèo
    const randomIndex = Math.floor(Math.random() * CatAvatars.length);
    return CatAvatars[randomIndex];
  }
  
  return null;
};