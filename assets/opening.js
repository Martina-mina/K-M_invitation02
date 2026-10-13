/* Standalone opening flow for the Kerolos & Mirna invitation.
   Replace the old script.js reference with this file; do not load both. */
(function () {
  "use strict";

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  onReady(function () {
    if (window.__inviteOpeningScriptLoaded) return;
    window.__inviteOpeningScriptLoaded = true;

    var body = document.body;
    var intro = document.querySelector(".lb-intro");
    var playButton = intro && intro.querySelector("[data-intro-play]");
    var envelopeVideo = intro && intro.querySelector("[data-intro-video]");
    var preloader = document.getElementById("preloader");
    var originalOverflow = body.style.overflow;
    var alreadyOpen = !!(intro && intro.classList.contains("is-open"));

    if (preloader) {
      preloader.hidden = true;
      preloader.style.display = "none";
      preloader.setAttribute("aria-hidden", "true");
    }

    if (intro) {
      /* Clear the stale flag left by a previously initialized page. */
      intro.removeAttribute("data-lb-bound");
      if (!alreadyOpen) body.style.overflow = "hidden";
    }

    function readConfig(id) {
      var node = document.getElementById(id);
      if (!node) return null;
      try {
        return JSON.parse(node.textContent || "{}");
      } catch (error) {
        return null;
      }
    }

    var musicConfig = readConfig("invite-music") || {};
    var scrollConfig = readConfig("invite-scroll") || {};
    var musicButton = document.querySelector(".lb-music");
    var audio = null;
    var musicRetryArmed = false;
    var musicStarted = false;

    function setMusicButton(playing) {
      if (!musicButton) return;
      musicButton.classList.toggle("is-playing", playing);
      musicButton.textContent = playing ? "❚❚" : "♪";
      musicButton.setAttribute(
        "aria-label",
        playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى"
      );
    }

    function removeMusicRetry() {
      ["pointerdown", "touchstart", "keydown"].forEach(function (eventName) {
        document.removeEventListener(eventName, retryMusic, true);
      });
      musicRetryArmed = false;
    }

    function retryMusic() {
      removeMusicRetry();
      if (audio && audio.paused) playMusic();
    }

    function armMusicRetry() {
      if (musicRetryArmed) return;
      musicRetryArmed = true;
      window.setTimeout(function () {
        ["pointerdown", "touchstart", "keydown"].forEach(function (eventName) {
          document.addEventListener(eventName, retryMusic, {
            once: true,
            capture: true,
            passive: true
          });
        });
      }, 0);
    }

    function playMusic() {
      if (!audio) return;
      var result;
      try {
        result = audio.play();
      } catch (error) {
        setMusicButton(false);
        armMusicRetry();
        return;
      }

      if (result && typeof result.then === "function") {
        result.then(function () {
          musicStarted = true;
          setMusicButton(true);
          removeMusicRetry();
        }).catch(function () {
          setMusicButton(false);
          armMusicRetry();
        });
      } else {
        musicStarted = true;
        setMusicButton(true);
      }
    }

    function pauseMusic() {
      if (!audio) return;
      audio.pause();
      setMusicButton(false);
    }

    function initMusic() {
      var url = musicConfig.url;
      if (!url || musicConfig.player === "hidden") {
        if (musicButton) musicButton.hidden = true;
        return;
      }

      try {
        audio = new Audio(new URL(url, document.baseURI).href);
      } catch (error) {
        if (musicButton) musicButton.hidden = true;
        return;
      }

      audio.loop = musicConfig.loop !== false;
      audio.preload = "none";
      audio.addEventListener("play", function () { setMusicButton(true); });
      audio.addEventListener("pause", function () { setMusicButton(false); });

      if (!musicButton) {
        musicButton = document.createElement("button");
        musicButton.type = "button";
        musicButton.className = "lb-music";
        musicButton.textContent = "♪";
        body.appendChild(musicButton);
      }

      musicButton.hidden = false;
      setMusicButton(false);
      musicButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (audio.paused) playMusic();
        else pauseMusic();
      });
    }

    var scrollButton = document.querySelector(".lb-autoscroll");
    var scrollRunning = false;
    var scrollStoppedByUser = false;
    var scrollFrame = 0;
    var scrollTimer = 0;
    var previousFrameTime = 0;
    var fractionalPixels = 0;
    var scrollSpeed = { slow: 18, normal: 34, fast: 60 }[
      scrollConfig.speed
    ] || 34;

    function makeScrollButton() {
      if (scrollButton) return;
      scrollButton = document.createElement("button");
      scrollButton.type = "button";
      scrollButton.className = "lb-autoscroll is-paused";
      scrollButton.hidden = true;
      scrollButton.setAttribute("aria-label", "تشغيل التمرير التلقائي");
      scrollButton.innerHTML =
        '<svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"></path></svg>' +
        '<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M8 5.2v13.6L19 12 8 5.2Z"></path></svg>';
      body.appendChild(scrollButton);
    }

    function setScrollButton(playing) {
      if (!scrollButton) return;
      scrollButton.hidden = false;
      scrollButton.classList.toggle("is-paused", !playing);
      scrollButton.setAttribute(
        "aria-label",
        playing ? "إيقاف التمرير التلقائي" : "تشغيل التمرير التلقائي"
      );
    }

    function cancelScroll() {
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
        scrollTimer = 0;
      }
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
        scrollFrame = 0;
      }
      scrollRunning = false;
      previousFrameTime = 0;
      if (scrollButton) setScrollButton(false);
    }

    function isAtBottom() {
      var page = document.scrollingElement || document.documentElement;
      return page.scrollTop + window.innerHeight >= page.scrollHeight - 2;
    }

    function scrollStep(now) {
      if (!scrollRunning) return;
      if (!previousFrameTime) previousFrameTime = now;

      var elapsed = Math.min(now - previousFrameTime, 100);
      previousFrameTime = now;
      fractionalPixels += (scrollSpeed * elapsed) / 1000;

      var pixels = Math.floor(fractionalPixels);
      if (pixels > 0) {
        fractionalPixels -= pixels;
        window.scrollBy(0, pixels);
      }

      if (isAtBottom()) {
        if (scrollConfig.loop) {
          window.scrollTo(0, 0);
          fractionalPixels = 0;
        } else {
          cancelScroll();
          return;
        }
      }

      scrollFrame = window.requestAnimationFrame(scrollStep);
    }

    function startScroll(manualStart) {
      if (!scrollConfig.enabled || scrollRunning) return;
      if (manualStart) scrollStoppedByUser = false;
      if (scrollStoppedByUser) return;
      if (window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (isAtBottom()) return;

      scrollRunning = true;
      fractionalPixels = 0;
      previousFrameTime = 0;
      setScrollButton(true);
      scrollFrame = window.requestAnimationFrame(scrollStep);
    }

    function stopScrollForUser(event) {
      var target = event && event.target;
      if (target && target.closest &&
          target.closest(".lb-music, .lb-autoscroll, [data-intro-play]")) return;
      scrollStoppedByUser = true;
      cancelScroll();
    }

    function scheduleScroll() {
      if (!scrollConfig.enabled) return;
      makeScrollButton();
      if (scrollButton.dataset.openingBound !== "1") {
        scrollButton.dataset.openingBound = "1";
        scrollButton.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (scrollRunning) {
            scrollStoppedByUser = true;
            cancelScroll();
          } else {
            startScroll(true);
          }
        });
      }

      ["wheel", "touchstart", "pointerdown", "keydown"].forEach(function (eventName) {
        window.addEventListener(eventName, stopScrollForUser, {
          passive: true,
          capture: true
        });
      });

      if (scrollTimer) window.clearTimeout(scrollTimer);
      var delay = Math.max(0, Number(scrollConfig.delay) || 0) * 1000;
      scrollTimer = window.setTimeout(function () {
        scrollTimer = 0;
        startScroll(false);
      }, delay);
    }

    function revealPageContent() {
      var items = document.querySelectorAll(".lb-anim, .fade-up");
      if (!items.length) return;

      if (!("IntersectionObserver" in window) ||
          (window.matchMedia &&
           window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
        Array.prototype.forEach.call(items, function (item) {
          item.classList.add("is-in", "in-view");
        });
        return;
      }

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in", "in-view");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

      Array.prototype.forEach.call(items, function (item) {
        observer.observe(item);
      });
    }

    var openingStarted = false;
    var inviteOpened = alreadyOpen || !intro;
    var openTimer = 0;
    var videoFailed = false;

    function finishOpening() {
      if (inviteOpened) return;
      inviteOpened = true;
      if (openTimer) {
        window.clearTimeout(openTimer);
        openTimer = 0;
      }
      if (envelopeVideo) {
        try { envelopeVideo.pause(); } catch (error) {}
      }

      intro.classList.remove("is-awaiting-play", "is-playing", "is-video-blocked");
      intro.classList.add("is-open");
      intro.style.pointerEvents = "none";
      body.style.overflow = originalOverflow;

      /* Start sound on the tap when possible; if the intro has sound, start
         the music after it finishes to avoid two audio tracks at once. */
      if (musicConfig.autoplay && !musicStarted) playMusic();

      revealPageContent();
      document.dispatchEvent(new CustomEvent("lb:intro-open"));
      window.setTimeout(function () {
        if (intro && intro.parentNode) intro.remove();
      }, 850);
      scheduleScroll();
    }

    function setOpeningFallback() {
      if (openTimer) window.clearTimeout(openTimer);
      var duration = envelopeVideo && Number(envelopeVideo.duration);
      var delay;

      if (duration && isFinite(duration) && duration > 0) {
        delay = duration * 1000 + 1800;
      } else {
        var configuredSeconds = Number(intro && intro.getAttribute("data-intro-auto")) || 3;
        delay = Math.max(5000, configuredSeconds * 1000 + 2000);
      }

      delay = Math.min(Math.max(delay, 3000), 45000);
      openTimer = window.setTimeout(finishOpening, delay);
    }

    function beginOpening(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (!intro || openingStarted || inviteOpened) return;
      openingStarted = true;

      intro.classList.add("is-playing");
      intro.classList.remove("is-awaiting-play");

      var introHasSound = envelopeVideo &&
        envelopeVideo.getAttribute("data-intro-audio") === "sound";
      if (musicConfig.autoplay && !introHasSound) playMusic();

      if (!envelopeVideo || videoFailed || envelopeVideo.error) {
        intro.classList.add("is-video-blocked");
        openTimer = window.setTimeout(finishOpening, 900);
        return;
      }

      envelopeVideo.muted = !introHasSound;
      envelopeVideo.playsInline = true;
      try {
        envelopeVideo.currentTime = 0;
      } catch (error) {}

      setOpeningFallback();
      var result;
      try {
        result = envelopeVideo.play();
      } catch (error) {
        result = null;
      }

      if (result && typeof result.catch === "function") {
        result.catch(function () {
          /* If mobile Safari blocks the first attempt, retry muted once. */
          envelopeVideo.muted = true;
          intro.classList.add("is-video-blocked");
          var retry;
          try { retry = envelopeVideo.play(); } catch (error) {}
          if (retry && typeof retry.catch === "function") {
            retry.catch(function () {
              if (openTimer) window.clearTimeout(openTimer);
              openTimer = window.setTimeout(finishOpening, 900);
            });
          }
        });
      }
    }

    initMusic();

    if (envelopeVideo) {
      envelopeVideo.addEventListener("ended", finishOpening);
      envelopeVideo.addEventListener("error", function () {
        videoFailed = true;
        if (openingStarted && !inviteOpened) {
          if (openTimer) window.clearTimeout(openTimer);
          openTimer = window.setTimeout(finishOpening, 500);
        }
      });
      envelopeVideo.addEventListener("loadedmetadata", function () {
        if (openingStarted && !inviteOpened) setOpeningFallback();
      });
    }

    if (playButton) {
      playButton.addEventListener("click", beginOpening);
    }
    if (intro) {
      intro.addEventListener("click", function (event) {
        if (event.target.closest && event.target.closest("[data-intro-play]")) return;
        beginOpening(event);
      });
    }

    if (inviteOpened) {
      body.style.overflow = originalOverflow;
      revealPageContent();
      if (musicConfig.autoplay) playMusic();
      scheduleScroll();
    }
  });
})();
