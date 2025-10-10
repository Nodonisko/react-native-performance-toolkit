#include "HybridJsFpsTracking.hpp"
#include "RuntimeBridge.hpp"

#include <chrono>
#include <vector>
#include <algorithm>
#include <thread>
#include <atomic>
#include <mutex>

using namespace facebook;
using namespace facebook::react;

namespace margelo::nitro::performancetoolkit {

constexpr static double FRAME_INTERVAL_MS = 15.5; // Adjusted for overhead to hit ~60 FPS
constexpr static double REPORT_INTERVAL_MS = 500.0; // Report every 500ms

class JsFpsTracker : public std::enable_shared_from_this<JsFpsTracker> {
public:
  explicit JsFpsTracker(std::function<void(double)> callback, RuntimeExecutor executor)
      : _callback(std::move(callback)), 
        _executor(std::move(executor)), 
        _running(std::make_shared<std::atomic<bool>>(true)), 
        _taskPending(false) {
    // Start the tracking loop will be called after construction
  }

  void start() {
    scheduleNextFrame();
  }

  ~JsFpsTracker() {
    *_running = false;
  }

  void stop() {
    *_running = false;
  }

private:
  void scheduleNextFrame() {
    if (!*_running) return;
    
    // Check if there's already a task pending to avoid queue buildup
    bool expected = false;
    if (!_taskPending.compare_exchange_strong(expected, true)) {
      // A task is already pending, don't schedule another one
      // The already-scheduled task will handle the next frame
      return;
    }
    
    // Schedule the frame check on the JS thread
    // Capture shared_ptr to keep tracker alive and _running to check if stopped
    auto self = shared_from_this();
    auto running = _running;
    _executor([self, running](jsi::Runtime&) {
      if (!*running) {
        self->_taskPending = false;
        return;
      }
      
      const auto now = std::chrono::steady_clock::now();
      
      // Record this frame
      self->_frameTimes.push_back(now);
      
      // Remove frames older than 1 second
      auto cutoff = now - std::chrono::seconds(1);
      self->_frameTimes.erase(
        std::remove_if(self->_frameTimes.begin(), self->_frameTimes.end(),
          [cutoff](const auto& time) { return time < cutoff; }),
        self->_frameTimes.end()
      );
      
      // Check if it's time to report FPS (every 500ms)
      bool shouldReport = false;
      if (self->_lastReportTime.time_since_epoch().count() == 0) {
        // First report
        shouldReport = true;
        self->_lastReportTime = now;
      } else {
        const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - self->_lastReportTime);
        if (elapsed.count() >= REPORT_INTERVAL_MS) {
          shouldReport = true;
          self->_lastReportTime = now;
        }
      }
      
      if (shouldReport) {
        // Calculate FPS by counting frames in exactly the last 500ms
        double fps = 0.0;
        auto fpsCutoff = now - std::chrono::milliseconds(static_cast<int>(REPORT_INTERVAL_MS));
        
        // Count frames within the last 500ms window
        size_t recentFrames = std::count_if(
          self->_frameTimes.begin(),
          self->_frameTimes.end(),
          [fpsCutoff](const auto& time) { return time >= fpsCutoff; }
        );
        
        // Scale to frames per second (500ms → 1000ms = multiply by 2)
        fps = recentFrames * 2.0;
        
        // Report FPS - thread-safe callback access
        std::lock_guard<std::mutex> lock(self->_callbackMutex);
        if (self->_callback) {
          self->_callback(fps);
        }
      }
      
      // Mark task as completed and schedule the next frame
      self->_taskPending = false;
      
      // Schedule next frame check after a delay (15.5ms to hit ~60 FPS)
      // Run this in a separate thread to avoid blocking the JS thread
      std::thread([self, running]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(static_cast<int>(FRAME_INTERVAL_MS)));
        if (*running) {
          self->scheduleNextFrame();
        }
      }).detach();
    });
  }

  std::function<void(double)> _callback;
  std::mutex _callbackMutex;
  RuntimeExecutor _executor;
  std::vector<std::chrono::steady_clock::time_point> _frameTimes;
  std::chrono::steady_clock::time_point _lastReportTime{};
  std::shared_ptr<std::atomic<bool>> _running;
  std::atomic<bool> _taskPending;
};

HybridJsFpsTracking::HybridJsFpsTracking() : HybridObject(TAG) {}

HybridJsFpsTracking::~HybridJsFpsTracking() {
  stopTracking();
}

void HybridJsFpsTracking::startTracking(const std::function<void(double)>& onUpdate) {
  stopTracking();

  // Get the RuntimeExecutor from the RuntimeBridgeState singleton
  RuntimeExecutor executor = RuntimeBridgeState::get().getRuntimeExecutor();
  _tracker = std::make_shared<JsFpsTracker>(onUpdate, executor);
  // Start tracking after construction to ensure shared_from_this() is valid
  _tracker->start();
}

void HybridJsFpsTracking::stopTracking() {
  if (_tracker != nullptr) {
    _tracker->stop();
    _tracker.reset();
  }
}

} // namespace margelo::nitro::performancetoolkit

