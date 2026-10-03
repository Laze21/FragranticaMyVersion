import { mkdirSync, writeFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AtomizerButton } from '@/components/ui/AtomizerButton';
import { Toaster } from '@/components/ui/Toaster';
import { EmptyState } from '@/components/ui/EmptyState';
import emptyStyles from '@/components/ui/EmptyState.module.css';
import atomStyles from '@/components/ui/AtomizerButton.module.css';
import toastStyles from '@/components/ui/Toaster.module.css';
import markStyles from '@/components/cards/ShelfMark.module.css';

/* Renders the WP3 primitives that no page uses yet, so they can be looked at and so they at least render. */
describe('WP3 primitives render', () => {
  it('EmptyState and AtomizerButton produce markup', () => {
    const section = renderToStaticMarkup(
      h(EmptyState, {
        variant: 'section',
        icon: 'strip',
        title: 'No one has said what they smell in Sauvage yet.',
        line: 'Ranges appear once five people report.',
        action: h('button', { className: 'btn btn--quiet', type: 'button' }, 'What do you smell?'),
      }),
    );
    const yours = renderToStaticMarkup(
      h(EmptyState, {
        variant: 'yours',
        title: 'Nothing on the shelf yet.',
        line: 'Bottles you own, want or are testing live here, at their real size.',
        action: h('a', { className: 'btn', href: '/discover' }, 'Find something to put on it'),
      }),
    );
    const nothing = renderToStaticMarkup(
      h(EmptyState, {
        variant: 'nothing-matches',
        title: 'Nothing matches all of that.',
        line: 'Our catalogue is still small. Try loosening one thing:',
        children: [h('a', { key: 1, className: 'chip', href: '#' }, 'Drop: no tobacco'), h('a', { key: 2, className: 'chip', href: '#' }, 'Drop: under $100')],
        nearest: h('p', { className: 't-meta' }, '[three floor cards]'),
      }),
    );
    const atom = [
      renderToStaticMarkup(h(AtomizerButton, { variant: 'quiet' }, 'Wearing it today')),
      renderToStaticMarkup(h(AtomizerButton, { variant: 'ink' }, 'Log a wear')),
      renderToStaticMarkup(h(AtomizerButton, { variant: 'quiet', pressed: true, style: { ['--scent' as string]: '#2a4b7c' } }, 'Wearing it today')),
    ].join('\n');
    expect(section).toContain('No one has said');
    expect(yours).toContain('Find something');
    expect(nothing).toContain('Nearest we have');
    expect(atom).toContain('Log a wear');
    const out = process.env.WP3_PREVIEW_OUT;
    if (out) {
      mkdirSync(out, { recursive: true });
      // vitest scopes module classes as _name_hash; one probe per module gives the hash for the preview's CSS.
      const probe = (cls: string) => renderToStaticMarkup(h('i', { className: cls }));
      const hashes = { empty: probe(emptyStyles.section), atom: probe(atomStyles.btn), toast: probe(toastStyles.toast), mark: probe(markStyles.mark) };
      writeFileSync(`${out}/preview.json`, JSON.stringify({ section, yours, nothing, atom, toaster: renderToStaticMarkup(h(Toaster)), hashes }));
    }
  });
});
