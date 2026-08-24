/* Tshepo Media Network — shared behaviour */
(function () {
  "use strict";

  /* ---------------- Loader: three.js field + GSAP word build-up ------------- */
  function initLoader() {
    var loader = document.getElementById("loader");
    if (!loader) return;
    document.body.style.overflow = "hidden";

    /* three.js animated particle / waveform field */
    if (window.THREE) {
      try {
        var canvas = document.getElementById("loader-canvas");
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 16);

        var COLS = 90, ROWS = 40, positions = [], colors = [];
        for (var i = 0; i < COLS; i++) {
          for (var j = 0; j < ROWS; j++) {
            positions.push((i - COLS / 2) * 0.42, (j - ROWS / 2) * 0.42, 0);
            var t = j / ROWS;
            colors.push(0.18 + t * 0.05, 0.6 + t * 0.2, 0.85 + t * 0.15);
          }
        }
        var geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.85 }));
        scene.add(pts);

        var base = geo.attributes.position.array.slice();
        var raf, start = performance.now();
        (function animate() {
          raf = requestAnimationFrame(animate);
          var time = (performance.now() - start) / 1000;
          var arr = geo.attributes.position.array;
          for (var k = 0; k < arr.length; k += 3) {
            var x = base[k], y = base[k + 1];
            arr[k + 2] = Math.sin(x * 0.5 + time * 1.6) * 1.1 + Math.cos(y * 0.6 + time * 1.2) * 0.9;
          }
          geo.attributes.position.needsUpdate = true;
          pts.rotation.z = Math.sin(time * 0.15) * 0.08;
          renderer.render(scene, camera);
        })();

        window.addEventListener("resize", function () {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });
        loader.addEventListener("loader:done", function () { cancelAnimationFrame(raf); });
      } catch (e) { /* graceful degradation */ }
    }

    var words = loader.querySelectorAll(".loader-words span");
    var finish = function () {
      loader.dispatchEvent(new Event("loader:done"));
      loader.style.transition = "opacity .7s ease";
      loader.style.opacity = "0";
      setTimeout(function () {
        loader.remove();
        document.body.style.overflow = "";
        revealOnScroll(true);
      }, 700);
    };

    if (window.gsap) {
      var tl = gsap.timeline({ onComplete: finish });
      tl.to(".loader-logo", { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.7)" }, 0.1)
        .to(words, { opacity: 1, y: 0, rotateX: 0, duration: 0.55, stagger: 0.16, ease: "power3.out" }, 0.55)
        .to(".loader-bar i", { width: "100%", duration: 1.5, ease: "power2.inOut" }, 0.6)
        .to(".loader-inner", { scale: 1.06, opacity: 0, duration: 0.6, ease: "power2.in" }, "+=0.35");
      gsap.set(".loader-logo", { y: 20, scale: 0.9 });
      gsap.set(words, { y: 30, rotateX: -60 });
    } else {
      Array.prototype.forEach.call(words, function (w, i) {
        setTimeout(function () { w.style.transition = "opacity .5s"; w.style.opacity = 1; }, 200 + i * 150);
      });
      setTimeout(finish, 2600);
    }
  }

  /* ------------------- Velocity.js powered smooth scrolling ----------------- */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (window.jQuery && window.jQuery.Velocity) {
        window.jQuery(target).velocity("scroll", { duration: 900, easing: [0.16, 1, 0.3, 1], offset: -80 });
      } else if (window.Velocity) {
        window.Velocity(target, "scroll", { duration: 900, easing: [0.16, 1, 0.3, 1], offset: -80 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
      closeNav();
    });

    var top = document.querySelector(".to-top");
    if (top) {
      top.addEventListener("click", function () {
        if (window.jQuery && window.jQuery.Velocity) {
          window.jQuery("body").velocity("scroll", { duration: 800, easing: [0.16, 1, 0.3, 1] });
        } else { window.scrollTo({ top: 0, behavior: "smooth" }); }
      });
      window.addEventListener("scroll", function () {
        top.classList.toggle("show", window.scrollY > 500);
      });
    }
  }

  /* ------------------------------- Navigation ------------------------------ */
  function closeNav() {
    var links = document.querySelector(".nav-links");
    var burger = document.querySelector(".burger");
    if (links) links.classList.remove("open");
    if (burger) burger.classList.remove("open");
  }
  function initNav() {
    var burger = document.querySelector(".burger");
    var links = document.querySelector(".nav-links");
    if (!burger || !links) return;
    burger.addEventListener("click", function () {
      links.classList.toggle("open");
      burger.classList.toggle("open");
    });
  }

  /* --------------------------- Liquid nav blob ------------------------------
     Blob glides to the hovered/focused link, stretches along x proportional
     to travel distance, then springs back with an elastic ease. Falls back
     to the active link on mouse-leave. Disabled on the stacked mobile menu
     (see .blob-layer { display:none } under the 960px media query in CSS). */
  function initLiquidNav() {
    var nav = document.querySelector(".nav-links");
    var blob = document.querySelector(".liquid-blob");
    if (!nav || !blob || !window.gsap) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    if (!links.length) return;

    var current = nav.querySelector("a.active") || links[0];
    var mq = window.matchMedia("(max-width: 960px)");

    function moveTo(el, opts) {
      opts = opts || {};
      if (mq.matches) return; // blob layer is hidden on mobile
      var navRect = nav.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      var x = r.left - navRect.left - 10;
      var w = r.width + 20;

      var prevX = gsap.getProperty(blob, "x") || 0;
      var dist = Math.abs(x - prevX);
      var stretch = gsap.utils.clamp(1, 1.6, 1 + dist / 400);

      var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(blob, gsapExtend({ x: x, width: w, duration: 0.45 }, opts), 0)
        .to(blob, { scaleX: stretch, duration: 0.18, ease: "power1.out" }, 0)
        .to(blob, { scaleX: 1, duration: 0.35, ease: "elastic.out(1,0.5)" }, 0.18);
    }

    function gsapExtend(base, overrides) {
      var out = {}, k;
      for (k in base) out[k] = base[k];
      for (k in overrides) out[k] = overrides[k];
      return out;
    }

    gsap.set(blob, { x: 0, transformOrigin: "center" });
    var place = function () { moveTo(current, { duration: 0 }); };
    // position immediately, and re-sync once the loader removes itself
    // (layout can shift once the loader element is gone)
    requestAnimationFrame(place);
    var loaderEl = document.getElementById("loader");
    if (loaderEl) loaderEl.addEventListener("loader:done", function () {
      requestAnimationFrame(place);
    });

    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () { moveTo(a); });
      a.addEventListener("focus", function () { moveTo(a); });
    });

    nav.addEventListener("mouseleave", function () { moveTo(current); });
    window.addEventListener("resize", place);
  }

   /* ------------------------------ Ad modal ---------------------------------- */
  function initAdModal() {
    var overlay = document.getElementById("ad-modal-overlay");
    var countdownEl = document.getElementById("ad-countdown");
    var skipCountEl = document.getElementById("ad-skip-count");
    var skipBtn = document.getElementById("ad-modal-skip");
    var playerHost = document.getElementById("ad-yt-player");
    var videoWrap = playerHost ? playerHost.closest(".ad-modal-video") : null;
    if (!overlay || !skipBtn) return;

    var AD_SECONDS = 5;
    var AD_VIDEO_CANDIDATES = ["-YYtwq15KPw", "fuRmHbwp3JE", "-8UPg6hyDBg"];
    var candidateIndex = 0;
    var ytPlayer = null;
    var ytApiReady = false;
    var ytApiReadyCallbacks = [];

    window.onYouTubeIframeAPIReady = function () {
      ytApiReady = true;
      ytApiReadyCallbacks.forEach(function (cb) { cb(); });
      ytApiReadyCallbacks = [];
    };
    if (window.YT && window.YT.Player) { ytApiReady = true; }

    function whenApiReady(cb) {
      if (ytApiReady) cb();
      else ytApiReadyCallbacks.push(cb);
    }

    function showFallback() {
      var lastId = AD_VIDEO_CANDIDATES[AD_VIDEO_CANDIDATES.length - 1];
      if (videoWrap) {
        videoWrap.innerHTML =
          '<div class="ad-modal-fallback">' +
            '<p>This ad can\'t be embedded here.</p>' +
            '<a href="https://www.youtube.com/watch?v=' + lastId + '" target="_blank" rel="noopener">Watch it on YouTube</a>' +
          '</div>';
      }
    }

    function ensurePlayer(onReadyPlay) {
      if (!playerHost) return;
      if (ytPlayer) { onReadyPlay(); return; }
      whenApiReady(function () {
        ytPlayer = new YT.Player(playerHost, {
          videoId: AD_VIDEO_CANDIDATES[candidateIndex],
          playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1 },
          events: {
            onReady: function (e) {
              e.target.mute();
              onReadyPlay();
            },
            onError: function () {
              candidateIndex += 1;
              if (candidateIndex < AD_VIDEO_CANDIDATES.length) {
                ytPlayer.loadVideoById(AD_VIDEO_CANDIDATES[candidateIndex]);
                ytPlayer.mute();
                onReadyPlay();
              } else {
                showFallback();
              }
            }
          }
        });
      });
    }

    function openAd(onDone) {
      var remaining = AD_SECONDS;
      var timer = null;

      countdownEl.textContent = remaining;
      skipCountEl.textContent = remaining;
      skipBtn.disabled = true;
      skipBtn.textContent = "Continue in " + remaining + "s";
      overlay.hidden = false;
      document.body.style.overflow = "hidden";

      ensurePlayer(function () {
        if (ytPlayer && ytPlayer.seekTo) {
          ytPlayer.seekTo(0);
          ytPlayer.playVideo();

          ytPlayer.addEventListener("onStateChange", function (event) {
            if (event.data === YT.PlayerState.PLAYING && !timer) {
              timer = setInterval(function () {
                remaining -= 1;
                if (remaining <= 0) {
                  clearInterval(timer);
                  countdownEl.textContent = 0;
                  skipBtn.disabled = false;
                  skipBtn.textContent = "Continue";
                } else {
                  countdownEl.textContent = remaining;
                  skipBtn.textContent = "Continue in " + remaining + "s";
                }
              }, 1000);
            } else if (event.data === YT.PlayerState.PAUSED && timer) {
              clearInterval(timer);
              timer = null;
            }
          });
        }
      });

      if (window.gsap) {
        gsap.fromTo(".ad-modal", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.6)" });
      }

      function close() {
        if (skipBtn.disabled) return;
        overlay.hidden = true;
        document.body.style.overflow = "";
        if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
        skipBtn.removeEventListener("click", close);
        if (typeof onDone === "function") onDone();
      }
      skipBtn.addEventListener("click", close);
    }

    document.querySelectorAll(".subscribe-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        var form = btn.closest("form");
        if (form && !form.dataset.adPlayed) {
          e.preventDefault();
          var pendingSubmit = form;
          openAd(function () {
            pendingSubmit.dataset.adPlayed = "true";
            if (typeof pendingSubmit.requestSubmit === "function") {
              pendingSubmit.requestSubmit();
            } else {
              pendingSubmit.submit();
            }
          });
        } else if (!form) {
          e.preventDefault();
          openAd();
        }
      });
    });

    document.querySelectorAll("form.newsletter-form").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        if (form.dataset.adPlayed) {
          e.preventDefault();
          var input = form.querySelector("input[type=email]");
          if (input) { input.value = ""; input.placeholder = "Thanks — you're subscribed!"; }
          delete form.dataset.adPlayed;
        }
      });
    });
  }

  /* ----------------------------- Testimonials ------------------------------- */

