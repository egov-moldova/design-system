import * as CarbonIcons from '@carbon/icons';

type CarbonIconNode = { elem: string; attrs?: Record<string, unknown>; content?: CarbonIconNode[] };
type CarbonIconEntry = { name: string; content: CarbonIconNode[]; attrs: Record<string, unknown> };
export const carbonIcons: Record<string, { content: CarbonIconNode[]; attrs: Record<string, unknown> }> =
  Object.fromEntries(
    Object.entries(CarbonIcons)
      .filter(([key]) => key.endsWith('32'))
      .map(([, entry]) => {
        const { name, content, attrs } = entry as CarbonIconEntry;
        return [name, { content, attrs }];
      }),
  );
