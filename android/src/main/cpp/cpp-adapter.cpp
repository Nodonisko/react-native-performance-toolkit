#include <jni.h>
#include "PerformanceToolkitOnLoad.hpp"
#include "RuntimeBridge.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  // First, initialize Nitro modules
  jint result = margelo::nitro::performancetoolkit::initialize(vm);
  
  // Then register our custom JNI natives
  margelo::nitro::performancetoolkit::RuntimeBridge::registerNatives();
  
  return result;
}
