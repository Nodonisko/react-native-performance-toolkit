package com.performancetoolkit

import android.content.Context
import android.os.Build
import android.util.Log
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import kotlin.math.roundToInt

object DeviceUtils {
  private const val TAG = "PerformanceToolkit"
  
  fun getDeviceMaxRefreshRate(context: ReactApplicationContext): Double {
    return try {
      val display = getDisplay(context)
      
      // Get maximum refresh rate from supported modes (API 23+)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        display?.supportedModes
          ?.maxOfOrNull { it.refreshRate }
          ?.roundToInt()?.toDouble() ?: 60.0
      } else {
        // Fall back to current refresh rate on older devices
        display?.refreshRate?.roundToInt()?.toDouble() ?: 60.0
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error getting max device refresh rate, defaulting to 60", e)
      60.0
    }
  }
  
  fun getDeviceCurrentRefreshRate(context: ReactApplicationContext): Double {
    return try {
      val display = getDisplay(context)
      
      // Get current refresh rate
      display?.refreshRate?.roundToInt()?.toDouble() ?: 60.0
    } catch (e: Exception) {
      Log.e(TAG, "Error getting current device refresh rate, defaulting to 60", e)
      60.0
    }
  }
  
  private fun getDisplay(context: ReactApplicationContext): android.view.Display? {
    // Try to get display from current activity first
    val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      context.currentActivity?.display
    } else {
      null
    }
    
    // Fall back to WindowManager's default display
    return display ?: run {
      val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
      @Suppress("DEPRECATION")
      windowManager?.defaultDisplay
    }
  }
}

