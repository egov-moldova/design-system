import { newSpecPage } from '@stencil/core/testing';
import { CorIllustration } from '../cor-illustration';

const MOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160"/></svg>';

function mockFetch(ok = true, body = MOCK_SVG) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    text: async () => body,
  } as Response);
}

describe('cor-illustration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders .illustration-container', async () => {
    mockFetch();
    const page = await newSpecPage({
      components: [CorIllustration],
      html: `<cor-illustration name="map"></cor-illustration>`,
    });
    expect(page.root?.shadowRoot?.querySelector('.illustration-container')).toBeTruthy();
  });

  it('has aria-hidden="true" when alt prop is omitted', async () => {
    mockFetch();
    const page = await newSpecPage({
      components: [CorIllustration],
      html: `<cor-illustration name="map"></cor-illustration>`,
    });
    const container = page.root?.shadowRoot?.querySelector('.illustration-container');
    expect(container?.getAttribute('aria-hidden')).toBe('true');
    expect(container?.getAttribute('role')).toBeNull();
  });

  it('has aria-label and role="img" when alt prop is set', async () => {
    mockFetch();
    const page = await newSpecPage({
      components: [CorIllustration],
      html: `<cor-illustration name="map" alt="A map of the area"></cor-illustration>`,
    });
    const container = page.root?.shadowRoot?.querySelector('.illustration-container');
    expect(container?.getAttribute('aria-label')).toBe('A map of the area');
    expect(container?.getAttribute('role')).toBe('img');
    expect(container?.getAttribute('aria-hidden')).toBeNull();
  });

  it('warns and does not fetch when name is empty', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await newSpecPage({
        components: [CorIllustration],
        html: `<cor-illustration name=""></cor-illustration>`,
      });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[cor-illustration] Illustration name is required');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('warns and does not fetch when name is not in the allowlist', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await newSpecPage({
        components: [CorIllustration],
        html: `<cor-illustration name="unknown"></cor-illustration>`,
      });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[cor-illustration] Invalid illustration name: unknown');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('host has no inline --illustration-width/--illustration-height when props are not set', async () => {
    mockFetch();
    const page = await newSpecPage({
      components: [CorIllustration],
      html: `<cor-illustration name="map"></cor-illustration>`,
    });
    const style = page.root?.getAttribute('style') ?? '';
    expect(style).not.toContain('--illustration-width');
    expect(style).not.toContain('--illustration-height');
  });

  it('host style includes --illustration-width: 120px when width={120}', async () => {
    mockFetch();
    const page = await newSpecPage({
      components: [CorIllustration],
      html: `<cor-illustration name="map" width="120"></cor-illustration>`,
    });
    const style = page.root?.getAttribute('style') ?? '';
    expect(style).toContain('--illustration-width: 120px');
  });

  it('host style includes --illustration-height: 80px when height={80}', async () => {
    mockFetch();
    const page = await newSpecPage({
      components: [CorIllustration],
      html: `<cor-illustration name="map" height="80"></cor-illustration>`,
    });
    const style = page.root?.getAttribute('style') ?? '';
    expect(style).toContain('--illustration-height: 80px');
  });

  it('renders empty container and warns when fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const page = await newSpecPage({
        components: [CorIllustration],
        html: `<cor-illustration name="map"></cor-illustration>`,
      });
      expect(page.root?.shadowRoot?.querySelector('.illustration-container')).toBeTruthy();
      expect(warnSpy).toHaveBeenCalledWith('[cor-illustration] Failed to load illustration: map');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('sanitizes fetched SVG before rendering', async () => {
    const maliciousSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
        <script>alert('xss')</script>
        <rect width="10" height="10" onload="alert('xss')"></rect>
        <a href="javascript:alert('xss')"><rect width="5" height="5"></rect></a>
        <foreignObject><div>bad</div></foreignObject>
        <use href="#safe-reference"></use>
      </svg>
    `;
    mockFetch(true, maliciousSvg);

    const page = await newSpecPage({
      components: [CorIllustration],
      html: `<cor-illustration name="map"></cor-illustration>`,
    });

    const container = page.root?.shadowRoot?.querySelector('.illustration-container');
    const renderedSvg = (container?.innerHTML ?? '').toLowerCase();

    expect(renderedSvg).not.toContain('<script');
    expect(renderedSvg).not.toContain('onload=');
    expect(renderedSvg).not.toContain('javascript:');
    expect(renderedSvg).not.toContain('<foreignobject');
    expect(renderedSvg).toContain('href="#safe-reference"');
  });
});
