/**
 * SINH TỰ ĐỘNG bởi scripts/research/extract_planning_citations.mjs — đừng sửa tay.
 * Nguồn: cột "quyết định quy hoạch" của danh mục kèm Quyết định 1985/QĐ-UBND (bản lưu trong
 * docs/data-sources/evidence/1985-qd-ubnd/). Đây là các văn bản được TRÍCH DẪN trong danh mục, không
 * phải kết luận pháp lý về mức độ phù hợp quy hoạch của từng dự án. Cơ quan ban hành suy từ hậu tố số
 * hiệu; ngày chỉ có khi nằm ngay sau số hiệu trong nguồn.
 */
export type PlanningIssuer =
  'prime-minister' | 'ministry' | 'people-committee' | 'provincial-council' | 'unknown';

export interface PlanningDocument {
  number: string;
  issuer: PlanningIssuer;
  /** ISO yyyy-mm-dd; vắng nghĩa là nguồn không nêu ngày ngay sau số hiệu. */
  date?: string;
  /** Cách nguồn viết số hiệu khi khác dạng chuẩn hóa (không tự khẳng định số hiệu pháp lý). */
  sourceSpelling?: string;
  /** Id dự án trong researched-projects (qd1985-pl<N>-<stt>) có trích dẫn văn bản này. */
  projectIds: string[];
}

const decode = (n: number) =>
  `qd1985-pl${Math.floor(n / 1000)}-${String(n % 1000).padStart(3, '0')}`;
