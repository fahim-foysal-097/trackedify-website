(() => {
    // Hardcoded release info
    const RELEASE_VERSION = "v1.8.0";
    const LINKS = {
        arm64: `https://github.com/fahim-foysal-097/trackedify/releases/download/${RELEASE_VERSION}/trackedify-${RELEASE_VERSION}-arm64-v8a.apk`,
        armeabi: `https://github.com/fahim-foysal-097/trackedify/releases/download/${RELEASE_VERSION}/trackedify-${RELEASE_VERSION}-armeabi-v7a.apk`,
        universal: `https://github.com/fahim-foysal-097/trackedify/releases/download/${RELEASE_VERSION}/trackedify-${RELEASE_VERSION}-universal.apk`,
    };

    // slideshow state (gallery modal)
    let galleryInterval = null;
    let galleryIndex = 0;
    let galleryImages = [];
    const SLIDE_DELAY = 3000; // 3 sec

    document.addEventListener("DOMContentLoaded", () => {
        setCurrentYear();
        setReleaseInfo();
        initButtons();
        setupGalleryLightbox();
        initSmoothScroll();
        animateSections();
        initPageTransitions();
    });

    function setCurrentYear() {
        const el = document.getElementById("curYear");
        if (el) el.textContent = new Date().getFullYear();
    }

    function setReleaseInfo() {
        const el = document.getElementById("release-info");
        if (el) el.textContent = RELEASE_VERSION;
    }

    /* ---------- DOWNLOAD BUTTONS ---------- */
    function initButtons() {
        const mapping = [
            { id: "btn-arm64", key: "arm64" },
            { id: "btn-armeabi", key: "armeabi" },
            { id: "btn-universal", key: "universal" },
        ];

        mapping.forEach(({ id, key }) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            btn.target = "_self";
            btn.href = LINKS[key];

            btn.addEventListener(
                "click",
                async (e) => {
                    // allow modifier clicks
                    if (
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.altKey ||
                        e.button === 1
                    )
                        return;
                    e.preventDefault();

                    const url = LINKS[key];
                    if (!url) {
                        flashButtonError(btn, "Not available");
                        return;
                    }
                    await downloadApk(url, btn);
                },
                { passive: false }
            );
        });
    }

    function flashButtonError(btn, message = "Error") {
        const prev = btn.textContent;
        btn.textContent = message;
        btn.classList.add("disabled");
        setTimeout(() => {
            btn.textContent = prev;
            btn.classList.remove("disabled");
        }, 2500);
    }

    function setButtonLoading(btn, loadingText = "Downloading…") {
        btn.dataset._prevText = btn.textContent;
        btn.textContent = loadingText;
        btn.classList.add("disabled");
    }

    function resetButton(btn) {
        if (btn.dataset._prevText) {
            btn.textContent = btn.dataset._prevText;
            delete btn.dataset._prevText;
        }
        btn.classList.remove("disabled");
    }

    async function downloadApk(url, btn) {
        setButtonLoading(btn);

        try {
            const resp = await fetch(url, {
                method: "GET",
                mode: "cors",
                cache: "no-cache",
            });

            if (!resp.ok) {
                // fallback navigation (same tab)
                window.location.href = url;
                return;
            }

            const blob = await resp.blob();
            const filename = deriveFilenameFromUrl(url) || "trackedify.apk";
            const blobUrl = URL.createObjectURL(blob);
            triggerDownload(blobUrl, filename);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

            btn.textContent = "Done ✓";
            setTimeout(() => resetButton(btn), 1200);
        } catch (err) {
            console.warn("Download error:", err);
            // fallback to navigation so user can still download via browser
            window.location.href = url;
        }
    }

    function deriveFilenameFromUrl(url) {
        try {
            const u = new URL(url);
            const parts = u.pathname.split("/");
            return parts.pop() || parts.pop();
        } catch (e) {}
        return null;
    }

    function triggerDownload(objectUrl, filename) {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename || "download";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    /* ---------- GALLERY SLIDESHOW & FULL-PAGE BLUR ---------- */
    function setupGalleryLightbox() {
        const modalEl = document.getElementById("screenshotModal");
        const modalImage = document.getElementById("modalImage");
        const siteRoot = document.getElementById("site-root");
        if (!modalEl || !modalImage) return;

        // build gallery image list from gallery-card elements
        const cards = Array.from(document.querySelectorAll(".gallery-card"));
        galleryImages = cards
            .map((c) => c.getAttribute("data-full"))
            .filter(Boolean);

        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl, {
            backdrop: true,
            keyboard: true,
        });

        const showImageAt = (idx) => {
            if (!galleryImages.length) return;
            galleryIndex =
                ((idx % galleryImages.length) + galleryImages.length) %
                galleryImages.length;
            const next = galleryImages[galleryIndex];

            // crossfade
            modalImage.classList.remove("visible");
            setTimeout(() => {
                modalImage.src = next;
                modalImage.onload = () =>
                    requestAnimationFrame(() =>
                        modalImage.classList.add("visible")
                    );
            }, 180);
        };

        const startGallery = (startIdx = 0) => {
            stopGallery();
            showImageAt(startIdx);
            galleryInterval = setInterval(() => {
                galleryIndex = (galleryIndex + 1) % galleryImages.length;
                showImageAt(galleryIndex);
            }, SLIDE_DELAY);
        };

        const stopGallery = () => {
            if (galleryInterval) {
                clearInterval(galleryInterval);
                galleryInterval = null;
            }
        };

        // clicking a card opens modal and starts slideshow from that index
        cards.forEach((card, idx) => {
            card.addEventListener("click", (e) => {
                e.preventDefault();
                if (!galleryImages.length) return;
                startGallery(idx);
                if (siteRoot) siteRoot.classList.add("blurred");
                bsModal.show();
            });
            card.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    card.click();
                }
            });
        });

        // close when clicked
        modalEl.addEventListener("click", () => bsModal.hide());

        // cleanup on hide
        modalEl.addEventListener("hidden.bs.modal", () => {
            stopGallery();
            modalImage.src = "";
            modalImage.classList.remove("visible");
            if (siteRoot) siteRoot.classList.remove("blurred");
        });

        modalEl.addEventListener("shown.bs.modal", () => {
            requestAnimationFrame(() => modalImage.classList.add("visible"));
        });
    }

    /* ---------- SMOOTH SCROLL & SECTION REVEAL ---------- */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener("click", function (e) {
                const target = document.querySelector(
                    this.getAttribute("href")
                );
                if (!target) return;
                e.preventDefault();
                window.scrollTo({
                    top: target.offsetTop - 50,
                    behavior: "smooth",
                });
            });
        });
    }

    function animateSections() {
        const sections = document.querySelectorAll(
            "section, .hero, .container"
        );
        sections.forEach((sec) => {
            sec.style.opacity = 0;
            sec.style.transform = "translateY(18px)";
            sec.style.transition = "opacity 0.45s ease, transform 0.45s ease";
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = 1;
                        entry.target.style.transform = "translateY(0)";
                    }
                });
            },
            { threshold: 0.15 }
        );

        sections.forEach((s) => observer.observe(s));
    }

    /* ---------- PAGE TRANSITIONS ---------- */
    function initPageTransitions() {
        document.body.classList.add("fade-in");

        document.querySelectorAll("a[href]").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;

            // ignore anchors, external, mailto, and apk links
            if (
                href.startsWith("#") ||
                href.startsWith("http") ||
                href.startsWith("mailto:") ||
                href.endsWith(".apk")
            )
                return;

            link.addEventListener("click", (e) => {
                if (
                    e.metaKey ||
                    e.ctrlKey ||
                    e.shiftKey ||
                    e.altKey ||
                    e.button === 1
                )
                    return;
                const url = link.href;
                if (!url) return;
                e.preventDefault();
                document.body.classList.remove("fade-in");
                document.body.classList.add("fade-out");
                setTimeout(() => (window.location.href = url), 200);
            });
        });
    }
})();
