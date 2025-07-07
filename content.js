// Courserac Content Script
// Browser compatibility layer
const browserAPI = (function() {
  if (typeof browser !== 'undefined') {
    return browser;
  } else if (typeof chrome !== 'undefined') {
    return chrome;
  } else {
    throw new Error('No browser API available');
  }
})();

class CourseracExtension {
  constructor() {
    this.bubble = null;
    this.popup = null;
    this.overlay = null;
    this.isDragging = false;
    this.hasDragged = false; // Track if user actually dragged
    this.dragOffset = { x: 0, y: 0 };
    this.dragStartPos = { x: 0, y: 0 }; // Track start position
    this.init();
  }

  init() {
    // Wait for page to load
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.createBubble();
        this.autoRunVideoScript();
      });
    } else {
      this.createBubble();
      this.autoRunVideoScript();
    }
  }

  createBubble() {
    // Create floating bubble
    this.bubble = document.createElement("div");
    this.bubble.className = "courserac-bubble";
    this.bubble.innerHTML = `
      <img src="${browserAPI.runtime.getURL("assets/icon.png")}" alt="Courserac" />
    `;

    // Add event listeners
    this.bubble.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.bubble.addEventListener("click", this.handleBubbleClick.bind(this));
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("mouseup", this.handleMouseUp.bind(this));

    // Add to page
    document.body.appendChild(this.bubble);

    // Create popup
    this.createPopup();
  }

  createPopup() {
    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "courserac-overlay";
    this.overlay.addEventListener("click", this.hidePopup.bind(this));

    // Create popup
    this.popup = document.createElement("div");
    this.popup.className = "courserac-popup";
    this.popup.innerHTML = `
      <div class="courserac-popup-header">
        <h2 class="courserac-popup-title">Courserác</h2>
        <button class="courserac-popup-close" type="button">&times;</button>
      </div>
      <div class="courserac-popup-content">
        <div class="courserac-feature" data-feature="view-all-videos">
          <div class="courserac-feature-icon">
            <svg fill="none" focusable="false" height="20" role="img" viewBox="0 0 20 20" width="20">
              <g clip-path="url(#video-icon-clip)">
                <circle cx="10" cy="10" r="10" fill="#E8EEF7"></circle>
                <path d="M8.922 12.5l3.484-2.234a.3.3 0 00.14-.266.3.3 0 00-.14-.266L8.922 7.5a.278.278 0 00-.32-.016.304.304 0 00-.165.282v4.468c0 .125.055.22.165.282.109.062.216.057.32-.016zM5 15c-.344 0-.638-.122-.883-.367a1.204 1.204 0 01-.367-.883v-7.5c0-.344.122-.638.367-.883S4.657 5 5 5h10c.344 0 .638.122.883.367s.367.54.367.883v7.5c0 .344-.122.638-.367.883A1.204 1.204 0 0115 15H5zm0-1.25h10v-7.5H5v7.5z" fill="#0f1114"></path>
              </g>
              <defs>
                <clipPath id="video-icon-clip">
                  <path fill="#fff" d="M0 0h20v20H0z"></path>
                </clipPath>
              </defs>
            </svg>
          </div>
          <div class="courserac-feature-content">
            <h3 class="courserac-feature-title">Xem video tiếp theo</h3>
            <p class="courserac-feature-description">Tìm video chưa hoàn thành đầu tiên và chuyển đến trang đó</p>
          </div>
        </div>
        <div class="courserac-feature" data-feature="view-current-video">
          <div class="courserac-feature-icon">
            <svg fill="none" focusable="false" height="20" role="img" viewBox="0 0 20 20" width="20">
              <g clip-path="url(#play-icon-clip)">
                <circle cx="10" cy="10" r="10" fill="#E8EEF7"></circle>
                <path d="M8 6.5v7l5.5-3.5L8 6.5z" fill="#0f1114"></path>
              </g>
              <defs>
                <clipPath id="play-icon-clip">
                  <path fill="#fff" d="M0 0h20v20H0z"></path>
                </clipPath>
              </defs>
            </svg>
          </div>
          <div class="courserac-feature-content">
            <h3 class="courserac-feature-title">Xem video hiện tại</h3>
            <p class="courserac-feature-description">Chạy script video trên tab hiện tại</p>
          </div>
        </div>
        <div class="courserac-feature" data-feature="coming-soon" style="opacity: 0.6; cursor: not-allowed;">
          <div class="courserac-feature-icon">🚀</div>
          <div class="courserac-feature-content">
            <h3 class="courserac-feature-title">Tính năng khác</h3>
            <p class="courserac-feature-description">Sắp ra mắt...</p>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    this.popup
      .querySelector(".courserac-popup-close")
      .addEventListener("click", this.hidePopup.bind(this));
    this.popup
      .querySelector('[data-feature="view-all-videos"]')
      .addEventListener("click", this.handleViewAllVideos.bind(this));
    this.popup
      .querySelector('[data-feature="view-current-video"]')
      .addEventListener("click", this.handleViewCurrentVideo.bind(this));

    // Add to page
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.popup);
  }

  handleMouseDown(e) {
    e.preventDefault();
    this.isDragging = true;
    this.hasDragged = false;

    // Store initial mouse position
    this.dragStartPos.x = e.clientX;
    this.dragStartPos.y = e.clientY;

    const rect = this.bubble.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
    this.bubble.style.cursor = "grabbing";
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    e.preventDefault();

    // Calculate distance from start position
    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - this.dragStartPos.x, 2) +
        Math.pow(e.clientY - this.dragStartPos.y, 2)
    );

    // If moved more than 5 pixels, consider it a drag
    if (dragDistance > 5) {
      this.hasDragged = true;
    }

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    // Keep bubble within viewport
    const maxX = window.innerWidth - this.bubble.offsetWidth;
    const maxY = window.innerHeight - this.bubble.offsetHeight;

    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));

    this.bubble.style.left = boundedX + "px";
    this.bubble.style.top = boundedY + "px";
    this.bubble.style.right = "auto";
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.bubble.style.cursor = "move";

    // Reset drag flag after a short delay to prevent click event
    setTimeout(() => {
      this.hasDragged = false;
    }, 100);
  }

  handleBubbleClick(e) {
    // Don't open popup if user just finished dragging
    if (this.hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.showPopup();
  }

  showPopup() {
    this.overlay.classList.add("show");
    this.popup.classList.add("show");
  }

  hidePopup() {
    this.overlay.classList.remove("show");
    this.popup.classList.remove("show");
  }

  async handleViewAllVideos() {
    const feature = this.popup.querySelector(
      '[data-feature="view-all-videos"]'
    );
    const originalHTML = feature.innerHTML;

    // Show loading state
    feature.innerHTML = `
      <div class="courserac-feature-icon">
        <svg fill="none" focusable="false" height="20" role="img" viewBox="0 0 20 20" width="20">
          <g clip-path="url(#video-icon-clip-loading)">
            <circle cx="10" cy="10" r="10" fill="#E8EEF7"></circle>
            <path d="M8.922 12.5l3.484-2.234a.3.3 0 00.14-.266.3.3 0 00-.14-.266L8.922 7.5a.278.278 0 00-.32-.016.304.304 0 00-.165.282v4.468c0 .125.055.22.165.282.109.062.216.057.32-.016zM5 15c-.344 0-.638-.122-.883-.367a1.204 1.204 0 01-.367-.883v-7.5c0-.344.122-.638.367-.883S4.657 5 5 5h10c.344 0 .638.122.883.367s.367.54.367.883v7.5c0 .344-.122.638-.367.883A1.204 1.204 0 0115 15H5zm0-1.25h10v-7.5H5v7.5z" fill="#0f1114"></path>
          </g>
          <defs>
            <clipPath id="video-icon-clip-loading">
              <path fill="#fff" d="M0 0h20v20H0z"></path>
            </clipPath>
          </defs>
        </svg>
      </div>
      <div class="courserac-feature-content">
        <h3 class="courserac-feature-title">Đang xử lý... <span class="courserac-loading"></span></h3>
        <p class="courserac-feature-description">Đang tìm và mở video chưa hoàn thành...</p>
      </div>
    `;

    try {
      // Find all incomplete video links
      const videoLinks = this.findVideoLinks();

      if (videoLinks.length === 0) {
        this.showMessage(
          "Không tìm thấy video chưa hoàn thành nào trong trang này."
        );
        return;
      }

      // Collect URLs
      const videoUrls = videoLinks.map((link) => link.href);

      // Send message to background script to open tabs with auto-injection
      const response = await browserAPI.runtime.sendMessage({
        action: "openVideoTabs",
        urls: videoUrls,
      });

      if (response && response.success) {
        this.showMessage(
          `Đã mở ${videoUrls.length} video chưa hoàn thành trong các tab mới! Script sẽ tự động chạy.`
        );
      } else {
        this.showMessage("Có lỗi xảy ra khi mở video tabs.");
      }
    } catch (error) {
      console.error("Error processing videos:", error);
      this.showMessage("Có lỗi xảy ra khi xử lý video.");
    } finally {
      // Restore original state
      setTimeout(() => {
        feature.innerHTML = originalHTML;
      }, 3000);
    }
  }

  async handleViewCurrentVideo() {
    const feature = this.popup.querySelector(
      '[data-feature="view-current-video"]'
    );
    const originalHTML = feature.innerHTML;

    // Show loading state
    feature.innerHTML = `
      <div class="courserac-feature-icon">
        <svg fill="none" focusable="false" height="20" role="img" viewBox="0 0 20 20" width="20">
          <g clip-path="url(#play-icon-clip-loading)">
            <circle cx="10" cy="10" r="10" fill="#E8EEF7"></circle>
            <path d="M8 6.5v7l5.5-3.5L8 6.5z" fill="#0f1114"></path>
          </g>
          <defs>
            <clipPath id="play-icon-clip-loading">
              <path fill="#fff" d="M0 0h20v20H0z"></path>
            </clipPath>
          </defs>
        </svg>
      </div>
      <div class="courserac-feature-content">
        <h3 class="courserac-feature-title">Đang xử lý... <span class="courserac-loading"></span></h3>
        <p class="courserac-feature-description">Đang chạy script video trên tab hiện tại...</p>
      </div>
    `;

    try {
      // Run the video script on the current tab
      const success = await this.runVideoScript();
      
      if (success) {
        this.showMessage("Đã chạy script video thành công!");
      } else {
        this.showMessage("Không tìm thấy video hoặc có lỗi xảy ra.");
      }
    } catch (error) {
      console.error("Error running video script:", error);
      this.showMessage("Có lỗi xảy ra khi chạy script video.");
    } finally {
      // Restore original state
      setTimeout(() => {
        feature.innerHTML = originalHTML;
      }, 3000);
    }
  }

  findVideoLinks() {
    const links = [];
    const uniqueUrls = new Set(); // Track unique URLs to avoid duplicates
    const allLinks = document.querySelectorAll("a");

    allLinks.forEach((link) => {
      // Skip links without href or with empty href
      if (!link.href || link.href === "#" || link.href === "") {
        return;
      }

      // Check if this is a video link
      const isVideoLink =
        link.textContent.toLowerCase().includes("video") ||
        link.href.includes("lecture") ||
        link.href.includes("video") ||
        link.querySelector('svg[data-testid*="video"]') ||
        link.querySelector('[data-testid*="video"]');

      if (isVideoLink) {
        // Check if this video is NOT completed
        const isCompleted = this.isVideoCompleted(link);

        if (!isCompleted) {
          // Check for duplicate URLs
          if (!uniqueUrls.has(link.href)) {
            uniqueUrls.add(link.href);
            links.push(link);
            console.log(
              "Courserac: Found incomplete video:",
              link.textContent.trim(),
              "URL:",
              link.href
            );
          } else {
            console.log(
              "Courserac: Skipping duplicate URL:",
              link.textContent.trim(),
              "URL:",
              link.href
            );
          }
        } else {
          console.log(
            "Courserac: Skipping completed video:",
            link.textContent.trim()
          );
        }
      }
    });

    console.log(`Courserac: Found ${links.length} unique incomplete videos`);
    return links;
  }

  isVideoCompleted(linkElement) {
    // Method 1: Check for completed icon SVG
    const completedIcon = linkElement.querySelector(
      'svg[data-testid="learn-item-success-icon"]'
    );
    if (completedIcon) {
      return true;
    }

    // Method 2: Check for checkmark SVG with specific path
    const checkmarkSvg = linkElement.querySelector(
      'svg path[d*="M8.938 10.875l-1.25-1.23"]'
    );
    if (checkmarkSvg) {
      return true;
    }

    // Method 3: Check for completed class names
    const completedClasses = [
      "completed",
      "done",
      "finished",
      "success",
      "check",
    ];

    for (const className of completedClasses) {
      if (
        linkElement.classList.contains(className) ||
        linkElement.querySelector(`.${className}`)
      ) {
        return true;
      }
    }

    // Method 4: Check parent elements for completion indicators
    let parent = linkElement.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      // Check for completed icon in parent
      if (
        parent.querySelector('svg[data-testid="learn-item-success-icon"]') ||
        parent.querySelector('svg[title="Completed"]')
      ) {
        return true;
      }

      // Check for completed text
      if (
        parent.textContent.toLowerCase().includes("completed") ||
        parent.textContent.toLowerCase().includes("done")
      ) {
        return true;
      }

      parent = parent.parentElement;
      depth++;
    }

    // Method 5: Check for aria-label or title attributes
    if (
      linkElement
        .getAttribute("aria-label")
        ?.toLowerCase()
        .includes("completed") ||
      linkElement.getAttribute("title")?.toLowerCase().includes("completed")
    ) {
      return true;
    }

    // Default: not completed
    return false;
  }

  showMessage(message) {
    const feature = this.popup.querySelector(
      '[data-feature="view-all-videos"] .courserac-feature-description'
    );
    const originalText = feature.textContent;
    feature.textContent = message;

    setTimeout(() => {
      feature.textContent = originalText;
    }, 3000);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Auto-run video script if on video page
  autoRunVideoScript() {
    // Only run if page is fully loaded
    const waitForPageLoad = () => {
      if (document.readyState !== "complete") {
        console.log("Courserac: Page not fully loaded, waiting...");
        setTimeout(waitForPageLoad, 1000);
        return;
      }

      console.log("Courserac: Page loaded, checking for video...");
      checkForVideo();
    };

    // Check if current page has a video element
    const checkForVideo = () => {
      const video = document.querySelector("video");
      if (video) {
        console.log(
          "Courserac: Video element found, waiting for it to be ready..."
        );

        const runScript = () => {
          try {
            // Wait for video to have duration and be ready to play
            if (video.duration && video.duration > 0 && video.readyState >= 3) {
              console.log("Courserac: Video is ready, running script...");
              video.currentTime = video.duration - 1;

              // Small delay before playing to ensure currentTime is set
              setTimeout(() => {
                video
                  .play()
                  .then(() => {
                    console.log(
                      "Courserac: ✅ Video advanced to end and playing"
                    );
                  })
                  .catch((e) => {
                    console.log("Courserac: Autoplay prevented:", e.message);
                    // Try muted play
                    video.muted = true;
                    video
                      .play()
                      .then(() => {
                        console.log("Courserac: ✅ Video playing (muted)");
                        setTimeout(() => {
                          video.muted = false;
                        }, 1000);
                      })
                      .catch((e2) => {
                        console.log(
                          "Courserac: Still blocked, user interaction needed"
                        );
                      });
                  });
              }, 500);
            } else {
              console.log(
                "Courserac: Video not ready yet (duration:",
                video.duration,
                "readyState:",
                video.readyState,
                "), waiting..."
              );
              setTimeout(runScript, 2000);
            }
          } catch (error) {
            console.error("Courserac: Error running video script:", error);
          }
        };

        // Wait for video metadata and readiness
        if (video.readyState >= 1 && video.duration > 0) {
          runScript();
        } else {
          console.log("Courserac: Waiting for video metadata...");
          video.addEventListener("loadedmetadata", () => {
            console.log("Courserac: Video metadata loaded");
            setTimeout(runScript, 1000);
          });

          video.addEventListener("canplay", () => {
            console.log("Courserac: Video can play");
            setTimeout(runScript, 500);
          });
        }
      } else {
        console.log("Courserac: No video found, retrying in 3 seconds...");
        // Try again after a longer delay
        setTimeout(checkForVideo, 3000);
      }
    };

    // Start the process
    waitForPageLoad();
  }

  // Run video script on current page and return success status
  async runVideoScript() {
    return new Promise((resolve) => {
      // Check if current page has a video element
      const video = document.querySelector("video");
      if (!video) {
        console.log("Courserac: No video found on current page");
        resolve(false);
        return;
      }

      console.log("Courserac: Video element found, processing...");

      const runScript = () => {
        try {
          // Wait for video to have duration and be ready to play
          if (video.duration && video.duration > 0 && video.readyState >= 3) {
            console.log("Courserac: Video is ready, running script...");
            video.currentTime = video.duration - 1;

            // Small delay before playing to ensure currentTime is set
            setTimeout(() => {
              video
                .play()
                .then(() => {
                  console.log("Courserac: ✅ Video advanced to end and playing");
                  resolve(true);
                })
                .catch((e) => {
                  console.log("Courserac: Autoplay prevented:", e.message);
                  // Try muted play
                  video.muted = true;
                  video
                    .play()
                    .then(() => {
                      console.log("Courserac: ✅ Video playing (muted)");
                      setTimeout(() => {
                        video.muted = false;
                      }, 1000);
                      resolve(true);
                    })
                    .catch((e2) => {
                      console.log("Courserac: Still blocked, user interaction needed");
                      resolve(false);
                    });
                });
            }, 500);
          } else {
            console.log(
              "Courserac: Video not ready yet (duration:",
              video.duration,
              "readyState:",
              video.readyState,
              "), waiting..."
            );
            setTimeout(runScript, 2000);
          }
        } catch (error) {
          console.error("Courserac: Error running video script:", error);
          resolve(false);
        }
      };

      // Wait for video metadata and readiness
      if (video.readyState >= 1 && video.duration > 0) {
        runScript();
      } else {
        console.log("Courserac: Waiting for video metadata...");
        video.addEventListener("loadedmetadata", () => {
          console.log("Courserac: Video metadata loaded");
          setTimeout(runScript, 1000);
        });

        video.addEventListener("canplay", () => {
          console.log("Courserac: Video can play");
          setTimeout(runScript, 500);
        });

        // Set a timeout to resolve as false if video doesn't load within 10 seconds
        setTimeout(() => {
          resolve(false);
        }, 10000);
      }
    });
  }
}

// Initialize extension
const courserac = new CourseracExtension();
