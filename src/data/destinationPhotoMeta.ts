/**
 * SINH TỰ ĐỘNG bởi scripts/media/build_destination_thumbnails.py — đừng sửa tay.
 * Kích thước ảnh gốc và thumbnail của ảnh điểm đến (tránh nhảy bố cục).
 */
export interface DestinationPhotoDims {
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
}

export const DESTINATION_PHOTO_META: Readonly<Record<string, DestinationPhotoDims>> = {
  'bao-tang-dak-lak': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'buon-ako-dhong': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'buon-don': {
    width: 640,
    height: 429,
    thumbWidth: 320,
    thumbHeight: 214,
  },
  'chua-pho-minh': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'dam-o-loan': {
    width: 640,
    height: 361,
    thumbWidth: 320,
    thumbHeight: 180,
  },
  'dinh-lac-giao': {
    width: 640,
    height: 319,
    thumbWidth: 320,
    thumbHeight: 160,
  },
  'dray-nur-waterfall': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'duc-me-giang-son': {
    width: 339,
    height: 520,
    thumbWidth: 320,
    thumbHeight: 491,
  },
  'ganh-da-dia': {
    width: 640,
    height: 427,
    thumbWidth: 320,
    thumbHeight: 214,
  },
  'ho-lak': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'krong-kmar-waterfall': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'lang-ca-phe-trung-nguyen': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'mui-dien': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'nha-day-buon-ma-thuot': {
    width: 640,
    height: 427,
    thumbWidth: 320,
    thumbHeight: 214,
  },
  'nui-chop-chai': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'nui-da-bia': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'thac-bay-nhanh': {
    width: 640,
    height: 482,
    thumbWidth: 320,
    thumbHeight: 241,
  },
  'thac-dray-knao': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'thac-gia-long': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'thap-nhan': {
    width: 390,
    height: 520,
    thumbWidth: 320,
    thumbHeight: 427,
  },
  'thap-yang-prong': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'vinh-xuan-dai': {
    width: 640,
    height: 281,
    thumbWidth: 320,
    thumbHeight: 140,
  },
  'vung-ro': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'vuon-quoc-gia-ea-so': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
  'yok-don-national-park': {
    width: 640,
    height: 480,
    thumbWidth: 320,
    thumbHeight: 240,
  },
};
