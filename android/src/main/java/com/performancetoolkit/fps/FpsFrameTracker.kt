/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.performancetoolkit.fps

import android.view.Choreographer
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import kotlin.math.max

internal class FpsFrameTracker(private val reactContext: ReactContext) :
  Choreographer.FrameCallback {

  private var choreographer: Choreographer? = null
  private var firstFrameTime: Long = -1
  private var lastFrameTime: Long = -1
  private var frameCallbackCount = 0
  private var expectedFramesPrev = 0
  private var stutters = 0
  private var targetFps = DEFAULT_FPS

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
    UiThreadUtil.runOnUiThread {
      choreographer = Choreographer.getInstance()
      choreographer?.postFrameCallback(this)
    }
  }

  fun stop() {
    UiThreadUtil.runOnUiThread {
      choreographer = Choreographer.getInstance()
      choreographer?.removeFrameCallback(this)
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
    get() =
      if (lastFrameTime == firstFrameTime || frameCount <= 0) {
        0.0
      } else frameCount.toDouble() * ONE_BILLION / max(lastFrameTime - firstFrameTime, 1L)

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

  companion object {
    private const val DEFAULT_FPS = 60.0
    private const val ONE_BILLION = 1e9
    private const val ONE_MILLION = 1e6
  }
}

