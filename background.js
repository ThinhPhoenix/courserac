// Background script for Courserac extension
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

let videoTabIds = new Set(); // Track video tabs created by extension

// Video script to inject
const videoScript = `
  (function() {
    try {
      console.log('Courserac: Video script injected');
      
      // Browser compatibility layer for injected script
      const browserAPI = (function() {
        if (typeof browser !== 'undefined') {
          return browser;
        } else if (typeof chrome !== 'undefined') {
          return chrome;
        } else {
          throw new Error('No browser API available');
        }
      })();
      
      let hasTriedPlay = false;
      let video = null;
      
      // Function to advance video to end
      const advanceToEnd = (videoElement) => {
        if (videoElement && videoElement.duration > 0) {
          const targetTime = Math.max(0, videoElement.duration - 2); // 2 seconds before end
          videoElement.currentTime = targetTime;
          console.log('Courserac: Video advanced to', targetTime, 'seconds (near end)');
          return true;
        }
        return false;
      };
      
      // Function to try playing video with multiple strategies
      const tryPlayVideo = (videoElement) => {
        if (hasTriedPlay) return;
        hasTriedPlay = true;
        
        console.log('Courserac: Attempting to play video...');
        
        // Strategy 1: Direct play
        videoElement.play().then(() => {
          console.log('Courserac: ✅ Video playing successfully');
        }).catch(error => {
          console.log('Courserac: ❌ Direct play failed:', error.message);
          
          // Strategy 2: Muted play
          console.log('Courserac: Trying muted play...');
          videoElement.muted = true;
          videoElement.play().then(() => {
            console.log('Courserac: ✅ Video playing (muted)');
            
            // Try to unmute after a delay
            setTimeout(() => {
              try {
                videoElement.muted = false;
                console.log('Courserac: Video unmuted');
              } catch (e) {
                console.log('Courserac: Could not unmute:', e.message);
              }
            }, 1000);
            
          }).catch(error2 => {
            console.log('Courserac: ❌ Muted play also failed:', error2.message);
            
            // Strategy 3: Wait for user interaction
            console.log('Courserac: Setting up user interaction listener...');
            
            const interactionEvents = ['click', 'keydown', 'mousedown', 'touchstart'];
            const playOnInteraction = () => {
              console.log('Courserac: User interaction detected, trying to play...');
              videoElement.muted = true;
              videoElement.play().then(() => {
                console.log('Courserac: ✅ Video playing after user interaction');
                setTimeout(() => {
                  videoElement.muted = false;
                }, 500);
              }).catch(e => {
                console.log('Courserac: Still failed after interaction:', e.message);
              });
              
              // Remove all listeners
              interactionEvents.forEach(event => {
                document.removeEventListener(event, playOnInteraction, true);
              });
            };
            
            // Add listeners for various interaction events
            interactionEvents.forEach(event => {
              document.addEventListener(event, playOnInteraction, true);
            });
            
            console.log('Courserac: Waiting for user interaction to play video');
          });
        });
      };
      
      // Main function to check for video
      const checkForVideo = () => {
        video = document.querySelector('video');
        if (video) {
          console.log('Courserac: Video element found');
          
          if (video.duration && video.duration > 0) {
            // Video is ready
            advanceToEnd(video);
            setTimeout(() => tryPlayVideo(video), 500);
          } else {
            // Wait for metadata to load
            console.log('Courserac: Waiting for video metadata...');
            
            const onMetadataLoaded = () => {
              console.log('Courserac: Video metadata loaded, duration:', video.duration);
              advanceToEnd(video);
              setTimeout(() => tryPlayVideo(video), 500);
              video.removeEventListener('loadedmetadata', onMetadataLoaded);
            };
            
            video.addEventListener('loadedmetadata', onMetadataLoaded);
            
            // Fallback: try after a delay anyway
            setTimeout(() => {
              if (video.duration > 0) {
                onMetadataLoaded();
              }
            }, 3000);
          }
          
          // Đăng ký sự kiện khi video kết thúc
          let closeTabSent = false;
          function sendCloseTabOnce() {
            if (closeTabSent) return;
            closeTabSent = true;
            setTimeout(() => {
              try {
                browserAPI.runtime.sendMessage({ action: 'closeThisTab' });
              } catch (e) {
                console.log('Courserac: Error sending close tab message:', e.message);
              }
            }, 3000);
          }
          video.addEventListener('ended', sendCloseTabOnce);
          // Gửi khi video gần hết (>= 98%)
          video.addEventListener('timeupdate', () => {
            if (video.duration > 0 && video.currentTime / video.duration > 0.98) {
              sendCloseTabOnce();
            }
          });
          // Fallback: sau 30s kể từ khi script chạy, nếu chưa đóng thì gửi đóng tab
          setTimeout(() => {
            sendCloseTabOnce();
          }, 30000);
        } else {
          // No video found, try again
          console.log('Courserac: No video found, retrying...');
          setTimeout(checkForVideo, 2000);
        }
      };
      
      // Start checking immediately
      checkForVideo();
      
      // Also check after DOM events
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(checkForVideo, 1000);
        });
      }
      
      // Check after window load
      window.addEventListener('load', () => {
        setTimeout(checkForVideo, 2000);
      });
      
      // Monitor for dynamic video elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
              console.log('Courserac: New video element detected');
              setTimeout(checkForVideo, 1000);
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Clean up after 30 seconds
      setTimeout(() => {
        observer.disconnect();
        console.log('Courserac: Script cleanup after 30 seconds');
      }, 30000);
      
    } catch (error) {
      console.error('Courserac video script error:', error);
    }
  })();
`;

// Listen for tab creation to track new video tabs
browserAPI.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId) {
    // This tab was opened from another tab, likely by our extension
    videoTabIds.add(tab.id);
    console.log("Courserac: New tab created:", tab.id);
  }
});

// Listen for tab updates to inject script when page loads
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    videoTabIds.has(tabId) &&
    changeInfo.status === "complete" &&
    tab.url.includes("coursera.org")
  ) {
    console.log("Courserac: Injecting script into tab:", tabId);

    // Inject the video script
    browserAPI.tabs
      .executeScript(tabId, {
        code: videoScript,
      })
      .catch((error) => {
        console.error("Courserac: Failed to inject script:", error);
      });

    // Remove from tracking after injection
    videoTabIds.delete(tabId);
  }
});

// Listen for tab removal to clean up tracking
browserAPI.tabs.onRemoved.addListener((tabId) => {
  videoTabIds.delete(tabId);
});

// Handle messages from content script
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openVideoTabs") {
    // Mark that we're about to open video tabs
    console.log("Courserac: Will open", message.urls.length, "video tabs");

    // Open each video URL in a new tab
    message.urls.forEach((url, index) => {
      setTimeout(() => {
        browserAPI.tabs
          .create({
            url: url,
            active: true, // Chuyển tab sang active khi mở
          })
          .then((tab) => {
            videoTabIds.add(tab.id);
            console.log("Courserac: Opened video tab:", tab.id, url);
          });
      }, index * 500); // Stagger tab creation
    });

    sendResponse({ success: true });
  }
  if (message.action === "closeThisTab" && sender.tab && sender.tab.id) {
    setTimeout(() => {
      browserAPI.tabs.remove(sender.tab.id);
    }, 3000);
  }
});

// Handle extension installation
browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Courserac extension installed successfully!");
  }
});
