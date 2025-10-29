#include "HybridJsFpsTracking.hpp"
#include "RuntimeBridge.hpp"

#include <chrono>
#include <vector>
#include <algorithm>
#include <thread>
#include <atomic>
#include <mutex>
#include <iterator>

using namespace facebook;
using namespace facebook::react;

namespace margelo::nitro::performancetoolkit {

constexpr static double FPS_WINDOW_MS = 1000.0; // Sliding window for FPS calculation (1 second)
constexpr static double BUFFER_UPDATE_INTERVAL_MS = FPS_WINDOW_MS; // Must be same as FPS_WINDOW_MS otherwise the FPS calculation will be incorrect

class JsFpsTracker : public std::enable_shared_from_this<JsFpsTracker> {
public:
  explicit JsFpsTracker(
      std::function<void(int32_t)> writer,
      RuntimeExecutor executor)
      : _writer(std::move(writer)),
        _executor(std::move(executor)),
        _framesInWindow(0),
        _lastJsTickNs(0),
        _running(true),
        _taskPending(false) {}

  void start() {
    startFramePacingLoop(); // High-frequency frame counting
    startReportingLoop(); // Low-frequency FPS reporting
  }

  ~JsFpsTracker() {
    stop();
  }

  void stop() {
    _running = false;
    stopFramePacingLoop();
    stopReportingLoop();
  }

private:
  void startFramePacingLoop() {
    if (_framePacingThread.joinable()) {
      return;
    }

    auto self = shared_from_this();
    // Get frame interval dynamically based on device refresh rate
    const double frameIntervalMs = RuntimeBridgeState::get().getFrameIntervalMs();
    const auto frameInterval = std::chrono::duration_cast<std::chrono::steady_clock::duration>(
      std::chrono::duration<double, std::milli>(frameIntervalMs)
    );

    _framePacingThread = std::thread([self, frameInterval]() {
      auto nextWake = std::chrono::steady_clock::now();
      while (self->_running.load()) {
        nextWake += frameInterval;
        std::this_thread::sleep_until(nextWake);

        if (!self->_running.load()) {
          break;
        }

        // ONLY post a task to JS - no calculations here
        self->scheduleNextFrame();
      }
    });
  }

  void stopFramePacingLoop() {
    if (_framePacingThread.joinable()) {
      auto framePacingThread = std::move(_framePacingThread);
      if (framePacingThread.get_id() == std::this_thread::get_id()) {
        framePacingThread.detach();
      } else {
        framePacingThread.join();
      }
    }
  }

  void startReportingLoop() {
    if (_reportingThread.joinable()) {
      return;
    }

    auto self = shared_from_this();
    // Reporting thread wakes up only at BUFFER_UPDATE_INTERVAL_MS (1 second)
    const auto reportInterval = std::chrono::duration_cast<std::chrono::steady_clock::duration>(
      std::chrono::duration<double, std::milli>(BUFFER_UPDATE_INTERVAL_MS)
    );

    _reportingThread = std::thread([self, reportInterval]() {
      // Initialize lastReportTime
      auto lastReportTime = std::chrono::steady_clock::now();
      
      while (self->_running.load()) {
        // Sleep for the full report interval (1 second)
        std::this_thread::sleep_for(reportInterval);

        if (!self->_running.load()) {
          break;
        }

        // Calculate FPS based on accumulated frame count
        const auto now = std::chrono::steady_clock::now();
        const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastReportTime);
        const double windowMs = static_cast<double>(elapsed.count());
        
        // Read and reset frame counter
        const uint32_t frames = self->_framesInWindow.exchange(0);

        // Detect JS stall based on last tick timestamp
        const long long lastTickNs = self->_lastJsTickNs.load();
        const auto nowNs = std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch()).count();
        bool jsStalled = (lastTickNs == 0) || ((nowNs - lastTickNs) >= static_cast<long long>(FPS_WINDOW_MS * 1'000'000.0));

        double fps = 0.0;
        if (frames > 0 && windowMs > 0) {
          fps = (frames * 1000.0) / windowMs;
        } else if (jsStalled) {
          fps = 0.0;
        }

        double deviceMaxFps = RuntimeBridgeState::get().getDeviceRefreshRate();
        double cappedFps = std::min(std::round(fps), deviceMaxFps);

        // Write to native buffer as Int32 (not on JS thread)
        if (self->_writer) {
          self->_writer(static_cast<int32_t>(cappedFps));
        }
        
        // Update lastReportTime for next iteration
        lastReportTime = now;
      }
    });
  }

  void stopReportingLoop() {
    if (_reportingThread.joinable()) {
      auto reportingThread = std::move(_reportingThread);
      if (reportingThread.get_id() == std::this_thread::get_id()) {
        reportingThread.detach();
      } else {
        reportingThread.join();
      }
    }
  }

  void scheduleNextFrame() {
    if (!_running.load()) {
      return;
    }
    
    // Check if there's already a task pending to avoid queue buildup
    bool expected = false;
    if (!_taskPending.compare_exchange_strong(expected, true)) {
      return;
    }
    
    // Capture shared_ptr to keep tracker alive
    auto self = shared_from_this();
    _executor([self](jsi::Runtime&) {
      if (!self->_running.load()) {
        self->_taskPending = false;
        return;
      }
      
      // Record a JS tick and increment frame counter only
      const auto now = std::chrono::steady_clock::now();
      const auto nowNs = std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch()).count();
      self->_lastJsTickNs.store(nowNs);
      self->_framesInWindow.fetch_add(1);
      self->_taskPending = false;
    });
  }

  std::function<void(int32_t)> _writer;
  RuntimeExecutor _executor;
  std::atomic<uint32_t> _framesInWindow;
  std::atomic<long long> _lastJsTickNs;
  std::atomic<bool> _running;
  std::atomic<bool> _taskPending;
  std::thread _framePacingThread;
  std::thread _reportingThread;
};

HybridJsFpsTracking::HybridJsFpsTracking() : HybridObject(TAG) {}

HybridJsFpsTracking::~HybridJsFpsTracking() {
  if (_tracker != nullptr) {
    _tracker->stop();
    _tracker.reset();
  }
}

std::shared_ptr<ArrayBuffer> HybridJsFpsTracking::getJsFpsBuffer() {
  // Allocate buffer if needed (owning, 4 bytes for one Int32 FPS value)
  if (_fpsBuffer == nullptr) {
    _fpsBuffer = ArrayBuffer::allocate(sizeof(int32_t));
    auto* bytes = _fpsBuffer->data();
    auto* ptr = reinterpret_cast<int32_t*>(bytes);
    *ptr = 0;
  }

  // Ensure a tracker is running so the buffer gets updated; if runtime not ready, just return buffer with 0s
  if (_tracker == nullptr) {
    try {
      RuntimeExecutor executor = RuntimeBridgeState::get().getRuntimeExecutor();
      // Writer to update the buffer
      auto writer = [this](int32_t fpsInt) {
        if (this->_fpsBuffer) {
          auto* bytes = this->_fpsBuffer->data();
          auto* ptr = reinterpret_cast<int32_t*>(bytes);
          *ptr = fpsInt;
        }
      };
      _tracker = std::make_shared<JsFpsTracker>(writer, executor);
      _tracker->start();
    } catch (const std::runtime_error&) {
      printf("RuntimeExecutor not ready yet; return buffer initialized to 0 and try again on next call\n");
    }
  }

  return _fpsBuffer;
}

} // namespace margelo::nitro::performancetoolkit

