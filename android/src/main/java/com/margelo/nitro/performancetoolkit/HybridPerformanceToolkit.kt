package com.margelo.nitro.performancetoolkit

import android.os.Debug
import android.os.Handler
import android.os.Looper
import androidx.annotation.Keep
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.ArrayBuffer
import com.performancetoolkit.fps.FpsFrameTracker

@Keep
@DoNotStrip
class HybridPerformanceToolkit : HybridPerformanceToolkitSpec() {
  companion object {
    // Update intervals (as constants for easy tuning)
    private const val UI_FPS_UPDATE_INTERVAL_MS = 500L
    private const val CPU_UPDATE_INTERVAL_MS = 500L
    private const val MEMORY_UPDATE_INTERVAL_MS = 500L
  }

  // UI FPS tracking
  private var frameTracker: FpsFrameTracker? = null
  private var uiFpsHandler: Handler? = null
  private var uiFpsRunnable: Runnable? = null
  private var uiFpsBuffer: ArrayBuffer? = null

  // CPU tracking
  private var cpuHandler: Handler? = null
  private var cpuRunnable: CpuMonitorRunnable? = null
  private var cpuBuffer: ArrayBuffer? = null

  // Memory tracking
  private var memoryHandler: Handler? = null
  private var memoryRunnable: Runnable? = null
  private var memoryBuffer: ArrayBuffer? = null

  override fun getUiFpsBuffer(): ArrayBuffer {
    if (uiFpsBuffer == null) {
      uiFpsBuffer = ArrayBuffer.allocate(4)
      val buffer = uiFpsBuffer!!.getBuffer(copyIfNeeded = false)
      buffer.putInt(0, 0)
    }

    if (frameTracker == null) {
      startUiFpsTracking()
    }

    return uiFpsBuffer!!
  }

  private fun startUiFpsTracking() {
    val context = NitroModules.applicationContext as? ReactApplicationContext ?: return

    frameTracker = FpsFrameTracker(context).also {
      it.reset()
      it.start()
    }

    uiFpsHandler = Handler(Looper.getMainLooper())
    uiFpsRunnable = object : Runnable {
      override fun run() {
        updateUiFpsBuffer()
        uiFpsHandler?.postDelayed(this, UI_FPS_UPDATE_INTERVAL_MS)
      }
    }
    uiFpsHandler?.post(uiFpsRunnable!!)
  }

  private fun updateUiFpsBuffer() {
    val tracker = frameTracker ?: return
    val arrayBuffer = uiFpsBuffer ?: return

    val fps = tracker.fps.toInt()
    val buffer = arrayBuffer.getBuffer(copyIfNeeded = false)
    buffer.putInt(0, fps)

    tracker.reset()
  }

  override fun getCpuUsageBuffer(): ArrayBuffer {
    if (cpuBuffer == null) {
      cpuBuffer = ArrayBuffer.allocate(4)
      val buffer = cpuBuffer!!.getBuffer(copyIfNeeded = false)
      buffer.putInt(0, 0)
    }

    if (cpuRunnable == null) {
      startCpuTracking()
    }

    return cpuBuffer!!
  }

  private fun startCpuTracking() {
    cpuHandler = Handler(Looper.getMainLooper())
    cpuRunnable = CpuMonitorRunnable()
    cpuHandler?.post(cpuRunnable!!)
  }

