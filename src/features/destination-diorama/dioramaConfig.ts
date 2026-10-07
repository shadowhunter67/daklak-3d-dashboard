export type CameraPresetId = 'overview' | 'close' | 'high';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export type CameraPoses = Record<CameraPresetId, CameraPose>;

/**
 * Cơ sở dựng của từng diorama — hiển thị công khai để không gây hiểu nhầm:
 * - `photo`: dựng theo ảnh thực tế đã xác minh giấy phép và dẫn link trong dữ liệu điểm đến;
 * - `text`: chỉ dựng theo mô tả văn bản của nguồn, chưa đối chiếu được ảnh thực tế.
 * Chỉ thêm id vào đây khi đã có cảnh thật tương ứng trong `dioramaRegistry.ts`.
 */
export type DioramaBasis = 'photo' | 'text';

export const DIORAMA_BASIS: Record<string, DioramaBasis> = {
  'krong-kmar-waterfall': 'photo',
  'ho-lak': 'photo',
  'yok-don-national-park': 'photo',
  'dray-nur-waterfall': 'photo',
  'buon-don': 'photo',
  'cao-nguyen-van-hoa': 'text',
  'cau-ong-cop': 'text',
  'ganh-da-dia': 'photo',
  'mui-dien': 'text',
  'nui-chop-chai': 'text',
  'nui-da-bia': 'photo',
  'thap-nhan': 'photo',
  'thap-yang-prong': 'photo',
  'thac-bay-nhanh': 'photo',
  'thac-gia-long': 'photo',
  'thac-thuy-tien': 'text',
  'vuon-quoc-gia-ea-so': 'photo',
  'dinh-lac-giao': 'photo',
  'thac-dray-knao': 'photo',
  'vinh-xuan-dai': 'photo',
  'dam-o-loan': 'photo',
  'vung-ro': 'photo',
  'bao-tang-dak-lak': 'photo',
  'nha-day-buon-ma-thuot': 'photo',
  'buon-ako-dhong': 'photo',
  'duc-me-giang-son': 'photo',
  'lang-ca-phe-trung-nguyen': 'photo',
};

export const DIORAMA_DESTINATION_IDS: readonly string[] = Object.keys(DIORAMA_BASIS);

/** Props chung của mọi scene diorama (mỗi scene tự dựng Canvas của mình qua `DioramaCanvas`). */
export interface DioramaSceneProps {
  preset: CameraPresetId;
  reducedMotion: boolean;
  onContextLost: () => void;
  onContextRestored: () => void;
}

/** Camera của diorama Thác Krông Kmar (mỗi cảnh khác tự khai báo bộ camera riêng). */
export const CAMERA_PRESETS: CameraPoses = {
  overview: { position: [2.4, 3.0, 8.2], target: [0, 0.1, -2.4] },
  close: { position: [0.6, 0.9, 2.6], target: [-0.5, 0.35, -2.2] },
  high: { position: [2.6, 2.4, -1.0], target: [0, 0.5, -5.0] },
};

export interface SkySpec {
  top: string;
  mid: string;
  bottom: string;
  fogNear?: number;
  fogFar?: number;
}

export const DEFAULT_SKY: SkySpec = { top: '#6fa6d4', mid: '#b9d6e6', bottom: '#dbe8e6' };

export interface SunSpec {
  position: [number, number, number];
  intensity?: number;
  color?: string;
}
