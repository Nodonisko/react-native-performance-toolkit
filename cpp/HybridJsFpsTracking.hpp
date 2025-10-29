#pragma once

#include "HybridJsFpsTrackingSpec.hpp"
#include <memory>

namespace margelo::nitro::performancetoolkit {

class JsFpsTracker;

class HybridJsFpsTracking : public HybridJsFpsTrackingSpec {
public:
  HybridJsFpsTracking();
  ~HybridJsFpsTracking() override;

  std::shared_ptr<ArrayBuffer> getJsFpsBuffer() override;

private:
  std::shared_ptr<JsFpsTracker> _tracker;
  std::shared_ptr<ArrayBuffer> _fpsBuffer;
};

} // namespace margelo::nitro::performancetoolkit
