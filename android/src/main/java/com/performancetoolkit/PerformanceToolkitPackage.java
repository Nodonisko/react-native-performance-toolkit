package com.performancetoolkit;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.uimanager.ViewManager;
import com.margelo.nitro.performancetoolkit.PerformanceToolkitOnLoad;
import com.margelo.nitro.performancetoolkit.views.HybridFpsCounterViewManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class PerformanceToolkitPackage extends TurboReactPackage {
  @Nullable
  @Override
  public NativeModule getModule(@NonNull String name, @NonNull ReactApplicationContext reactContext) {
    if (PerformanceToolkitTurboModule.NAME.equals(name)) {
      return new PerformanceToolkitTurboModule(reactContext);
    }
    return null;
  }

  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
    List<ViewManager> viewManagers = new ArrayList<>();
    viewManagers.add(new HybridFpsCounterViewManager());
    return viewManagers;
  }

  @NonNull
  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return () -> {
      HashMap<String, ReactModuleInfo> modules = new HashMap<>();
      modules.put(
        PerformanceToolkitTurboModule.NAME,
        new ReactModuleInfo(
          PerformanceToolkitTurboModule.NAME,
          PerformanceToolkitTurboModule.class.getName(),
          false,
          true,
          false,
          false,
          true
        )
      );
      return modules;
    };
  }

  static {
    PerformanceToolkitOnLoad.initializeNative();
  }
}
