// constants/breedData.ts
import { parseBilingual, BilingualValue } from '@/utils/bilingualField';

export const BREED_DATA: Record<'Dog' | 'Cat', { value: string; en: string; vi: string }[]> = {
  Dog: [
    { value: 'Unknown Breed', en: 'Unknown Breed', vi: 'Không rõ giống' },
    { value: 'Mixed Breed', en: 'Mixed Breed', vi: 'Giống lai' },
    { value: 'VN Local Dog', en: 'VN Local Dog', vi: 'Chó ta (Việt Nam)' },
    { value: 'Poodle', en: 'Poodle', vi: 'Poodle' },
    { value: 'Pomeranian', en: 'Pomeranian', vi: 'Phốc sóc (Pomeranian)' },
    { value: 'Corgi', en: 'Corgi', vi: 'Corgi' },
    { value: 'Golden Retriever', en: 'Golden Retriever', vi: 'Golden Retriever' },
    { value: 'Labrador Retriever', en: 'Labrador Retriever', vi: 'Labrador Retriever' },
    { value: 'Chihuahua', en: 'Chihuahua', vi: 'Chihuahua' },
    { value: 'French Bulldog', en: 'French Bulldog', vi: 'Bulldog Pháp' },
    { value: 'Husky', en: 'Husky', vi: 'Husky' },
    { value: 'Shiba Inu', en: 'Shiba Inu', vi: 'Shiba Inu' },
    { value: 'Samoyed', en: 'Samoyed', vi: 'Samoyed' },
    { value: 'Dachshund', en: 'Dachshund', vi: 'Dachshund (Lạp xưởng)' },
    { value: 'Beagle', en: 'Beagle', vi: 'Beagle' },
    { value: 'Pug', en: 'Pug', vi: 'Pug' },
    { value: 'Border Collie', en: 'Border Collie', vi: 'Border Collie' },
    { value: 'Maltese', en: 'Maltese', vi: 'Maltese' },
    { value: 'Yorkshire Terrier', en: 'Yorkshire Terrier', vi: 'Yorkshire Terrier' },
    { value: 'Schnauzer', en: 'Schnauzer', vi: 'Schnauzer' },
    { value: 'Chow Chow', en: 'Chow Chow', vi: 'Chow Chow' },
    { value: 'Alaskan Malamute', en: 'Alaskan Malamute', vi: 'Alaskan Malamute' },
    { value: 'Akita', en: 'Akita', vi: 'Akita' },
    { value: 'Doberman', en: 'Doberman', vi: 'Doberman' },
    { value: 'Rottweiler', en: 'Rottweiler', vi: 'Rottweiler' },
    { value: 'German Shepherd', en: 'German Shepherd', vi: 'Chó Bécgiê Đức' },
    { value: 'Phu Quoc Ridgeback', en: 'Phu Quoc Ridgeback', vi: 'Chó xoáy Phú Quốc' },
    { value: 'Bac Ha Dog', en: 'Bac Ha Dog', vi: 'Chó Bắc Hà' },
    { value: 'H’Mong Bobtail', en: 'H’Mong Bobtail', vi: "Chó cộc H'Mông" },
  ],
  Cat: [
    { value: 'Unknown Breed', en: 'Unknown Breed', vi: 'Không rõ giống' },
    { value: 'Mixed Breed', en: 'Mixed Breed', vi: 'Giống lai' },
    { value: 'Domestic Cat', en: 'Domestic Cat', vi: 'Mèo nhà' },
    { value: 'British Shorthair', en: 'British Shorthair', vi: 'British Shorthair (Lông ngắn Anh)' },
    { value: 'Scottish Fold', en: 'Scottish Fold', vi: 'Scottish Fold (Tai cụp Scotland)' },
    { value: 'Munchkin', en: 'Munchkin', vi: 'Munchkin' },
    { value: 'Persian', en: 'Persian', vi: 'Mèo Ba Tư' },
    { value: 'Ragdoll', en: 'Ragdoll', vi: 'Ragdoll' },
    { value: 'Maine Coon', en: 'Maine Coon', vi: 'Maine Coon' },
    { value: 'Bengal', en: 'Bengal', vi: 'Bengal' },
    { value: 'Sphynx', en: 'Sphynx', vi: 'Sphynx (Mèo không lông)' },
    { value: 'Russian Blue', en: 'Russian Blue', vi: 'Mèo Nga xanh' },
    { value: 'Siamese', en: 'Siamese', vi: 'Mèo Xiêm (Siamese)' },
    { value: 'Exotic Shorthair', en: 'Exotic Shorthair', vi: 'Exotic Shorthair' },
    { value: 'Tabby Cat', en: 'Tabby Cat', vi: 'Mèo vân (Tabby)' },
    { value: 'Orange Cat', en: 'Orange Cat', vi: 'Mèo cam' },
    { value: 'Black Cat', en: 'Black Cat', vi: 'Mèo đen' },
    { value: 'White Cat', en: 'White Cat', vi: 'Mèo trắng' },
    { value: 'Calico Cat', en: 'Calico Cat', vi: 'Mèo tam thể' },
    { value: 'Tuxedo Cat', en: 'Tuxedo Cat', vi: 'Mèo tuxedo' },
    { value: 'Siamese Mix', en: 'Siamese Mix', vi: 'Mèo lai Xiêm' },
    { value: 'Long Hair', en: 'Long Hair', vi: 'Mèo lông dài' },
    { value: 'Short Hair', en: 'Short Hair', vi: 'Mèo lông ngắn' },
  ],
};

