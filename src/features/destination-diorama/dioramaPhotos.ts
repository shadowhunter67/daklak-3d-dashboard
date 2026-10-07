/**
 * Ảnh thực tế tham chiếu của từng điểm đến, chép cùng origin (hợp CSP `img-src 'self'`) vào
 * `public/images/destinations/<id>.jpg` — bản nén ≤ 640 px từ ảnh Wikimedia Commons đã xác minh giấy
 * phép (CC BY-SA/CC BY). Chỉ điểm đến có `imageUrl` trong dữ liệu mới có file; test giữ hai chiều khớp nhau.
 */
export function destinationPhotoUrl(destinationId: string): string {
  return `${import.meta.env.BASE_URL}images/destinations/${destinationId}.jpg`;
}