function initTestimonials() {

  var form = document.getElementById("testimonial-form");
  var list = document.getElementById("testimonial-list");
  var loading = document.getElementById("testimonials-loading");
  var error = document.getElementById("testimonials-error");
  var status = document.getElementById("testimonial-status");
  var submitBtn = document.getElementById("testimonial-submit");

  if (!form && !list) return;


  /*
   * Change this if your API runs on another port.
   */
  var API_URL = "https://network-backend-4dbk.onrender.com/api/testimonials";


  /* ---------------- GET TESTIMONIALS ---------------- */

  function loadTestimonials() {

    if (loading) {
      loading.style.display = "block";
      loading.textContent = "Loading testimonials...";
    }

    if (error) {
      error.style.display = "none";
    }


    fetch(API_URL)
      .then(function (response) {

        if (!response.ok) {
          throw new Error(
            "Failed to load testimonials."
          );
        }

        return response.json();
      })

      .then(function (testimonials) {

        if (loading) {
          loading.style.display = "none";
        }

        renderTestimonials(testimonials);
      })

      .catch(function (err) {

        console.error(err);

        if (loading) {
          loading.style.display = "none";
        }

        if (error) {
          error.style.display = "block";
          error.textContent =
            "Unable to load testimonials. Please try again later.";
        }
      });
  }


  /* ---------------- RENDER TESTIMONIALS ---------------- */

  function renderTestimonials(testimonials) {

    if (!list) return;

    list.innerHTML = "";


    if (!testimonials || testimonials.length === 0) {

      list.innerHTML = `
        <div class="card">
          <p class="testimonial-quote">
            No testimonials yet. Be the first person to share your story!
          </p>
        </div>
      `;

      return;
    }


    testimonials.forEach(function (testimonial) {

      var card = document.createElement("article");

      card.className =
        "card testimonial-card reveal";


      var firstLetter =
        testimonial.name
          ? testimonial.name.charAt(0).toUpperCase()
          : "?";


      card.innerHTML = `

        <p class="testimonial-quote">
          ${escapeHtml(testimonial.story)}
        </p>

        <div class="testimonial-person">

          <div class="testimonial-avatar">
            ${escapeHtml(firstLetter)}
          </div>

          <div>

            <div class="testimonial-name">
              ${escapeHtml(testimonial.name)}
            </div>

            ${
              testimonial.role
                ? `
                  <div class="testimonial-role">
                    ${escapeHtml(testimonial.role)}
                  </div>
                `
                : ""
            }

          </div>

        </div>

      `;


      list.appendChild(card);

    });


    /*
     * Trigger your existing reveal animation
     * for newly-created testimonial cards.
     */
    if (window.gsap) {

      var cards =
        list.querySelectorAll(".testimonial-card");

      cards.forEach(function (card) {

        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 30
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out"
          }
        );

      });

    }

  }


  /* ---------------- HTML SAFETY ---------------- */

  function escapeHtml(value) {

    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /* ---------------- POST TESTIMONIAL ---------------- */

  if (form) {

    form.addEventListener("submit", function (e) {

      e.preventDefault();


      submitBtn.disabled = true;

      submitBtn.textContent = "Submitting...";


      if (status) {

        status.textContent =
          "Submitting your story...";

        status.className =
          "testimonial-status";

      }


      var request = {

        name:
          document.getElementById(
            "testimonial-name"
          ).value.trim(),

        role:
          document.getElementById(
            "testimonial-role"
          ).value.trim() || null,

        story:
          document.getElementById(
            "testimonial-story"
          ).value.trim()

      };


      fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(request)

      })

      .then(function (response) {

        if (!response.ok) {

          return response.json()
            .catch(function () {
              return {};
            })
            .then(function (data) {

              throw new Error(
                data.message ||
                "Failed to submit testimonial."
              );

            });

        }

        return response.json();

      })

      .then(function (newTestimonial) {

        if (status) {

          status.textContent =
            "Thank you! Your story has been added.";

          status.className =
            "testimonial-status success";

        }


        /*
         * Clear the form.
         */
        form.reset();


        /*
         * Immediately display the new testimonial.
         */
        addTestimonialToPage(
          newTestimonial
        );

      })

      .catch(function (err) {

        console.error(err);

        if (status) {

          status.textContent =
            err.message ||
            "Something went wrong. Please try again.";

          status.className =
            "testimonial-status error";

        }

      })

      .finally(function () {

        submitBtn.disabled = false;

        submitBtn.textContent =
          "Share My Story";

      });

    });

  }


  /* ---------------- ADD NEW TESTIMONIAL ---------------- */

  function addTestimonialToPage(testimonial) {

    if (!list) return;


    /*
     * Remove "no testimonials" message
     * if it exists.
     */
    var emptyMessage =
      list.querySelector(".card p.testimonial-quote");

    if (
      emptyMessage &&
      emptyMessage.textContent.includes(
        "No testimonials yet"
      )
    ) {

      list.innerHTML = "";

    }


    var card =
      document.createElement("article");

    card.className =
      "card testimonial-card";


    var firstLetter =
      testimonial.name
        ? testimonial.name.charAt(0).toUpperCase()
        : "?";


    card.innerHTML = `

      <p class="testimonial-quote">
        ${escapeHtml(testimonial.story)}
      </p>

      <div class="testimonial-person">

        <div class="testimonial-avatar">
          ${escapeHtml(firstLetter)}
        </div>

        <div>

          <div class="testimonial-name">
            ${escapeHtml(testimonial.name)}
          </div>

          ${
            testimonial.role
              ? `
                <div class="testimonial-role">
                  ${escapeHtml(testimonial.role)}
                </div>
              `
              : ""
          }

        </div>

      </div>

    `;


    /*
     * Put the newest testimonial first.
     */
    list.prepend(card);


    /*
     * Animate the newly added testimonial.
     */
    if (window.gsap) {

      gsap.fromTo(
        card,
        {
          opacity: 0,
          y: 40,
          scale: 0.96
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: "back.out(1.4)"
        }
      );

    }

  }


  /* ---------------- INITIAL LOAD ---------------- */

  loadTestimonials();

}

  /* ---------------------------- Scroll reveals ----------------------------- */
  function revealOnScroll(force) {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(els, function (el) { el.style.opacity = 1; el.style.transform = "none"; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (window.gsap) {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", delay: (el.dataset.delay || 0) / 1000 });
        } else {
          el.style.transition = "opacity .8s ease, transform .8s ease";
          el.style.opacity = 1; el.style.transform = "none";
        }
        io.unobserve(el);
      });
    }, { threshold: 0.15 });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLoader();
    initNav();
    initLiquidNav();
    initSmoothScroll();
    initAdModal();
    initTestimonials();
    if (!document.getElementById("loader")) revealOnScroll();
  });
})();