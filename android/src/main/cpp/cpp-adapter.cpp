#include <jni.h>
#include "PerformanceToolkitOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::performancetoolkit::initialize(vm);
}
