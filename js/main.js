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
  var textInner = document.querySelector('.philosophy__text-inner');

  var isMobileLayout = window.matchMedia('(max-width: 780px)').matches;

  if (stage && left && right && !isMobileLayout) {
    var SPLIT_DISTANCE_VW = 26; // how far each half travels at full split
    var TEXT_EXIT_SLIDE_VH = 70; // how far the text slides as it exits — enough to clear the viewport regardless of copy length
    var ticking = false;

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    // Three sequential phases, driven by one continuous progress value:
    //   0 - 0.5   split-in (images part, text is simply revealed behind them)
    //   0.5 - 0.75 held fully split while the text slides out on its own
    //   0.75 - 1  reunite (images close back over the now-empty gap)
    // Nothing is simultaneous: the text finishes leaving before the
    // images start closing again.
    var TEXT_EXIT_END = 0.75;

    function splitFractionFor(progress) {
      if (progress <= 0.5) return easeInOut(progress / 0.5);
      if (progress <= TEXT_EXIT_END) return 1;
      return easeInOut((1 - progress) / (1 - TEXT_EXIT_END));
    }

    function textExitFractionFor(progress) {
      if (progress <= 0.5) return 0;
      if (progress <= TEXT_EXIT_END) return easeInOut((progress - 0.5) / (TEXT_EXIT_END - 0.5));
      return 1;
    }

    function update() {
      ticking = false;
      var rect = stage.getBoundingClientRect();
      var viewportH = window.innerHeight;
      var scrollable = rect.height - viewportH;
      var progress = scrollable > 0 ? (0 - rect.top) / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));

      var split = splitFractionFor(progress);
      var offset = split * SPLIT_DISTANCE_VW;

      left.style.transform = 'translateX(-' + offset + 'vw)';
      right.style.transform = 'translateX(' + offset + 'vw)';

      if (textInner) {
        var exitT = textExitFractionFor(progress);
        textInner.style.transform = 'translateY(-' + (exitT * TEXT_EXIT_SLIDE_VH) + 'vh)';
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
