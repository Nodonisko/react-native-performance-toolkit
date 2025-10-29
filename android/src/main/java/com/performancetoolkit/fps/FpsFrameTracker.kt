/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.performancetoolkit.fps

import android.content.Context
import android.os.Build
import android.util.Log
import android.view.Display
import android.view.WindowManager
import android.view.Choreographer
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import kotlin.math.max
import kotlin.math.min

internal class FpsFrameTracker(private val reactContext: ReactContext) :
  Choreographer.FrameCallback {

  private var choreographer: Choreographer? = null
  private var firstFrameTime: Long = -1
  private var lastFrameTime: Long = -1
  private var frameCallbackCount = 0
  private var expectedFramesPrev = 0
  private var stutters = 0
  private var targetFps = DEFAULT_FPS
  private val maxDeviceFps: Double by lazy { getDeviceMaxFps() }

  override fun doFrame(frameTimeNanos: Long) {
    if (firstFrameTime == -1L) {
      firstFrameTime = frameTimeNanos
    }

    val lastFrameStartTime = lastFrameTime
    lastFrameTime = frameTimeNanos

    frameCallbackCount++
    if (frameCallbackCount > 1) {
      val expectedFrames = expectedNumFrames
      val framesDroppedThisFrame = expectedFrames - expectedFramesPrev - 1
      if (framesDroppedThisFrame >= 4) {
        stutters++
      }
      expectedFramesPrev = expectedFrames
    }
    choreographer?.postFrameCallback(this)
  }

  fun start(targetFps: Double = this.targetFps) {
    this.targetFps = targetFps
    try {
      UiThreadUtil.runOnUiThread {
        choreographer = Choreographer.getInstance()
        choreographer?.postFrameCallback(this)
        Log.d(TAG, "FpsFrameTracker started with targetFps: $targetFps")
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error starting FpsFrameTracker", e)
    }
  }

  fun stop() {
    try {
      UiThreadUtil.runOnUiThread {
        choreographer = Choreographer.getInstance()
        choreographer?.removeFrameCallback(this)
        Log.d(TAG, "FpsFrameTracker stopped")
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error stopping FpsFrameTracker", e)
    }
  }

  fun reset() {
    firstFrameTime = -1
    lastFrameTime = -1
    frameCallbackCount = 0
    stutters = 0
    expectedFramesPrev = 0
  }

  val fps: Double
    get() {
      if (frameCount <= 0 || lastFrameTime <= firstFrameTime) {
        return 0.0
      }
      val timeDiff = lastFrameTime - firstFrameTime
      if (timeDiff <= 0) {
        return 0.0
      }
      val rawFps = frameCount.toDouble() * ONE_BILLION / timeDiff
      val roundedFps = kotlin.math.round(rawFps)
      return min(roundedFps, maxDeviceFps)
    }

  val frameCount: Int
    get() = frameCallbackCount - 1

  val expectedNumFrames: Int
    get() {
      val totalTimeMS = totalTimeMs.toDouble()
      return (targetFps * totalTimeMS / 1000 + 1).toInt()
    }

  val fourPlusFrameStutters: Int
    get() = stutters

  private val totalTimeMs: Int
    get() =
      if (firstFrameTime == -1L || lastFrameTime == -1L) {
        0
      } else ((lastFrameTime.toDouble() - firstFrameTime) / ONE_MILLION).toInt()

  private fun getDeviceMaxFps(): Double {
    return try {
      // Try to get display from current activity first
      val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        reactContext.currentActivity?.display
      } else {
        null
      }
      
      // Fall back to WindowManager's default display
      val finalDisplay = display ?: run {
        val windowManager = reactContext.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        @Suppress("DEPRECATION")
        windowManager?.defaultDisplay
      }
      
      val refreshRate = finalDisplay?.refreshRate?.toDouble() ?: DEFAULT_FPS
      Log.d(TAG, "Device max refresh rate: $refreshRate FPS")
      refreshRate
    } catch (e: Exception) {
      Log.e(TAG, "Error getting device refresh rate, defaulting to $DEFAULT_FPS", e)
      DEFAULT_FPS
    }
  }

  companion object {
    private const val TAG = "FpsFrameTracker"
    private const val DEFAULT_FPS = 60.0
    private const val ONE_BILLION = 1e9
    private const val ONE_MILLION = 1e6
  }
}

