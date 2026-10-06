/**
 * REAL, SOURCED dataset — không phải dữ liệu minh hoạ. Cố ý KHÔNG đặt tên `*.demo.ts` /
 * `illustrative*.ts` (quy ước repo dùng cho dữ liệu giả, ví dụ
 * `illustrativeProjectPortfolio.ts`) vì các bản ghi dưới đây là toạ độ và mô tả có trích dẫn nguồn
 * thật (Wikipedia/Wikidata), đã xác minh thủ công trước khi đưa vào Phase T2
 * (reports/tourism-digital-twin/phase-status.md).
 *
 * 5 điểm đến — 4 điểm gốc của Phase T2, cộng `krong-kmar-waterfall` thêm ở Phase T4 (nguồn toạ độ
 * Wikipedia xác minh qua chính MediaWiki API — xem phase-status.md, mục "Phase T4"). KHÔNG thêm
 * điểm đến nào khác vào file này trừ khi có nguồn toạ độ đã xác minh tương đương (xem
 * phase-status.md, mục "Rejected/deferred candidates" cho các ứng viên còn lại vẫn bị loại vì
 * không tìm được toạ độ có nguồn, kể cả sau nỗ lực tìm kiếm bổ sung ở Phase T4).
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
  {
    id: 'krong-kmar-waterfall',
    name: 'Thác Krông Kmar',
    category: 'waterfall',
    description:
      'Thác nước trên dòng sông Krông Kmar, dưới chân dãy núi Chư Yang Sin, thuộc huyện Krông Bông, cách Buôn Ma Thuột khoảng 60 km. Bãi đá trải dài ven sông cùng những bãi tắm tự nhiên từng là điểm du lịch nổi tiếng của tỉnh; từ năm 2008, nhà máy thủy điện Krông Kmar (công suất 12 MW) xây dựng trên chính dòng suối này đã làm thay đổi cảnh quan sinh thái khu vực.',
    coordinates: [108.340884, 12.484197],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Th%C3%A1c_Kr%C3%B4ng_Kmar',
    // Ảnh tự do đã xác minh trên Wikimedia Commons (2026-10-04): File:Krongkma5.JPG, tác giả Đỗ Tuấn
    // Hưng ("Own work"), CC BY-SA 3.0 — trang file Commons liệt kê đúng giấy phép + tác giả.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Krongkma5.JPG',
    imageAttribution: 'Ảnh: Đỗ Tuấn Hưng, Wikimedia Commons, File:Krongkma5.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-phase-t4',
  },
  {
    id: 'cao-nguyen-van-hoa',
    name: 'Cao nguyên Vân Hòa',
    category: 'natural-landmark',
    description:
      'Cao nguyên trên vùng núi Trường Sơn ở phía đông tỉnh Đắk Lắk, thuộc địa bàn hai xã Vân Hòa và Tuy An Nam; độ cao trung bình khoảng 400 m, địa hình thoải dần từ tây, tây bắc về đông nam, khí hậu mát mẻ quanh năm (nhiệt độ trung bình khoảng 24 °C).',
    coordinates: [109.128866, 13.163999],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Cao_nguy%C3%AAn_V%C3%A2n_H%C3%B2a',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'cau-ong-cop',
    name: 'Cầu Ông Cọp',
    category: 'heritage-structure',
    description:
      'Cầu gỗ bắc qua sông Bình Bá, tỉnh Đắk Lắk, có từ năm 1998; đặt tên theo miếu Ông Cọp gần đó. Cầu nối các thôn phía bắc xã Tuy An Đông với phường Xuân Đài, cách trung tâm Tuy Hòa khoảng 35 km.',
    coordinates: [109.2414352, 13.36421406],
    sourceUrl: 'https://vi.wikipedia.org/wiki/C%E1%BA%A7u_%C3%94ng_C%E1%BB%8Dp',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'ganh-da-dia',
    name: 'Gành Đá Đĩa',
    category: 'natural-landmark',
    description:
      'Danh thắng thiên nhiên tại xã Tuy An Đông, tỉnh Đắk Lắk: một đoạn bờ biển có các cột đá bazan hình lăng trụ, trông giống những chiếc đĩa xếp chồng lên nhau.',
    coordinates: [109.293787, 13.354066],
    sourceUrl: 'https://vi.wikipedia.org/wiki/G%C3%A0nh_%C4%90%C3%A1_%C4%90%C4%A9a',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:G%C3%A0nh_%C4%90%C3%A1_%C4%90%C4%A9a.jpg',
    imageAttribution: 'Ảnh: Đông Hồ, Wikimedia Commons, File:Gành Đá Đĩa.jpg',
    imageLicense: 'CC BY-SA 2.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'mui-dien',
    name: 'Mũi Điện',
    category: 'natural-landmark',
    description:
      'Mũi đất nhô ra biển từ một nhánh của dãy Trường Sơn, hướng thẳng ra bãi Môn, thuộc xã Hòa Xuân, tỉnh Đắk Lắk; còn được gọi là Mũi Đại Lãnh.',
    coordinates: [109.456988, 12.896538],
    sourceUrl: 'https://vi.wikipedia.org/wiki/M%C5%A9i_%C4%90i%E1%BB%87n',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'nui-chop-chai',
    name: 'Núi Chóp Chài',
    category: 'natural-landmark',
    description:
      'Ngọn núi cao 394 m nổi lên giữa đồng bằng Tuy Hòa, thuộc phường Bình Kiến, tỉnh Đắk Lắk, cách trung tâm Tuy Hòa khoảng 4 km về phía tây bắc, sát Quốc lộ 1; cùng sông Ba là biểu tượng quen thuộc của Phú Yên.',
    coordinates: [109.273014, 13.113113],
    sourceUrl: 'https://vi.wikipedia.org/wiki/N%C3%BAi_Ch%C3%B3p_Ch%C3%A0i',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'nui-da-bia',
    name: 'Núi Đá Bia',
    category: 'natural-landmark',
    description:
      'Ngọn núi cao nhất trong khối núi Đại Lãnh thuộc dãy Đèo Cả, ở xã Hòa Xuân, tỉnh Đắk Lắk (tên chữ Thạch Bi Sơn, dân gian gọi là Núi Ông); nổi tiếng với tảng đá bia khổng lồ cao khoảng 80 m trên đỉnh núi, từ xa vẫn nhìn thấy.',
    coordinates: [109.40138888889, 12.898611111111],
    sourceUrl: 'https://vi.wikipedia.org/wiki/N%C3%BAi_%C4%90%C3%A1_Bia',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ Wikidata (P625).
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'thap-nhan',
    name: 'Tháp Nhạn',
    category: 'heritage-structure',
    description:
      'Tháp Chăm trên núi Nhạn, phường Tuy Hòa, tỉnh Đắk Lắk, do người Chăm ở lưu vực châu thổ sông Ba xây vào khoảng thế kỷ 12. Tháp hình tứ giác 4 tầng thu nhỏ dần lên cao, cao khoảng 23,5 m, mỗi cạnh chân tháp dài 10 m.',
    coordinates: [109.29722222, 13.07777778],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Th%C3%A1p_Nh%E1%BA%A1n',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    imageUrl:
      'https://commons.wikimedia.org/wiki/File:Th%C3%A1p_Nh%E1%BA%A1n,_Tuy_H%C3%B2a,_Ph%C3%BA_Y%C3%AAn.JPG',
    imageAttribution:
      'Ảnh: Dongson*vmvn (người tải lên gốc, vi.wikipedia), Wikimedia Commons, File:Tháp Nhạn, Tuy Hòa, Phú Yên.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'thap-yang-prong',
    name: 'Tháp Yang Prong',
    category: 'heritage-structure',
    description:
      'Tháp Chăm ở xã Ea Rốk, tỉnh Đắk Lắk, cách phường Buôn Ma Thuột khoảng 100 km; được ghi nhận là ngọn tháp Chăm duy nhất trên vùng đất Tây Nguyên. Tháp từng bị đánh mìn trong chiến tranh, nay đã được tu bổ và là điểm tham quan.',
    coordinates: [107.830847, 13.209898],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Th%C3%A1p_Yang_Prong',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ Wikidata (P625).
    imageUrl:
      'https://commons.wikimedia.org/wiki/File:Th%C3%A1p_Yang_Prong,_Ea_S%C3%BAp,_%C4%90%E1%BA%AFk_L%E1%BA%AFk.JPG',
    imageAttribution:
      'Ảnh: Nguyễn Đông Sơn, Wikimedia Commons, File:Tháp Yang Prong, Ea Súp, Đắk Lắk.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'thac-bay-nhanh',
    name: 'Thác Bảy Nhánh',
    category: 'waterfall',
    description:
      "Thác nước trên sông Srêpốk tại buôn N'DRêch, xã Ea Wer, tỉnh Đắk Lắk, cách thành phố Buôn Ma Thuột khoảng 35 km về hướng tây bắc.",
    coordinates: [107.815575, 12.85427],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Th%C3%A1c_B%E1%BA%A3y_Nh%C3%A1nh',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Camera360_2016_9_1_095841.jpg',
    imageAttribution: 'Ảnh: NguyenMii, Wikimedia Commons, File:Camera360 2016 9 1 095841.jpg',
    imageLicense: 'CC BY-SA 4.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'thac-gia-long',
    name: 'Thác Gia Long',
    category: 'waterfall',
    description:
      'Thác nước (còn gọi là Đray Sáp Thượng) trên sông Srêpốk, nằm trong hệ thống ba thác Gia Long – Đray Nur – Đray Sáp; địa phận thuộc xã Ea Na, tỉnh Đắk Lắk và xã Nam Đà, tỉnh Lâm Đồng.',
    coordinates: [107.913664, 12.527781],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Th%C3%A1c_Gia_Long',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'thac-thuy-tien',
    name: 'Thác Thủy Tiên',
    category: 'waterfall',
    description:
      'Thác nước (còn gọi là thác Ba Tầng) ở xã Phú Xuân, tỉnh Đắk Lắk, giữa núi rừng hoang sơ với nhiều tảng đá nằm gối chồng lên nhau và rễ cây rừng đan kín; có ba tầng nước đổ.',
    coordinates: [108.464886, 12.972561],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Th%C3%A1c_Th%E1%BB%A7y_Ti%C3%AAn',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'vuon-quoc-gia-ea-so',
    name: 'Vườn quốc gia Ea Sô',
    category: 'national-park',
    description: 'Vườn quốc gia ở xã Ea Knốp, tỉnh Đắk Lắk.',
    coordinates: [108.650822, 12.938229],
    sourceUrl: 'https://vi.wikipedia.org/wiki/V%C6%B0%E1%BB%9Dn_qu%E1%BB%91c_gia_Ea_S%C3%B4',
    // Đối chiếu độc lập với OpenStreetMap Nominatim 2026-10-05 (lệch ≤ 1 km, hoặc là vùng rộng); toạ độ lấy từ bài vi.wikipedia.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Easo.JPG',
    imageAttribution: 'Ảnh: Dotuanhungdaklak (vi.wikipedia), Wikimedia Commons, File:Easo.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'dinh-lac-giao',
    name: 'Đình Lạc Giao',
    category: 'heritage-structure',
    description:
      'Đình di tích lịch sử cấp quốc gia tại số 67 đường Phan Bội Châu, phường Buôn Ma Thuột, khởi dựng năm 1928 và xây lại kiên cố năm 1932, gắn với quá trình hình thành làng Lạc Giao của cư dân Việt đầu thế kỷ 20.',
    coordinates: [108.04055556, 12.68305556],
    sourceUrl: 'https://vi.wikipedia.org/wiki/%C4%90%C3%ACnh_L%E1%BA%A1c_Giao',
    // Đối chiếu hai nguồn độc lập 2026-10-05: toạ độ Wikipedia khớp OpenStreetMap trong 0,2 km.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:The_Lac_giao_tabernacle.jpg',
    imageAttribution: 'Ảnh: Y Kpia Mlo, Wikimedia Commons, File:The Lac giao tabernacle.jpg',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'thac-dray-knao',
    name: "Thác Đray K'nao",
    category: 'waterfall',
    description:
      "Thác nước trên dòng Ea Krông Hding ở xã M'Drắk, tỉnh Đắk Lắk, cách thị trấn M'Drắk khoảng 7 km về hướng tây bắc và cách lối vào trên quốc lộ 26 khoảng 2 km.",
    coordinates: [108.704702, 12.780437],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Th%C3%A1c_%C4%90ray_K%27nao',
    // Đối chiếu hai nguồn độc lập 2026-10-05: toạ độ Wikipedia khớp OpenStreetMap trong 0,2 km.
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'vinh-xuan-dai',
    name: 'Vịnh Xuân Đài',
    category: 'natural-landmark',
    description:
      'Vịnh nhỏ nằm dưới chân dốc Găng, thuộc địa phận phường Xuân Đài và Sông Cầu, tỉnh Đắk Lắk.',
    coordinates: [109.24944444, 13.42805556],
    sourceUrl: 'https://vi.wikipedia.org/wiki/V%E1%BB%8Bnh_Xu%C3%A2n_%C4%90%C3%A0i',
    // Đối chiếu hai nguồn độc lập 2026-10-05: toạ độ Wikipedia khớp OpenStreetMap trong 0,7 km.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Xuan_Dai_Bay,_Phu_Yen,_Vietnam.JPG',
    imageAttribution:
      'Ảnh: Nguyễn Đông Sơn, Wikimedia Commons, File:Xuan Dai Bay, Phu Yen, Vietnam.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'dam-o-loan',
    name: 'Đầm Ô Loan',
    category: 'natural-landmark',
    description:
      'Đầm ở tỉnh Đắk Lắk (thuộc Phú Yên cũ), là thắng cảnh cấp quốc gia của Việt Nam và một danh lam tiêu biểu của tỉnh.',
    coordinates: [109.270135, 13.278719],
    sourceUrl: 'https://vi.wikipedia.org/wiki/%C4%90%E1%BA%A7m_%C3%94_Loan',
    // Đối chiếu hai nguồn độc lập 2026-10-05: toạ độ Wikipedia khớp OpenStreetMap trong 2,2 km (đầm rộng, hai điểm cùng nằm trong vùng đầm).
    imageUrl:
      'https://commons.wikimedia.org/wiki/File:%C4%90%E1%BA%A7m_%C3%94_Loan,_An_Hi%E1%BB%87p,_Tuy_An,_Ph%C3%BA_Y%C3%AAn.jpeg',
    imageAttribution:
      'Ảnh: Linhcandng, Wikimedia Commons, File:Đầm Ô Loan, An Hiệp, Tuy An, Phú Yên.jpeg',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'vung-ro',
    name: 'Vũng Rô',
    category: 'natural-landmark',
    description: 'Vũng biển thuộc xã Hòa Xuân, tỉnh Đắk Lắk.',
    coordinates: [109.422572, 12.864887],
    sourceUrl: 'https://vi.wikipedia.org/wiki/V%C5%A9ng_R%C3%B4',
    // Đối chiếu hai nguồn độc lập 2026-10-05: toạ độ Wikipedia khớp OpenStreetMap trong 0,2 km.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:V%E1%BB%8Bnh_V%C5%A9ng_R%C3%B4.jpg',
    imageAttribution: 'Ảnh: Bùi Thụy Đào Nguyên, Wikimedia Commons, File:Vịnh Vũng Rô.jpg',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'bao-tang-dak-lak',
    name: 'Bảo tàng Đắk Lắk',
    category: 'heritage-structure',
    description:
      'Bảo tàng các dân tộc Việt Nam tại Đắk Lắk (thường gọi là Bảo tàng Đắk Lắk), tại số 02 Y Ngông (trước đây là 04 Nguyễn Du), nằm trong khuôn viên rộng hơn 6 ha của Di tích lịch sử quốc gia Biệt điện Bảo Đại.',
    coordinates: [108.0421, 12.676],
    sourceUrl:
      'https://vi.wikipedia.org/wiki/B%E1%BA%A3o_t%C3%A0ng_c%C3%A1c_d%C3%A2n_t%E1%BB%99c_Vi%E1%BB%87t_Nam_t%E1%BA%A1i_%C4%90%E1%BA%AFk_L%E1%BA%AFk',
    // Một nguồn toạ độ (OpenStreetMap, © OpenStreetMap contributors, ODbL); bài vi.wikipedia xác nhận địa điểm có thật. Chưa đối chiếu được nguồn toạ độ thứ hai.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Baotang05.JPG',
    imageAttribution: 'Ảnh: Đỗ Tuấn Hưng, Wikimedia Commons, File:Baotang05.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'medium',
    verificationStatus: 'validated-automatically',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'nha-day-buon-ma-thuot',
    name: 'Nhà đày Buôn Ma Thuột',
    category: 'heritage-structure',
    description:
      'Di tích lịch sử tại Đắk Lắk: hệ thống nhà tù (nhà đày) cũ từ thời Pháp thuộc, hiện do Sở Văn hóa, Thể thao và Du lịch tỉnh Đắk Lắk quản lý.',
    coordinates: [108.0472, 12.6768],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Nh%C3%A0_%C4%91%C3%A0y_Bu%C3%B4n_Ma_Thu%E1%BB%99t',
    // Một nguồn toạ độ (OpenStreetMap, © OpenStreetMap contributors, ODbL); bài vi.wikipedia xác nhận địa điểm có thật. Chưa đối chiếu được nguồn toạ độ thứ hai.
    confidence: 'medium',
    verificationStatus: 'validated-automatically',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'buon-ako-dhong',
    name: 'Buôn Akõ Dhông',
    category: 'cultural-village',
    description:
      'Buôn của người Ê Đê tại thành phố Buôn Ma Thuột; "Akŏ Dhông" nghĩa là "đầu dốc" vì buôn nằm sát dốc đầu nguồn suối Ea Nuôl, được xem là "buôn đẹp nhất thành phố Buôn Ma Thuột".',
    coordinates: [108.0491, 12.6965],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Bu%C3%B4n_Ak%C3%B5_Dh%C3%B4ng',
    // Một nguồn toạ độ (OpenStreetMap, © OpenStreetMap contributors, ODbL); bài vi.wikipedia xác nhận địa điểm có thật. Chưa đối chiếu được nguồn toạ độ thứ hai.
    confidence: 'medium',
    verificationStatus: 'validated-automatically',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'duc-me-giang-son',
    name: 'Đức Mẹ Giang Sơn',
    category: 'heritage-structure',
    description:
      'Tượng đài Đức Mẹ trên đồi Giang Sơn, cách thành phố Buôn Ma Thuột khoảng 30 km về phía đông nam theo Quốc lộ 27 (đường đi Đà Lạt); trung tâm hành hương Công giáo thuộc Giáo phận Ban Mê Thuột.',
    coordinates: [108.1923, 12.5073],
    sourceUrl: 'https://vi.wikipedia.org/wiki/%C4%90%E1%BB%A9c_M%E1%BA%B9_Giang_S%C6%A1n',
    // Một nguồn toạ độ (OpenStreetMap, © OpenStreetMap contributors, ODbL); bài vi.wikipedia xác nhận địa điểm có thật. Chưa đối chiếu được nguồn toạ độ thứ hai.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Ducmegiangson.jpg',
    imageAttribution: 'Ảnh: Baojcn01, Wikimedia Commons, File:Ducmegiangson.jpg',
    imageLicense: 'CC BY-SA 4.0',
    confidence: 'medium',
    verificationStatus: 'validated-automatically',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
  {
    id: 'lang-ca-phe-trung-nguyen',
    name: 'Làng cà phê Trung Nguyên',
    category: 'heritage-structure',
    description:
      'Cụm công trình kiến trúc khoảng 20.000 m² ở phường Buôn Ma Thuột, tọa lạc tại ngã ba Lý Thái Tổ – Nguyễn Hữu Thọ; địa điểm du lịch nổi tiếng ở Tây Nguyên với không gian kiến trúc độc đáo.',
    coordinates: [108.0447, 12.6909],
    sourceUrl: 'https://vi.wikipedia.org/wiki/L%C3%A0ng_c%C3%A0_ph%C3%AA_Trung_Nguy%C3%AAn',
    // Một nguồn toạ độ (OpenStreetMap, © OpenStreetMap contributors, ODbL); bài vi.wikipedia xác nhận địa điểm có thật. Chưa đối chiếu được nguồn toạ độ thứ hai. Toạ độ Wikidata (Q10787424) trùng điểm OSM 'Bảo tàng Thế giới Cà phê' trong cùng khuôn viên.
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Langcaphetrungnguyen.JPG',
    imageAttribution: 'Ảnh: Phan Thanh Huyền, Wikimedia Commons, File:Langcaphetrungnguyen.JPG',
    imageLicense: 'CC BY-SA 3.0',
    confidence: 'medium',
    verificationStatus: 'validated-automatically',
    dataOwner: 'tourism-digital-twin-expansion-2026-10',
  },
];
