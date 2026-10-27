import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const sources = ['index.html', ...['blog', 'notes', 'projects', 'links', 'about', 'contact'].map(p => `${p}/index.html`), '_includes/post.njk'];
const script = readFileSync('script.js', 'utf8');
const copy = vm.runInNewContext(`${script.split('let language =')[0]}; copy`);
const normalizationDocument = new JSDOM('').window.document;
const normalizedHTML = html => {
  const div = normalizationDocument.createElement('div');
  div.innerHTML = html;
  return div.innerHTML.replace(/\s+/g, ' ').trim();
};

for (const source of sources) {
  test(`${source} ships Chinese translations and accessible navigation`, () => {
    const d = new JSDOM(readFileSync(source, 'utf8')).window.document;
    assert.equal(d.documentElement.lang, 'zh-CN');
    for (const node of d.querySelectorAll('*')) {
      for (const attr of node.attributes) {
        if (attr.name !== 'data-i18n' && !attr.name.startsWith('data-i18n-')) continue;
        assert.equal(typeof copy.zh[attr.value], 'string', `${source}: missing ${attr.value}`);
        const actual = attr.name === 'data-i18n' ? node.innerHTML : node.getAttribute(attr.name.slice('data-i18n-'.length));
        assert.equal(normalizedHTML(actual), normalizedHTML(copy.zh[attr.value]), `${source}: ${attr.name}=${attr.value}`);
      }
    }
    assert.equal(d.querySelector('#language-toggle').getAttribute('aria-label'), copy.zh.languageToggleLabel);
    for (const nav of d.querySelectorAll('.desktop-nav, .mobile-nav')) assert.equal(nav.querySelector('a').dataset.i18n, 'homeLabel');
    assert.ok(d.querySelector('.site-footer [data-i18n="footerHand"] .heart'));
    if (source === 'index.html') {
      assert.ok(d.querySelector('.now').hidden);
      assert.equal(d.querySelector('.hero-avatar').getAttribute('data-i18n-alt'), 'avatarAlt');
    }
    if (source === 'about/index.html') assert.ok(d.querySelector('.about-story-copy').hidden);
    const page = d.body.dataset.page;
    if (page !== 'home' && page !== 'post') assert.equal(d.title, `${copy.zh[`nav${page[0].toUpperCase()}${page.slice(1)}`]} · Lappio Blog`);
  });
}
