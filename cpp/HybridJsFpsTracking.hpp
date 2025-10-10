#pragma once

#include "HybridJsFpsTrackingSpec.hpp"
#include <memory>

namespace margelo::nitro::performancetoolkit {

// Forward declaration
class JsFpsTracker;

class HybridJsFpsTracking : public HybridJsFpsTrackingSpec {
public:
  HybridJsFpsTracking();
  ~HybridJsFpsTracking() override;

  void startTracking(const std::function<void(double)>& onUpdate) override;
  void stopTracking() override;

private:
  std::shared_ptr<JsFpsTracker> _tracker;
};

} // namespace margelo::nitro::performancetoolkit