export const OTHER_BREED_VALUE = '__OTHER__';

export const getBreedOptions = (species: 'Dog' | 'Cat' | string, isVi: boolean) => {
  const list = BREED_DATA[species as 'Dog' | 'Cat'] || [];
  const options = list.map((b) => ({ label: isVi ? b.vi : b.en, value: b.value }));
  options.push({ label: isVi ? 'Giống khác...' : 'Other breed...', value: OTHER_BREED_VALUE });
  return options;
};

export const SPECIES_BILINGUAL: Record<'Dog' | 'Cat', BilingualValue> = {
  Dog: { vi: 'Chó', en: 'Dog' },
  Cat: { vi: 'Mèo', en: 'Cat' },
};

/** data.species trả về từ API có thể là {en:"DOG",vi:"CHÓ"} hoặc {en:"Dog",vi:"Chó"}, hoa/thường lẫn lộn -> chuẩn hoá về 'Dog'|'Cat'. */
export function resolveSpeciesValue(speciesField: any): 'Dog' | 'Cat' {
  const bi = parseBilingual(speciesField);
  const text = `${bi.en} ${bi.vi}`.toUpperCase();
  return text.includes('CAT') || text.includes('MÈO') || text.includes('MEO') ? 'Cat' : 'Dog';
}

/** data.breed có thể là {en:"Poodle",vi:"Poodle"} -> khớp với BREED_DATA để biết có phải breed "lạ" (custom) không. */
export function resolveBreedValue(breedField: any, species: 'Dog' | 'Cat'): { value: string; isCustom: boolean } {
  const bi = parseBilingual(breedField);
  const enVal = (bi.en || bi.vi || '').trim();
  if (!enVal) return { value: '', isCustom: false };
  const known = BREED_DATA[species]?.find((b) => b.value.toLowerCase() === enVal.toLowerCase());
  return known ? { value: known.value, isCustom: false } : { value: enVal, isCustom: true };
}

/** Breed nằm trong danh sách cố định -> lấy thẳng {vi,en} từ bảng, KHÔNG cần gọi AI. */
export function buildBreedBilingual(breedValue: string, species: 'Dog' | 'Cat'): BilingualValue | null {
  const entry = BREED_DATA[species]?.find((b) => b.value === breedValue);
  return entry ? { vi: entry.vi, en: entry.en } : null;
}