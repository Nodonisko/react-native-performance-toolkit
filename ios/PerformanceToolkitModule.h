#pragma once

#ifdef RCT_NEW_ARCH_ENABLED

#import <React/RCTEventEmitter.h>
#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>

#import "PerformanceToolkit/PerformanceToolkit.h"

@interface PerformanceToolkitModule : RCTEventEmitter <NativeTurboPerformanceToolkitSpec>
@end

@interface PerformanceToolkitModule () <RCTTurboModuleWithJSIBindings>
@end

#endif


