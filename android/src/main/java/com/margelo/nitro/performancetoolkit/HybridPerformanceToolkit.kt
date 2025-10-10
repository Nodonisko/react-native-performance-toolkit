package com.margelo.nitro.performancetoolkit

import android.os.Debug
import android.os.Handler
import android.os.Looper
import androidx.annotation.Keep
import com.facebook.react.bridge.ReactContext
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.performancetoolkit.fps.FpsFrameTracker
import com.performancetoolkit.runtime.RuntimeBridge
import java.io.BufferedReader
import java.io.InputStreamReader

@Keep
@DoNotStrip
class HybridPerformanceToolkit : HybridPerformanceToolkitSpec() {

  private var frameTracker: FpsFrameTracker? = null
  private var statsMonitor: StatsMonitorRunnable? = null
  private var handler: Handler? = null
  private var packageName: String? = null
  private var onUpdateCallback: ((PerformanceStats) -> Unit)? = null
  private var withCpu: Boolean = false
  private var updateIntervalMs: Long = DEFAULT_UPDATE_INTERVAL_MS

  override fun startTracking(
    onUpdate: (stats: PerformanceStats) -> Unit,
    options: PerformanceTrackingOptions?,
  ) {
    val context = NitroModules.applicationContext as? ReactContext ?: return
    if (frameTracker != null) {
      onUpdateCallback = onUpdate
      withCpu = options?.withCpu ?: withCpu
      updateIntervalMs = sanitizeInterval(options?.updateIntervalMs)
      return
    }

    onUpdateCallback = onUpdate
    withCpu = options?.withCpu ?: false
    updateIntervalMs = sanitizeInterval(options?.updateIntervalMs)

    // Initialize the RuntimeBridge to capture the JS runtime and scheduler
    RuntimeBridge.initializeOnce(context)

    frameTracker = FpsFrameTracker(context).also {
      it.reset()
      it.start()
    }

    packageName = context.packageName
    handler = Looper.getMainLooper().let { Handler(it) }
    statsMonitor = StatsMonitorRunnable().also { it.start() }
  }

  override fun stopTracking() {
    frameTracker?.stop()
    frameTracker = null

    statsMonitor?.stop()
    statsMonitor = null

    handler?.removeCallbacksAndMessages(null)
    handler = null
    onUpdateCallback = null
  }

  override fun isTracking(): Boolean {
    return frameTracker != null
  }

  private inner class StatsMonitorRunnable : Runnable {

    private var shouldStop = false
    private var totalFramesDropped = 0
    private var totalStutters = 0

    override fun run() {
      if (shouldStop) return

      val tracker = frameTracker ?: return
      val currentHandler = handler ?: return
      val onUpdate = onUpdateCallback ?: return

      totalFramesDropped += tracker.expectedNumFrames - tracker.frameCount
      totalStutters += tracker.fourPlusFrameStutters

      val stats = PerformanceStats(
        tracker.fps,
        totalFramesDropped.toDouble(),
        totalStutters.toDouble(),
        collectUsedRam(),
        collectUsedCpu(),
      )

      onUpdate(stats)

      tracker.reset()

      currentHandler.postDelayed(this, updateIntervalMs)
    }

    fun start() {
      shouldStop = false
      handler?.post(this)
    }

    fun stop() {
      shouldStop = true
    }

    private fun collectUsedRam(): Double {
      return try {
        val memoryInfo = Debug.MemoryInfo()
        Debug.getMemoryInfo(memoryInfo)
        memoryInfo.totalPss / 1000.0
      } catch (_: Throwable) {
        0.0
      }
    }

    private fun collectUsedCpu(): Double {
      if (!withCpu) return 0.0
      val pkg = packageName ?: return 0.0
      return try {
        val commands = arrayOf("top", "-n", "1", "-q", "-o", "CMDLINE,%CPU", "-s2", "-b")
        val process = Runtime.getRuntime().exec(commands)
        BufferedReader(InputStreamReader(process.inputStream)).use { reader ->
          var line: String?
          while (reader.readLine().also { line = it } != null) {
            val current = line ?: continue
            if (!current.contains(pkg)) continue
            val cleaned = current.replace(pkg, "").replace(" ", "")
            return cleaned.toDoubleOrNull() ?: 0.0
          }
        }
        0.0
      } catch (_: Throwable) {
        0.0
      }
    }
  }

  companion object {
    private const val DEFAULT_UPDATE_INTERVAL_MS = 500L

    private fun sanitizeInterval(value: Double?): Long {
      val interval = value?.toLong() ?: DEFAULT_UPDATE_INTERVAL_MS
      return if (interval > 0) interval else DEFAULT_UPDATE_INTERVAL_MS
    }
  }
}

