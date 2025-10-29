package com.performancetoolkit

import android.content.Context
import android.os.Build
import android.util.Log
import android.view.WindowManager
import com.performancetoolkit.NativeTurboPerformanceToolkitSpec
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.RuntimeExecutor
import com.facebook.react.turbomodule.core.interfaces.BindingsInstallerHolder
import com.facebook.react.turbomodule.core.interfaces.TurboModuleWithJSIBindings
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.performancetoolkit.PerformanceToolkitOnLoad

@Suppress("KotlinJniMissingFunction")
class PerformanceToolkitTurboModule(reactContext: ReactApplicationContext) :
  NativeTurboPerformanceToolkitSpec(reactContext), TurboModuleWithJSIBindings {

  @DoNotStrip private var hybridData: HybridData?
  private val runtimeExecutor: RuntimeExecutor

  companion object {
    private const val TAG = "PerformanceToolkitTM"
    const val NAME: String = NativeTurboPerformanceToolkitSpec.NAME

    init {
      try {
        PerformanceToolkitOnLoad.initializeNative()
      } catch (e: Exception) {
        Log.e(TAG, "Error initializing native library", e)
      }
    }
  }

  init {
    val executor = reactContext.catalystInstance?.runtimeExecutor
      ?: throw IllegalStateException("PerformanceToolkit: React Native runtime executor is not available. Please ensure New Architecture is enabled.")

    runtimeExecutor = executor
    val deviceFps = getDeviceRefreshRate(reactContext)
    
    try {
      hybridData = initHybrid(runtimeExecutor, deviceFps)
    } catch (e: Exception) {
      Log.e(TAG, "Error initializing PerformanceToolkitTurboModule", e)
      throw e
    }
  }
  
  private fun getDeviceRefreshRate(context: ReactApplicationContext): Double {
    return try {
      // Try to get display from current activity first
      val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        context.currentActivity?.display
      } else {
        null
      }
      
      // Fall back to WindowManager's default display
      val finalDisplay = display ?: run {
        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        @Suppress("DEPRECATION")
        windowManager?.defaultDisplay
      }
      
      finalDisplay?.refreshRate?.toDouble() ?: 60.0
    } catch (e: Exception) {
      Log.e(TAG, "Error getting device refresh rate, defaulting to 60", e)
      60.0
    }
  }

  override fun invalidate() {
    try {
      hybridData?.resetNative()
      hybridData = null
    } catch (e: Exception) {
      Log.e(TAG, "Error during invalidation", e)
    }
    super.invalidate()
  }

  override fun getBindingsInstaller(): BindingsInstallerHolder = getBindingsInstallerNative()

  @DoNotStrip
  private external fun initHybrid(runtimeExecutor: RuntimeExecutor, deviceRefreshRate: Double): HybridData

  @DoNotStrip
  private external fun getBindingsInstallerNative(): BindingsInstallerHolder
}

