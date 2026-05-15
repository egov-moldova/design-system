function attrsToString(attrs: Record<string, unknown> = {}) {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => {
      if (v === true) return k; // boolean attrs
      return `${k}="${String(v).replace(/"/g, '&quot;')}"`;
    })
    .join(' ');
}

type SvgNode = {
  elem: string;
  attrs?: Record<string, unknown>;
  content?: SvgNode[]; // optional nesting
};

function nodeToString(node: SvgNode): string {
  const attrs = attrsToString(node.attrs);
  const children = node.content?.map(nodeToString).join('') ?? '';
  return children
    ? `<${node.elem}${attrs ? ` ${attrs}` : ''}>${children}</${node.elem}>`
    : `<${node.elem}${attrs ? ` ${attrs}` : ''} />`;
}

export function carbonDataToSvg(data: { attrs: Record<string, unknown>; content: SvgNode[] }) {
  const svgAttrs = attrsToString(data.attrs);
  const children = (data.content || []).map(nodeToString).join('');
  return `<svg${svgAttrs ? ` ${svgAttrs}` : ''}>${children}</svg>`;
}
