import type { ResearchedSector } from '../../../entities/researched-project/types';
import type { MessageKey } from '../../../i18n/messages';

/** Tái dùng nhãn lĩnh vực có sẵn; chỉ các lĩnh vực mới của danh mục thu hút đầu tư có khóa riêng. */
export const SECTOR_KEY: Record<ResearchedSector, MessageKey> = {
  transport: 'sector.transport',
  energy: 'sector.energy',
  irrigation: 'sector.irrigation',
  health: 'sector.health',
  education: 'sector.education',
  urban: 'sector.urban-development',
  'digital-government': 'sector.digital-transformation',
  housing: 'catalogSector.housing',
  industrial: 'catalogSector.industrial',
  agriculture: 'catalogSector.agriculture',
  tourism: 'catalogSector.tourism',
  environment: 'catalogSector.environment',
  other: 'catalogSector.other',
};
