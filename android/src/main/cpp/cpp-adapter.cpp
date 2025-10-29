#include <jni.h>
#include "PerformanceToolkitOnLoad.hpp"
#include "NativePerformanceToolkitModule.h"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  jint result = margelo::nitro::performancetoolkit::initialize(vm);
  margelo::nitro::performancetoolkit::PerformanceToolkitModule::registerNatives();
  return result;
}
