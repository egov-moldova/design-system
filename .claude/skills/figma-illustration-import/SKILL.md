---
name: figma-illustration-import
description: Use when a Figma design requires a custom multi-layer illustration rather than a standard single-glyph icon. Check for an existing `cor-illustration-*` component first, then extract the Figma node, create a reusable Stencil illustration component, add stories, and verify it visually in Storybook.
---

# Figma Illustration Import

## Workflow

1. Check whether the illustration already exists in `src/components/cor-illustration-*/`.
2. If it does not exist, extract the Figma node, screenshot, and variables.
3. Create a reusable `cor-illustration-*` Stencil component.
4. Add the component CSS and Storybook stories.
5. Verify the result against Figma in Storybook.

## Rules

- Use this skill for custom illustrations, not standard UI icons.
- Prefer reuse before creating a new illustration component.
- Use Shadow DOM and a dedicated `cor-illustration-*` component.
- Keep illustration sizing component-controlled.
- Preserve accessibility with an appropriate image role and label when needed.
- Prefer inline SVG markup for simple vector layers to avoid asset-path issues.
- Keep theme behavior token-driven rather than swapping separate assets unless the design requires otherwise.

## Verification

- Check the Storybook story renders correctly.
- Compare the rendered illustration against the Figma design.
- Check for console errors.

## Where To Look

- `src/components/cor-illustration-*/`
- `_agents/figma-extraction.md`
- `_agents/pixel-perfect-qa.md`
- `src/components/_agents/storybook-stories.md`
