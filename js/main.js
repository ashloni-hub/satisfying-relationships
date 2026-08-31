(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Nav: scroll shadow + mobile toggle ---------------- */
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');

  if (nav) {
    var onNavScroll = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 20);
    };
    onNavScroll();
    window.addEventListener('scroll', onNavScroll, { passive: true });
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav__mobile a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Nav: mobile Services/Locations collapse ---------------- */
  document.querySelectorAll('.nav__mobile-label').forEach(function (label) {
    label.addEventListener('click', function () {
      var group = label.closest('.nav__mobile-group');
      var wasOpen = group.classList.contains('is-open');
      document.querySelectorAll('.nav__mobile-group.is-open').forEach(function (g) {
        g.classList.remove('is-open');
        g.querySelector('.nav__mobile-label').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        group.classList.add('is-open');
        label.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------------- Nav: Services dropdown (tap-to-toggle for touch) ---------------- */
  document.querySelectorAll('.nav__dropdown-trigger').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var dropdown = trigger.closest('.nav__dropdown');
      var wasOpen = dropdown.classList.contains('is-open');
      document.querySelectorAll('.nav__dropdown.is-open').forEach(function (d) {
        d.classList.remove('is-open');
      });
      if (!wasOpen) dropdown.classList.add('is-open');
      trigger.setAttribute('aria-expanded', String(!wasOpen));
    });
  });
  document.addEventListener('click', function () {
    document.querySelectorAll('.nav__dropdown.is-open').forEach(function (d) {
      d.classList.remove('is-open');
    });
  });

  /* ---------------- Scroll-reveal intro animations ---------------- */
  var revealTargets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealTargets.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
    );
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------------- Plain-list row: match image height to first card ---------------- */
  var plainListRows = document.querySelectorAll('.plain-list-row');
  if (plainListRows.length) {
    var syncPlainListRowImageHeight = function () {
      plainListRows.forEach(function (row) {
        var firstCard = row.querySelector('.plain-list-row__col .plain-list-block');
        var image = row.querySelector('.plain-list-row__image');
        if (!firstCard || !image) return;
        if (window.innerWidth <= 900) {
          image.style.height = '';
          return;
        }
        image.style.height = firstCard.offsetHeight + 'px';
      });
    };
    syncPlainListRowImageHeight();
    window.addEventListener('load', syncPlainListRowImageHeight);
    window.addEventListener('resize', syncPlainListRowImageHeight);
  }

  /* ---------------- FAQ accordion: slide open/close ----------------
     Native <details> can't animate height, and closing it hides content
     via the UA stylesheet before a transition can run. So the details
     element is forced permanently open at the DOM level, and open/closed
     is instead tracked with .is-open while a wrapper around the answer
     animates between height:0 and its measured scrollHeight. */
  // Finishing a transition is driven by the 'transitionend' event, but that
  // event depends on the browser actually running the animation (it won't
  // fire if the tab is backgrounded/hidden mid-transition, or under some
  // reduced-motion setups). A setTimeout fallback guarantees is-animating
  // always clears, so an item can never get permanently stuck.
  function runFaqTransition(item, content, onFinish) {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      content.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      item.classList.remove('is-animating');
      onFinish();
    }
    function onEnd(e) {
      if (e.propertyName === 'height') finish();
    }
    content.addEventListener('transitionend', onEnd);
    var timer = setTimeout(finish, 400);
  }

  function closeFaqItem(item) {
    var content = item.querySelector('.faq-item__content');
    if (!item.classList.contains('is-open') || item.classList.contains('is-animating')) return;
    item.classList.add('is-animating');
    content.style.height = content.scrollHeight + 'px';
    void content.offsetHeight; // force a reflow so the browser commits the px height before flipping to 0
    item.classList.remove('is-open');
    content.style.height = '0px';
    runFaqTransition(item, content, function () {});
  }

  function openFaqItem(item, content) {
    item.classList.add('is-animating', 'is-open');
    content.style.height = content.scrollHeight + 'px';
    runFaqTransition(item, content, function () {
      if (item.classList.contains('is-open')) content.style.height = 'auto';
    });
  }

  document.querySelectorAll('.faq-item').forEach(function (item) {
    var summary = item.querySelector('summary');
    if (!summary) return;

    var content = document.createElement('div');
    content.className = 'faq-item__content';
    while (summary.nextSibling) {
      content.appendChild(summary.nextSibling);
    }
    item.appendChild(content);
    item.open = true;

    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (item.classList.contains('is-animating')) return;

      if (item.classList.contains('is-open')) {
        closeFaqItem(item);
      } else {
        // Only one answer open at a time within the same FAQ group.
        var group = item.closest('.faq-group');
        if (group) {
          group.querySelectorAll('.faq-item.is-open').forEach(function (other) {
            if (other !== item) closeFaqItem(other);
          });
        }

        openFaqItem(item, content);
      }
    });
  });

  /* ---------------- Video lightbox ---------------- */
  var trigger = document.getElementById('heroVideoTrigger');
  var lightbox = document.getElementById('videoLightbox');
  var video = document.getElementById('lightboxVideo');

  function openLightbox() {
    if (!lightbox) return;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (video) { try { video.play(); } catch (e) {} }
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (video) video.pause();
  }

  if (trigger) {
    trigger.addEventListener('click', openLightbox);
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox();
      }
    });
  }

  if (lightbox) {
    lightbox.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closeLightbox);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  /* ---------------- Philosophy: pinned split / reunite ---------------- */
  var stage = document.getElementById('philosophyStage');
  var left = document.getElementById('philosophyLeft');
  var right = document.getElementById('philosophyRight');
  var textInner = document.getElementById('philosophyTextInner');
  var closing = document.getElementById('philosophyClosing');

  var isMobileLayout = window.matchMedia('(max-width: 780px)').matches;

  if (stage && left && right && !isMobileLayout) {
    var SPLIT_DISTANCE_VW = 26; // how far each half travels at full split
    var SLIDE_VH = 70; // clears the viewport regardless of copy length
    var ticking = false;

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function clamp01(t) {
      return Math.max(0, Math.min(1, t));
    }

    // Six sequential phases, driven by one continuous progress value —
    // nothing overlaps, each finishes before the next begins:
    //   0.00 - 0.22  split-in (images part; quote/paragraph revealed behind them)
    //   0.22 - 0.34  hold, quote/paragraph fully visible
    //   0.34 - 0.50  quote/paragraph slides out on its own
    //   0.50 - 0.66  closing line slides in on its own, after the above has left
    //   0.66 - 0.82  hold, closing line fully visible
    //   0.82 - 1.00  reunite (images close back over it)
    var SPLIT_END = 0.22;
    var TEXT_EXIT_START = 0.34;
    var TEXT_EXIT_END = 0.50;
    var CLOSING_ENTER_START = 0.50;
    var CLOSING_ENTER_END = 0.66;
    var REUNITE_START = 0.82;

    function splitFractionFor(progress) {
      if (progress <= SPLIT_END) return easeInOut(progress / SPLIT_END);
      if (progress <= REUNITE_START) return 1;
      return easeInOut((1 - progress) / (1 - REUNITE_START));
    }

    function textExitFractionFor(progress) {
      if (progress <= TEXT_EXIT_START) return 0;
      if (progress <= TEXT_EXIT_END) return easeInOut((progress - TEXT_EXIT_START) / (TEXT_EXIT_END - TEXT_EXIT_START));
      return 1;
    }

    function closingEnterFractionFor(progress) {
      if (progress <= CLOSING_ENTER_START) return 0;
      if (progress <= CLOSING_ENTER_END) return easeInOut((progress - CLOSING_ENTER_START) / (CLOSING_ENTER_END - CLOSING_ENTER_START));
      return 1;
    }

    function update() {
      ticking = false;
      var rect = stage.getBoundingClientRect();
      var viewportH = window.innerHeight;
      var scrollable = rect.height - viewportH;
      var progress = scrollable > 0 ? clamp01((0 - rect.top) / scrollable) : 0;

      var split = splitFractionFor(progress);
      var offset = split * SPLIT_DISTANCE_VW;

      left.style.transform = 'translateX(-' + offset + 'vw)';
      right.style.transform = 'translateX(' + offset + 'vw)';

      if (textInner) {
        var exitT = textExitFractionFor(progress);
        textInner.style.transform = 'translateY(-' + (exitT * SLIDE_VH) + 'vh)';
      }

      if (closing) {
        var enterT = closingEnterFractionFor(progress);
        closing.style.transform = 'translateY(' + ((1 - enterT) * SLIDE_VH) + 'vh)';
      }
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* ---------------- How to Get Started: animated connector line ---------------- */
  var stepsWrap = document.getElementById('stepsWrap');
  var stepsLine = document.getElementById('stepsLine');
  var stepsLinePath = document.getElementById('stepsLinePath');
  var badges = document.querySelectorAll('[data-step-badge]');

  if (stepsWrap && stepsLine && stepsLinePath && badges.length === 3) {
    var stepsTicking = false;

    function dist(a, b) {
      return Math.hypot(b.x - a.x, b.y - a.y);
    }

    function stepsProgress(rect) {
      var vh = window.innerHeight;
      var start = vh * 0.85;
      var end = vh * 0.25;
      var p = (start - rect.top) / (start - end);
      return Math.max(0, Math.min(1, p));
    }

    // Badge positions are re-measured every frame (not cached) because the
    // step cards are also individually revealing via translateY on scroll —
    // measuring once up front would bake in their pre-reveal offset and
    // leave the line permanently misaligned once they settle.
    function stepsUpdate() {
      stepsTicking = false;
      var wrapRect = stepsWrap.getBoundingClientRect();
      var points = Array.prototype.map.call(badges, function (badge) {
        var r = badge.getBoundingClientRect();
        return {
          x: r.left + r.width / 2 - wrapRect.left,
          y: r.top + r.height / 2 - wrapRect.top
        };
      });

      stepsLine.setAttribute('viewBox', '0 0 ' + wrapRect.width + ' ' + wrapRect.height);
      stepsLine.setAttribute('preserveAspectRatio', 'none');
      stepsLinePath.setAttribute(
        'd',
        'M ' + points[0].x + ' ' + points[0].y +
        ' L ' + points[1].x + ' ' + points[1].y +
        ' L ' + points[2].x + ' ' + points[2].y
      );

      var seg0 = dist(points[0], points[1]);
      var seg1 = dist(points[1], points[2]);
      var totalLength = seg0 + seg1;
      var reachFractions = [0, totalLength ? seg0 / totalLength : 0, 1];

      stepsLinePath.style.strokeDasharray = totalLength;

      var progress = stepsProgress(wrapRect);
      stepsLinePath.style.strokeDashoffset = totalLength * (1 - progress);

      badges.forEach(function (badge, i) {
        var threshold = reachFractions[i];
        var isActive = i === 0 ? progress > 0.001 : progress >= threshold - 0.001;
        badge.classList.toggle('is-active', isActive);
      });
    }

    function onStepsScroll() {
      if (!stepsTicking) {
        window.requestAnimationFrame(stepsUpdate);
        stepsTicking = true;
      }
    }

    stepsUpdate();
    window.addEventListener('scroll', onStepsScroll, { passive: true });
    window.addEventListener('resize', onStepsScroll);
  }
})();