const RAW: readonly {
  number: string;
  issuer: PlanningIssuer;
  date?: string;
  sourceSpelling?: string;
  projectIds: number[];
}[] = [
  {
    number: '1509/QĐ-BCT',
    issuer: 'ministry',
    projectIds: [
      1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015,
      1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030,
      1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1039, 1040, 1041, 1042, 1043, 1044, 1045,
      1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053, 1054,
    ],
    date: '2025-05-30',
  },
  {
    number: '768/QĐ-TTg',
    issuer: 'prime-minister',
    projectIds: [
      1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015,
      1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030,
      1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1039, 1040, 1041, 1042, 1043, 1044, 1045,
      1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053, 1054,
    ],
    date: '2025-04-15',
  },
  {
    number: '1226/QĐ-TTg',
    issuer: 'prime-minister',
    projectIds: [
      2001, 2002, 2006, 2009, 2010, 2011, 2013, 2018, 2020, 2046, 4021, 4022, 5001, 5002, 5004,
      5012, 5018, 6002, 6003, 6015,
    ],
    date: '2023-10-24',
  },
  {
    number: '1349/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2001, 2013, 2018, 2020, 2046, 4021, 5004, 5012, 6002, 6003, 6015],
    date: '2024-10-09',
  },
  {
    number: '1169/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [4005, 4024, 4027, 4028, 4029, 4030, 4033, 4035, 4041, 6025],
    date: '2025-05-30',
  },
  {
    number: '1414/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [4004, 4008, 4009, 4010, 4011, 4012, 4013, 4017, 4023, 4036],
    date: '2025-06-24',
  },
  {
    number: '434/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2001, 2013, 2018, 2020, 2046, 4021, 5012, 6002, 6003, 6015],
    date: '2025-03-20',
  },
  {
    number: '1823/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2012, 2014, 2017, 2024, 2029, 4031, 6001, 6007, 6017],
    date: '2024-12-26',
  },
  {
    number: '501/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2004, 6004, 6005, 6006, 6008, 6009, 6010, 6013, 6018],
    date: '2025-03-28',
    sourceSpelling: '501/QĐUBND',
  },
  {
    number: '996/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2002, 2006, 2009, 2011, 5001, 5002, 5003, 6026],
    date: '2024-07-22',
  },
  {
    number: '549/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2012, 2014, 2017, 2024, 2029, 4031],
    date: '2025-04-09',
  },
  {
    number: '1361/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2026, 2027, 5005, 5009, 5010],
    date: '2025-06-20',
    sourceSpelling: '1361/QD-UBND',
  },
  {
    number: '1747/QĐ-TTg',
    issuer: 'prime-minister',
    projectIds: [2033, 4007, 4030, 6019, 6029],
    date: '2023-12-30',
  },
  {
    number: '1159/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2036, 4007, 4016, 6024],
    date: '2025-05-29',
  },
  {
    number: '1376/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [4001, 6011, 6016, 6027],
    date: '2025-06-20',
  },
  {
    number: '1398/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2039, 2040, 6019, 6029],
    date: '2025-06-24',
  },
  {
    number: '1790/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2039, 2040, 6019, 6029],
    date: '2022-08-10',
  },
  {
    number: '190/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [4003, 4014, 4015, 4018],
    date: '2024-02-14',
  },
  {
    number: '1097/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2043, 6020, 6022],
    date: '2025-05-20',
  },
  {
    number: '1245/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2009, 2011, 5002],
    date: '2009-07-06',
  },
  {
    number: '1283/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2009, 2011, 5002],
    date: '2007-07-20',
  },
  {
    number: '1284/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [4005, 4024, 4029],
    date: '2022-06-08',
  },
  {
    number: '1323/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2016, 2041, 5014],
    date: '2025-06-17',
  },
  {
    number: '1660/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2039, 2040, 6019],
    date: '2024-06-06',
  },
  {
    number: '1758/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2039, 2040, 6019],
    date: '2014-07-31',
  },
  {
    number: '1824/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2015, 2031, 2035],
    date: '2024-12-26',
  },
  {
    number: '372/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [5005, 5009, 5010],
    date: '2016-02-02',
  },
  {
    number: '4425/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2034, 2037, 2038],
    date: '2019-09-06',
  },
  {
    number: '703/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2016, 2033, 2043],
    date: '2024-03-05',
  },
  {
    number: '895/QĐ-TTg',
    issuer: 'prime-minister',
    projectIds: [4004, 4011, 4023],
    date: '2024-08-24',
  },
  {
    number: '04/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [5005, 5010],
    date: '2023-01-03',
  },
  {
    number: '1218/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2004, 6009],
    date: '2024-09-09',
    sourceSpelling: '1218/QĐUBND',
  },
  {
    number: '1363/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [4042, 6023],
    date: '2025-06-20',
  },
  { number: '1746/QĐ-TTg', issuer: 'prime-minister', projectIds: [4040, 6021], date: '2023-12-30' },
  {
    number: '2513/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2025, 2053],
    date: '2016-08-26',
  },
  {
    number: '4493/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2047, 5002],
    date: '2018-10-16',
  },
  {
    number: '560/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2022, 2049],
    date: '2024-02-06',
  },
  {
    number: '621/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [5008, 6032],
    date: '2024-02-26',
  },
  {
    number: '876/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2021, 6028],
    date: '2023-05-11',
  },
  {
    number: '889/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2013, 2046],
    date: '2025-05-31',
  },
  {
    number: '945/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [6001, 6030],
    sourceSpelling: '945/DQQ-UBND',
    date: '2025-04-09',
  },
  { number: '02197/QĐ-UBND', issuer: 'people-committee', projectIds: [4019], date: '2025-12-01' },
  { number: '1009/QĐ-UBND', issuer: 'people-committee', projectIds: [2051], date: '2021-07-26' },
  { number: '1061/QĐ-UBND', issuer: 'people-committee', projectIds: [2020], date: '2021-04-27' },
  { number: '11/NQ-HĐND', issuer: 'provincial-council', projectIds: [2030], date: '2025-08-19' },
  { number: '12/QĐ-UBND', issuer: 'people-committee', projectIds: [2016], date: '2010-01-04' },
  { number: '1248/QĐ-UBND', issuer: 'people-committee', projectIds: [6016], date: '2024-03-27' },
  { number: '1422/QĐ-UBND', issuer: 'people-committee', projectIds: [5015], date: '2023-03-31' },
  { number: '1424/QĐ-UBND', issuer: 'people-committee', projectIds: [2019], date: '2024-10-22' },
  { number: '1433/QĐ-UBND', issuer: 'people-committee', projectIds: [2008], date: '2025-06-25' },
  { number: '1501/QĐ-UBND', issuer: 'people-committee', projectIds: [5004], date: '2006-09-27' },
  { number: '1508/QĐ-UBND', issuer: 'people-committee', projectIds: [4027], date: '2021-10-19' },
  { number: '1668/QĐ-UBND', issuer: 'people-committee', projectIds: [5006], date: '2009-07-01' },
  { number: '1693/QĐ-UBND', issuer: 'people-committee', projectIds: [6007], date: '2023-12-15' },
  { number: '1709/QĐ-UBND', issuer: 'people-committee', projectIds: [2050], date: '2004-07-01' },
  { number: '1715/QĐ-UBND', issuer: 'people-committee', projectIds: [6029], date: '2023-04-24' },
  { number: '1726/QĐ-UBND', issuer: 'people-committee', projectIds: [6014], date: '2024-12-16' },
  { number: '1747/QĐ-TTG', issuer: 'prime-minister', projectIds: [6028], date: '2023-12-30' },
  { number: '177/QĐ-UBND', issuer: 'people-committee', projectIds: [4037], date: '2012-01-13' },
  { number: '1817/QĐ-UBND', issuer: 'people-committee', projectIds: [2026], date: '2023-09-20' },
  { number: '1846/QĐ-UBND', issuer: 'people-committee', projectIds: [2001], date: '2020-10-22' },
  { number: '1865/QĐ-UBND', issuer: 'people-committee', projectIds: [4025], date: '2015-07-17' },
  { number: '1960/QĐ-UBND', issuer: 'people-committee', projectIds: [5011], date: '2022-08-31' },
  { number: '1982/QĐ-UBND', issuer: 'people-committee', projectIds: [6032], date: '2012-08-31' },
  { number: '1994/QĐ-UBND', issuer: 'people-committee', projectIds: [2010], date: '2021-12-31' },
  { number: '200/QĐ-UBND', issuer: 'people-committee', projectIds: [2021], date: '2024-01-23' },
  {
    number: '2090/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [4020],
    sourceSpelling: '2090/QĐUBND',
    date: '2024-07-04',
  },
  { number: '2153/QĐ-UBND', issuer: 'people-committee', projectIds: [2032], date: '2019-12-27' },
  { number: '2164/QĐ-UBND', issuer: 'people-committee', projectIds: [2052], date: '2014-09-18' },
  { number: '2223/QĐ-UBND', issuer: 'people-committee', projectIds: [2034], date: '2022-05-23' },
  { number: '2240/QĐ-UBND', issuer: 'people-committee', projectIds: [6003], date: '2022-06-22' },
  { number: '2256/QĐ-UBND', issuer: 'people-committee', projectIds: [2023], date: '2018-09-17' },
  { number: '2262/QĐ-UBND', issuer: 'people-committee', projectIds: [5010], date: '2024-08-29' },
  { number: '2326/QĐ-UBND', issuer: 'people-committee', projectIds: [4042], date: '2023-08-22' },
  { number: '249/QĐ-UBND', issuer: 'people-committee', projectIds: [6028], date: '2020-02-07' },
  { number: '2562/QĐ-UBND', issuer: 'people-committee', projectIds: [2044], date: '2021-09-16' },
  { number: '2582/QĐ-UBND', issuer: 'people-committee', projectIds: [6029], date: '2025-06-06' },
  { number: '264/QĐ-UBND', issuer: 'people-committee', projectIds: [2048], date: '2022-01-26' },
  {
    number: '2791/QĐ-UBND',
    issuer: 'people-committee',
    projectIds: [2026],
    sourceSpelling: '2791/QĐUBND',
    date: '2025-05-19',
  },
  { number: '2841/QĐ-UBND', issuer: 'people-committee', projectIds: [2018], date: '2020-12-31' },
  { number: '2854/CAT-ANKT', issuer: 'unknown', projectIds: [4016], date: '2025-12-04' },
  { number: '2898/QĐ-UBND', issuer: 'people-committee', projectIds: [6023], date: '2023-11-01' },
  { number: '2934/QĐ-UBND', issuer: 'people-committee', projectIds: [2010], date: '2019-06-28' },
  { number: '3030/QĐ-UBND', issuer: 'people-committee', projectIds: [5006], date: '2011-11-17' },
  { number: '3053/QĐ-UBND', issuer: 'people-committee', projectIds: [2027], date: '2020-12-15' },
  { number: '3124/QĐ-UBND', issuer: 'people-committee', projectIds: [6019], date: '2011-12-01' },
  { number: '3141/QĐ-UBND', issuer: 'people-committee', projectIds: [2019], date: '2021-12-27' },
  { number: '3150/QĐ-UBND', issuer: 'people-committee', projectIds: [4002], date: '2022-09-26' },
  { number: '32/QĐ-UBND', issuer: 'people-committee', projectIds: [2027], date: '2021-01-22' },
  { number: '3244/QĐ-UBND', issuer: 'people-committee', projectIds: [2002], date: '2019-07-09' },
  { number: '342/QĐ-UBND', issuer: 'people-committee', projectIds: [5013], date: '2020-04-03' },
  { number: '3452/QĐ-UBND', issuer: 'people-committee', projectIds: [2030], date: '2022-10-13' },
  { number: '3813/QĐ-UNBD', issuer: 'unknown', projectIds: [2031], date: '2022-08-23' },
  { number: '3867/QĐ-UBND', issuer: 'people-committee', projectIds: [2030], date: '2022-11-17' },
  { number: '3945/QĐ-UBND', issuer: 'people-committee', projectIds: [2015], date: '2022-09-09' },
  { number: '402/CV-UBND', issuer: 'people-committee', projectIds: [4016], date: '2025-10-31' },
  { number: '412/QĐ-UBND', issuer: 'people-committee', projectIds: [2002], date: '2021-03-18' },
  { number: '42/NQ-HĐND', issuer: 'provincial-council', projectIds: [2021], date: '2023-12-07' },
  { number: '442/QĐ-UBND', issuer: 'people-committee', projectIds: [2032], date: '2021-03-24' },
  { number: '4519/QĐ-UBND', issuer: 'people-committee', projectIds: [2026], date: '2022-12-27' },
  { number: '4810/QĐ-UBND', issuer: 'people-committee', projectIds: [6028], date: '2020-07-10' },
  { number: '5041/QĐ-UBND', issuer: 'people-committee', projectIds: [4032], date: '2017-08-29' },
  { number: '512/QĐ-UNBD', issuer: 'unknown', projectIds: [2035], date: '2023-01-18' },
  { number: '539/QĐ-UBND', issuer: 'people-committee', projectIds: [2021], date: '2021-03-12' },
  { number: '617/QĐ-UBND', issuer: 'people-committee', projectIds: [2055], date: '2020-02-27' },
  { number: '650/QĐ-UBND', issuer: 'people-committee', projectIds: [2025], date: '2016-03-10' },
  { number: '6906/QĐ-UBND', issuer: 'people-committee', projectIds: [4038] },
  { number: '727/QĐ-UBND', issuer: 'people-committee', projectIds: [2030] },
  { number: '728/QĐ-UBND', issuer: 'people-committee', projectIds: [2030], date: '2019-09-09' },
  { number: '767/QĐ-UBND', issuer: 'people-committee', projectIds: [6003], date: '2021-06-08' },
  { number: '7730/QĐ-UBND', issuer: 'people-committee', projectIds: [4034], date: '2018-12-28' },
  { number: '84/QĐ-UBND', issuer: 'people-committee', projectIds: [5003], date: '2025-01-23' },
  { number: '857/QĐ-UBND', issuer: 'people-committee', projectIds: [4027], date: '2021-04-15' },
  { number: '893/QĐ-TTg', issuer: 'prime-minister', projectIds: [4021], date: '2023-07-26' },
  { number: '903/QĐ-UBND', issuer: 'people-committee', projectIds: [2016], date: '2022-04-15' },
  { number: '918/QĐ-UBND', issuer: 'people-committee', projectIds: [2045], date: '2013-05-14' },
  { number: '965/QĐ-UBND', issuer: 'people-committee', projectIds: [4017], date: '2025-04-25' },
  { number: '971/QĐ-UBND', issuer: 'people-committee', projectIds: [2030], date: '2022-03-17' },
];
const REVIEW_RAW: readonly number[] = [2006, 2010, 2020, 2044, 6032];
const UNCITED_RAW: readonly number[] = [
  2003, 2005, 2007, 2028, 2042, 2054, 4006, 4026, 4039, 5007, 5016, 5017, 6012, 6031,
];

export const PLANNING_TOTAL_PROJECTS = 201;
export const PLANNING_DOCUMENTS: readonly PlanningDocument[] = RAW.map((d) => ({
  ...d,
  projectIds: d.projectIds.map(decode),
}));
/** Dự án có ô quy hoạch tự nêu còn thiếu/chưa có (ví dụ "chưa có quy hoạch phân khu") — cần rà soát. */
export const PLANNING_REVIEW_PROJECT_IDS: readonly string[] = REVIEW_RAW.map(decode);
/** Dự án không trích số hiệu văn bản quy hoạch nào trong ô nguồn. */
export const PLANNING_UNCITED_PROJECT_IDS: readonly string[] = UNCITED_RAW.map(decode);
