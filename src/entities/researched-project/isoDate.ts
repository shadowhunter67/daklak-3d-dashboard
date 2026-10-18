const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/;

/** Mốc thời gian (ms) của chuỗi ISO hợp lệ; `undefined` nếu sai định dạng hoặc ngày không tồn tại. */
export function parseIsoDate(value: string): number | undefined {
  const m = ISO.exec(value);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Date.UTC tự chuẩn hoá 30/02 thành 02/03 — so lại từng thành phần để bắt ngày không tồn tại.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d)
    return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}
