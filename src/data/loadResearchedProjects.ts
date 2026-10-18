import type { ResearchedDataset } from '../entities/researched-project/types';

let request: Promise<ResearchedDataset> | null = null;

/** Tải một lần (cache cả lỗi được loại để cho phép thử lại). File ~10 KB gzip, không nằm trong bundle JS. */
export function loadResearchedProjects(): Promise<ResearchedDataset> {
  request ??= fetch(`${import.meta.env.BASE_URL}data/researched-projects.json.gz`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Researched projects unavailable (${response.status})`);
      const bytes = await response.arrayBuffer();
      if (new Uint8Array(bytes, 0, 2).every((value, index) => value === [0x1f, 0x8b][index])) {
        return new Response(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
        ).json();
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    })
    .then((value) => value as ResearchedDataset)
    .catch((error: unknown) => {
      request = null;
      throw error;
    });
  return request;
}
