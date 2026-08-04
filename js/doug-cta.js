/**
 * <doug-cta> — reusable "Doug-on-Demand" action button.
 * Used identically at three points on the page (Hero, How to Get Started,
 * The Quiet Sign of Progress). Self-contained: injects its own styles once,
 * so it can be dropped into any page with just this one <script> tag.
 *
 * Configure per instance via attributes, or change the site-wide defaults
 * below:
 *   <doug-cta href="contact.html" label="Doug-on-Demand" hover-label="Get Started Now"></doug-cta>
 *
 * Mobile / touch behavior (no :hover available) ships with two options —
 * flip MOBILE_MODE to preview the other one:
 *   'cycle'    — label auto-alternates between the two strings every 3.5s
 *   'subtitle' — "Get Started Now" is primary, "Doug-on-Demand" shows smaller underneath
 */
(function () {
  var DEFAULTS = {
    label: 'Doug-on-Demand',
    hoverLabel: 'Get Started Now',
    href: 'contact.html'
  };

  var MOBILE_MODE = 'cycle'; // 'cycle' | 'subtitle'
  var CYCLE_INTERVAL_MS = 3500;
  var SWEEP_MS = 180;

  var STYLE_ID = 'doug-cta-styles';
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      'doug-cta { display: inline-block; }',
      '.doug-cta {',
      '  position: relative;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  overflow: hidden;',
      '  min-width: 208px;',
      '  padding: 16px 30px;',
      '  border-radius: 999px;',
      '  background: #E9BC4D;',
      '  cursor: pointer;',
      '  isolation: isolate;',
      '  -webkit-tap-highlight-color: transparent;',
      '  box-shadow: 0 0 0 0 rgba(233, 188, 77, 0.65);',
      '  animation: doug-cta-pulse 2.2s ease-in-out infinite;',
      '  transition: box-shadow 0.25s ease;',
      '}',
      '.doug-cta.is-hover, .doug-cta.is-static { animation: none; box-shadow: 0 4px 18px rgba(216, 154, 23, 0.35); }',
      '@keyframes doug-cta-pulse {',
      '  0%, 100% { box-shadow: 0 0 0 0 rgba(233, 188, 77, 0.6); transform: scale(1); }',
      '  50% { box-shadow: 0 0 0 20px rgba(233, 188, 77, 0); transform: scale(1.035); }',
      '}',
      '.doug-cta__fill {',
      '  position: absolute;',
      '  inset: 0;',
      '  background: #D89A17;',
      '  transform: scaleX(0);',
      '  transform-origin: left center;',
      '  transition: transform ' + SWEEP_MS + 'ms cubic-bezier(0.22, 1, 0.36, 1);',
      '  z-index: 0;',
      '}',
      '.doug-cta.is-hover .doug-cta__fill { transform: scaleX(1); }',
      '.doug-cta__label {',
      '  position: relative;',
      '  z-index: 1;',
      '  display: inline-block;',
      '  min-width: 148px;',
      '  height: 19px;',
      '  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      '  font-weight: 600;',
      '  font-size: 15px;',
      '  letter-spacing: 0.01em;',
      '  color: #201705;',
      '  white-space: nowrap;',
      '}',
      '.doug-cta__label span {',
      '  position: absolute;',
      '  top: 50%;',
      '  left: 50%;',
      '  transform: translate(-50%, -50%);',
      '  opacity: 0;',
      '  transition: opacity ' + SWEEP_MS + 'ms ease ' + Math.round(SWEEP_MS * 0.3) + 'ms;',
      '}',
      '.doug-cta__label span[data-state="rest"] { opacity: 1; transition-delay: 0ms; }',
      '.doug-cta__subtitle-stack { display: none; }',
      '.doug-cta.is-hover .doug-cta__label span[data-state="rest"] { opacity: 0; transition-delay: 0ms; }',
      '.doug-cta.is-hover .doug-cta__label span[data-state="hover"] { opacity: 1; transition-delay: ' + Math.round(SWEEP_MS * 0.3) + 'ms; }',
      /* mobile: cycle mode reuses the same crossfade, toggled by JS via is-hover */
      /* mobile: subtitle mode — two permanent lines, no animation needed */
      '.doug-cta.mode-subtitle { flex-direction: column; gap: 2px; padding: 13px 30px; animation: none; box-shadow: 0 4px 18px rgba(216, 154, 23, 0.28); }',
      '.doug-cta.mode-subtitle .doug-cta__fill { display: none; }',
      '.doug-cta.mode-subtitle .doug-cta__label { display: none; }',
      '.doug-cta.mode-subtitle .doug-cta__subtitle-stack { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }',
      '.doug-cta.mode-subtitle .doug-cta__primary { font-family: "Inter", sans-serif; font-weight: 600; font-size: 15px; color: #201705; }',
      '.doug-cta.mode-subtitle .doug-cta__secondary { font-family: "Inter", sans-serif; font-weight: 500; font-size: 11.5px; color: rgba(32, 23, 5, 0.65); margin-top: 1px; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function supportsHover() {
    return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  class DougCta extends HTMLElement {
    connectedCallback() {
    var label = this.getAttribute('label') || DEFAULTS.label;
    var hoverLabel = this.getAttribute('hover-label') || DEFAULTS.hoverLabel;
    var href = this.getAttribute('href') || DEFAULTS.href;

    var a = document.createElement('a');
    a.href = href;
    a.className = 'doug-cta';

    var fill = document.createElement('span');
    fill.className = 'doug-cta__fill';
    fill.setAttribute('aria-hidden', 'true');

    var labelWrap = document.createElement('span');
    labelWrap.className = 'doug-cta__label';

    var restSpan = document.createElement('span');
    restSpan.dataset.state = 'rest';
    restSpan.textContent = label;

    var hoverSpan = document.createElement('span');
    hoverSpan.dataset.state = 'hover';
    hoverSpan.textContent = hoverLabel;
    hoverSpan.setAttribute('aria-hidden', 'true');

    labelWrap.appendChild(restSpan);
    labelWrap.appendChild(hoverSpan);

    var subtitleStack = document.createElement('span');
    subtitleStack.className = 'doug-cta__subtitle-stack';
    var primary = document.createElement('span');
    primary.className = 'doug-cta__primary';
    primary.textContent = hoverLabel;
    var secondary = document.createElement('span');
    secondary.className = 'doug-cta__secondary';
    secondary.textContent = label;
    subtitleStack.appendChild(primary);
    subtitleStack.appendChild(secondary);

    a.appendChild(fill);
    a.appendChild(labelWrap);
    a.appendChild(subtitleStack);
    this.appendChild(a);

    if (supportsHover()) {
      a.addEventListener('pointerenter', function () { a.classList.add('is-hover'); });
      a.addEventListener('pointerleave', function () { a.classList.remove('is-hover'); });
      a.addEventListener('focus', function () { a.classList.add('is-hover'); });
      a.addEventListener('blur', function () { a.classList.remove('is-hover'); });
    } else if (MOBILE_MODE === 'subtitle') {
      a.classList.add('mode-subtitle');
    } else {
      var cycling = false;
      var interval = setInterval(function () {
        cycling = !cycling;
        a.classList.toggle('is-hover', cycling);
      }, CYCLE_INTERVAL_MS);
      this._dougCtaInterval = interval;
    }
    }

    disconnectedCallback() {
      if (this._dougCtaInterval) clearInterval(this._dougCtaInterval);
    }
  }

  if (!customElements.get('doug-cta')) {
    customElements.define('doug-cta', DougCta);
  }
})();
