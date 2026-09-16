/**
 * The two configs `yarn svg:icons` runs, exercised against the shapes they have
 * to get right.
 *
 * `mud-icon.spec.tsx` asserts the same properties over the COMMITTED icons, but
 * that is the outcome frozen in git: a typo in the keep-list below would break
 * nothing until the next designer re-ran the pipeline on a new icon, and the
 * suite would stay green on 358 already-processed files the whole time. These
 * run the config itself. See GitHub issue #50.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

import { optimize } from 'svgo';

const require = createRequire(import.meta.url);
const sizeConfig = require('../../svgo.config.icons.size.js');
const fillConfig = require('../../svgo.config.icons.fill.js');

const run = (config, svg) => optimize(svg, { ...config, path: 'probe.svg' }).data;

describe('svgo.config.icons.size.js — `yarn svg:remove-size`', () => {
  it('drops the root width/height when a viewBox carries the geometry', () => {
    const out = run(sizeConfig, '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M0 0h1v1H0z"/></svg>');
    assert.match(out, /viewBox="0 0 24 24"/);
    assert.doesNotMatch(out, /\swidth=/);
    assert.doesNotMatch(out, /\sheight=/);
  });

  // Without a viewBox the pair IS the geometry, so dropping it outright would
  // collapse the icon. `removeDimensions` writes the viewBox from the pair
  // first — the reason this pass is safe to run over a directory rather than
  // per-file.
  it('promotes the pair to a viewBox when there is none, rather than losing it', () => {
    const out = run(sizeConfig, '<svg width="24" height="24"><path d="M0 0h1v1H0z"/></svg>');
    assert.match(out, /viewBox="0 0 24 24"/);
    assert.doesNotMatch(out, /\swidth=/);
    assert.doesNotMatch(out, /\sheight=/);
  });

  // The one shape it cannot rescue: a non-numeric size with no viewBox. It
  // leaves the pair rather than guessing, so nothing is silently lost.
  it('leaves a non-numeric size alone when there is no viewBox', () => {
    const out = run(sizeConfig, '<svg width="100%" height="100%"><path d="M0 0h1v1H0z"/></svg>');
    assert.match(out, /width="100%"/);
    assert.doesNotMatch(out, /viewBox=/);
  });

  it('leaves paint alone — that is the other pass', () => {
    const out = run(sizeConfig, '<svg viewBox="0 0 24 24"><path fill="#112233" d="M0 0h1v1H0z"/></svg>');
    assert.match(out, /fill="#112233"/);
  });
});

describe('svgo.config.icons.fill.js — `yarn svg:remove-fill`', () => {
  const paint = (attribute, value) =>
    run(fillConfig, `<svg viewBox="0 0 24 24"><path ${attribute}="${value}" d="M0 0h1v1H0z"/></svg>`);

  for (const attribute of ['fill', 'stroke']) {
    it(`strips a hardcoded ${attribute}`, () => {
      assert.doesNotMatch(paint(attribute, '#112233'), new RegExp(`${attribute}=`));
      assert.doesNotMatch(paint(attribute, 'red'), new RegExp(`${attribute}=`));
    });

    // The whole reason this config exists rather than a plain removeAttrs.
    it(`keeps ${attribute}="currentColor", which is how the icon themes`, () => {
      assert.match(paint(attribute, 'currentColor'), new RegExp(`${attribute}="currentColor"`));
    });

    it(`keeps ${attribute}="none" and "transparent", whose removal paints the shape in`, () => {
      assert.match(paint(attribute, 'none'), new RegExp(`${attribute}="none"`));
      assert.match(paint(attribute, 'transparent'), new RegExp(`${attribute}="transparent"`));
    });

    it(`keeps a url() reference, which is the artwork rather than paint`, () => {
      assert.match(paint(attribute, 'url(#gradient)'), new RegExp(`${attribute}="url\\(#gradient\\)"`));
    });
  }

  it('does not touch a value that merely starts with a kept one', () => {
    assert.doesNotMatch(paint('fill', 'currentColorish'), /fill=/);
    assert.doesNotMatch(paint('fill', 'nonesuch'), /fill=/);
  });

  it('leaves the intrinsic size alone — that is the other pass', () => {
    const out = run(fillConfig, '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M0 0h1v1H0z"/></svg>');
    assert.match(out, /width="24"/);
    assert.match(out, /height="24"/);
  });
});
