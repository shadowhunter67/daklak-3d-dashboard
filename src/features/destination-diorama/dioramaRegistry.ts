import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { DioramaSceneProps } from './dioramaConfig';

/**
 * Điểm đến → scene diorama. Mỗi nhóm cảnh (thác, ven nước, địa danh, công trình) là một chunk lazy
 * riêng, chỉ tải khi người dùng mở diorama tương ứng; nhiều điểm đến cùng nhóm dùng chung một chunk.
 * Khóa ở đây phải khớp đúng `DIORAMA_BASIS` (có test kiểm tra).
 */
type SceneComponent = LazyExoticComponent<ComponentType<DioramaSceneProps>>;

const waterfalls = () => import('./scenes/waterfalls');
const waters = () => import('./scenes/waters');
const landmarks = () => import('./scenes/landmarks');
const structures = () => import('./scenes/structures');

export const DIORAMA_SCENES: Record<string, SceneComponent> = {
  'krong-kmar-waterfall': lazy(() =>
    import('./KrongKmarScene').then((m) => ({ default: m.KrongKmarScene })),
  ),
  'dray-nur-waterfall': lazy(() => waterfalls().then((m) => ({ default: m.DrayNurScene }))),
  'thac-gia-long': lazy(() => waterfalls().then((m) => ({ default: m.GiaLongScene }))),
  'thac-thuy-tien': lazy(() => waterfalls().then((m) => ({ default: m.ThuyTienScene }))),
  'thac-dray-knao': lazy(() => waterfalls().then((m) => ({ default: m.DrayKnaoScene }))),
  'thac-bay-nhanh': lazy(() => waterfalls().then((m) => ({ default: m.BayNhanhScene }))),
  'vuon-quoc-gia-ea-so': lazy(() => waterfalls().then((m) => ({ default: m.EaSoScene }))),
  'yok-don-national-park': lazy(() => waterfalls().then((m) => ({ default: m.YokDonScene }))),
  'ho-lak': lazy(() => waters().then((m) => ({ default: m.HoLakScene }))),
  'dam-o-loan': lazy(() => waters().then((m) => ({ default: m.DamOLoanScene }))),
  'vinh-xuan-dai': lazy(() => waters().then((m) => ({ default: m.XuanDaiScene }))),
  'vung-ro': lazy(() => waters().then((m) => ({ default: m.VungRoScene }))),
  'ganh-da-dia': lazy(() => waters().then((m) => ({ default: m.GanhDaDiaScene }))),
  'mui-dien': lazy(() => waters().then((m) => ({ default: m.MuiDienScene }))),
  'nui-chop-chai': lazy(() => landmarks().then((m) => ({ default: m.ChopChaiScene }))),
  'nui-da-bia': lazy(() => landmarks().then((m) => ({ default: m.DaBiaScene }))),
  'cao-nguyen-van-hoa': lazy(() => landmarks().then((m) => ({ default: m.VanHoaScene }))),
  'thap-nhan': lazy(() => structures().then((m) => ({ default: m.ThapNhanScene }))),
  'thap-yang-prong': lazy(() => structures().then((m) => ({ default: m.ThapYangProngScene }))),
  'buon-don': lazy(() => structures().then((m) => ({ default: m.BuonDonScene }))),
  'buon-ako-dhong': lazy(() => structures().then((m) => ({ default: m.AkoDhongScene }))),
  'dinh-lac-giao': lazy(() => structures().then((m) => ({ default: m.DinhLacGiaoScene }))),
  'bao-tang-dak-lak': lazy(() => structures().then((m) => ({ default: m.BaoTangScene }))),
  'nha-day-buon-ma-thuot': lazy(() => structures().then((m) => ({ default: m.NhaDayScene }))),
  'lang-ca-phe-trung-nguyen': lazy(() => structures().then((m) => ({ default: m.LangCaPheScene }))),
  'duc-me-giang-son': lazy(() => structures().then((m) => ({ default: m.GiangSonScene }))),
  'cau-ong-cop': lazy(() => structures().then((m) => ({ default: m.CauOngCopScene }))),
};
