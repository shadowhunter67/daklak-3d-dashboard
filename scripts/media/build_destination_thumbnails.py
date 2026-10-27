"""Sinh ảnh thu nhỏ WebP và siêu dữ liệu kích thước cho ảnh điểm đến (media pipeline).

Đầu vào : public/images/destinations/<id>.jpg (ảnh đã xác minh giấy phép, <= 640px)
Đầu ra  : public/images/destinations/thumb/<id>.webp (rộng 320px) và
          src/data/destinationPhotoMeta.ts (module TypeScript sinh tự động, không phải dataset JSON)

Chạy:  python scripts/media/build_destination_thumbnails.py
Ghi đè an toàn (idempotent): chạy lại cho cùng ảnh nguồn cho cùng kết quả. Cần Pillow có hỗ trợ WebP.
Khi chuyển sang object storage/CDN, chỉ đổi tiền tố đường dẫn trong src/data/destinationMedia.ts.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public' / 'images' / 'destinations'
THUMB = SRC / 'thumb'
META = ROOT / 'src' / 'data' / 'destinationPhotoMeta.ts'
THUMB_WIDTH = 320
QUALITY = 68


def main() -> int:
    THUMB.mkdir(parents=True, exist_ok=True)
    meta = {}
    for path in sorted(SRC.glob('*.jpg')):
        with Image.open(path) as im:
            im = im.convert('RGB')
            width, height = im.size
            thumb_height = max(1, round(height * THUMB_WIDTH / width))
            thumb = im.resize((THUMB_WIDTH, thumb_height), Image.LANCZOS)
            thumb.save(THUMB / f'{path.stem}.webp', 'WEBP', quality=QUALITY, method=6)
        meta[path.stem] = {
            'width': width,
            'height': height,
            'thumbWidth': THUMB_WIDTH,
            'thumbHeight': thumb_height,
        }
    header = (
        '/**\n'
        ' * SINH TỰ ĐỘNG bởi scripts/media/build_destination_thumbnails.py — đừng sửa tay.\n'
        ' * Kích thước ảnh gốc và thumbnail của ảnh điểm đến (tránh nhảy bố cục).\n'
        ' */\n'
        'export interface DestinationPhotoDims {\n'
        '  width: number;\n'
        '  height: number;\n'
        '  thumbWidth: number;\n'
        '  thumbHeight: number;\n'
        '}\n\n'
        'export const DESTINATION_PHOTO_META: Readonly<Record<string, DestinationPhotoDims>> = '
    )
    META.write_text(header + json.dumps(meta, indent=2, ensure_ascii=False) + ';\n', encoding='utf8')
    print(f'{len(meta)} ảnh: thumbnails -> {THUMB}, meta -> {META}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