  private inner class CpuMonitorRunnable : Runnable {
    private var lastCpuTime: Long = 0
    private var lastCpuCheckTime: Long = 0

    override fun run() {
      val arrayBuffer = cpuBuffer ?: return

      val cpuPercent = collectUsedCpu()
      val buffer = arrayBuffer.getBuffer(copyIfNeeded = false)
      buffer.putInt(0, cpuPercent)

      cpuHandler?.postDelayed(this, CPU_UPDATE_INTERVAL_MS)
    }

    private fun collectUsedCpu(): Int {
      return try {
        val pid = android.os.Process.myPid()
        val statFile = java.io.File("/proc/$pid/stat")
        if (!statFile.exists()) {
          android.util.Log.w("PerformanceToolkit", "CPU stat file not found for PID: $pid")
          return 0
        }

        val statContent = statFile.readText()
        val stats = statContent.split(" ")

        // Parse CPU times: utime at index 13, stime at index 14
        if (stats.size < 15) {
          android.util.Log.w("PerformanceToolkit", "Invalid stat file format")
          return 0
        }

        val utime = stats[13].toLongOrNull() ?: 0L
        val stime = stats[14].toLongOrNull() ?: 0L
        val totalTime = utime + stime

        val currentTime = System.currentTimeMillis()
        if (lastCpuCheckTime > 0 && lastCpuTime > 0) {
          val timeDelta = currentTime - lastCpuCheckTime
          val cpuDelta = totalTime - lastCpuTime

          if (timeDelta > 0) {
            // Most Android systems use 100 ticks per second
            val cpuPercent = (cpuDelta * 1000.0) / (timeDelta * 100.0) * 100.0

            lastCpuTime = totalTime
            lastCpuCheckTime = currentTime

            return kotlin.math.round(cpuPercent).toInt()
          }
        }

        lastCpuTime = totalTime
        lastCpuCheckTime = currentTime
        0
      } catch (e: Throwable) {
        android.util.Log.e("PerformanceToolkit", "Error collecting CPU usage", e)
        0
      }
    }
  }

  override fun getMemoryUsageBuffer(): ArrayBuffer {
    if (memoryBuffer == null) {
      memoryBuffer = ArrayBuffer.allocate(4)
      val buffer = memoryBuffer!!.getBuffer(copyIfNeeded = false)
      buffer.putInt(0, 0)
    }

    if (memoryRunnable == null) {
      startMemoryTracking()
    }

    return memoryBuffer!!
  }

  private fun startMemoryTracking() {
    memoryHandler = Handler(Looper.getMainLooper())
    memoryRunnable = Runnable {
      updateMemoryBuffer()
      memoryHandler?.postDelayed(memoryRunnable!!, MEMORY_UPDATE_INTERVAL_MS)
    }
    memoryHandler?.post(memoryRunnable!!)
  }

  private fun updateMemoryBuffer() {
    val arrayBuffer = memoryBuffer ?: return

    val ramMb = collectUsedRam()
    val buffer = arrayBuffer.getBuffer(copyIfNeeded = false)
    buffer.putInt(0, ramMb)
  }

  private fun collectUsedRam(): Int {
    return try {
      val pid = android.os.Process.myPid()
      
      // Try smaps_rollup first (fastest, most accurate - PSS)
      // Available on Android 10+ (kernel 4.14+)
      val smapsRollupFile = java.io.File("/proc/$pid/smaps_rollup")
      if (smapsRollupFile.exists()) {
        var pssValue: Int? = null
        smapsRollupFile.forEachLine { line ->
          if (pssValue == null && line.startsWith("Pss:")) {
            // Format: "Pss:     98765 kB"
            // Extract number after "Pss:" using simple string ops (no regex)
            var numStart = 4 // After "Pss:"
            while (numStart < line.length && (line[numStart] == ' ' || line[numStart] == '\t')) {
              numStart++
            }
            var numEnd = numStart
            while (numEnd < line.length && line[numEnd].isDigit()) {
              numEnd++
            }
            if (numEnd > numStart) {
              val pssKb = line.substring(numStart, numEnd).toIntOrNull() ?: 0
              if (pssKb > 0) {
                pssValue = pssKb / 1024 // Convert KB to MB
              }
            }
          }
        }
        if (pssValue != null) {
          return pssValue
        }
      }
      
      // Fallback: Debug.MemoryInfo (most reliable but ~200x more expensive)
      android.util.Log.i("PerformanceToolkit", "smaps_rollup not available, using Debug.MemoryInfo fallback")
      val memoryInfo = Debug.MemoryInfo()
      Debug.getMemoryInfo(memoryInfo)
      (memoryInfo.totalPss / 1000.0).toInt()
    } catch (e: Throwable) {
      android.util.Log.e("PerformanceToolkit", "Error collecting RAM usage", e)
      0
    }
  }
}
