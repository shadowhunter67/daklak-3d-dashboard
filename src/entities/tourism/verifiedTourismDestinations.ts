/**
 * REAL, SOURCED dataset — không phải dữ liệu minh hoạ. Cố ý KHÔNG đặt tên `*.demo.ts` /
 * `illustrative*.ts` (quy ước repo dùng cho dữ liệu giả, ví dụ
 * `illustrativeProjectPortfolio.ts`) vì 4 bản ghi dưới đây là toạ độ và mô tả có trích dẫn nguồn
 * thật (Wikipedia/Wikidata), đã xác minh thủ công trước khi đưa vào Phase T2
 * (reports/tourism-digital-twin/phase-status.md).
 *
 * Chỉ 4 điểm đến này — KHÔNG thêm điểm đến nào khác vào file này trừ khi có nguồn toạ độ đã xác
 * minh tương đương (xem phase-status.md, mục "Rejected/deferred candidates" cho 6 ứng viên đã
 * nghiên cứu nhưng bị loại vì không tìm được toạ độ có nguồn).
 */
import type { TourismDestination } from './types';

export const verifiedTourismDestinations: TourismDestination[] = [
  {
    id: 'ho-lak',
    name: 'Hồ Lắk',
    category: 'lake',
    description:
      "Hồ nước ngọt tự nhiên lớn thứ hai Việt Nam (~6,2 km²), thuộc thị trấn Liên Sơn, huyện Lắk, cách Buôn Ma Thuột khoảng 56 km. Ven hồ là các buôn làng người M'Nông; nơi đây từng có biệt điện nghỉ hè của vua Bảo Đại. Được bảo vệ như rừng đặc dụng từ năm 1995.",
    coordinates: [108.18194, 12.42167],
    sourceUrl: 'https://vi.wikipedia.org/wiki/H%E1%BB%93_L%E1%BA%AFk',
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Holak02.JPG',
    imageAttribution: 'Ảnh: Wikimedia Commons, File:Holak02.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-phase-t2',
  },
  {
    id: 'yok-don-national-park',
    name: 'Vườn quốc gia Yok Đôn',
    category: 'national-park',
    description:
      'Vườn quốc gia lớn nhất Việt Nam (~115.000 ha), thuộc xã Krông Na, huyện Buôn Đôn, cách Buôn Ma Thuột khoảng 40 km. Thành lập năm 1986, thuộc vùng sinh thái rừng khộp (rừng thưa cây họ dầu) Đông Dương, nổi tiếng với hệ sinh thái rừng khộp đặc trưng.',
    coordinates: [107.67065465, 12.80375719],
    sourceUrl: 'https://en.wikipedia.org/wiki/Yok_%C4%90%C3%B4n_National_Park',
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Yokdon01.JPG',
    imageAttribution: 'Ảnh: Wikimedia Commons, File:Yokdon01.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-phase-t2',
  },
  {
    id: 'dray-nur-waterfall',
    name: 'Thác Đray Nur',
    category: 'waterfall',
    description:
      "Thác nước trên hệ thống sông Serepốk, thuộc xã Ea Na, huyện Krông Ana, cách Buôn Ma Thuột khoảng 25 km. Một phần của cụm ba thác Đray Nur – Gia Long – Dray Sáp. Dài hơn 250 m, cao 30 m, rộng khoảng 150 m; tên trong tiếng Ê Đê nghĩa là 'thác cái'. Du khách có thể đi xuyên qua hang phía sau dòng thác.",
    coordinates: [107.8897, 12.5419],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Th%C3%A1c_%C4%90ray_Nur',
    // Không có ảnh tự do đã xác minh — cố ý KHÔNG thêm imageUrl placeholder (xem
    // validateTourismDestination.ts: imageUrl vắng mặt thì attribution/license cũng phải vắng mặt).
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-phase-t2',
  },
  {
    id: 'buon-don',
    name: 'Buôn Đôn',
    category: 'cultural-village',
    description:
      "Xã nằm trong vùng đệm Vườn quốc gia Yok Đôn, trung tâm lưu vực sông Srêpốk, gần biên giới Campuchia, huyện Buôn Đôn. Nổi tiếng lịch sử là trung tâm săn bắt và thuần dưỡng voi rừng của người Ê Đê, M'Nông, Lào; nghệ nhân thuần voi huyền thoại Y Pui (1883–1985) từng thuần dưỡng hơn 450 con voi.",
    coordinates: [107.67778, 12.80833],
    sourceUrl:
      'https://en.wikipedia.org/wiki/Bu%C3%B4n_%C4%90%C3%B4n,_%C4%90%E1%BA%AFk_L%E1%BA%AFk',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-phase-t2',
  },
];
