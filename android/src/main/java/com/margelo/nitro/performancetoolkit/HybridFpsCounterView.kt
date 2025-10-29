package com.margelo.nitro.performancetoolkit

import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.core.ArrayBuffer
import java.lang.ref.WeakReference

@Keep
@DoNotStrip
class HybridFpsCounterView(
  private val context: ThemedReactContext,
) : HybridFpsCounterViewSpec() {
  companion object {
    private const val TAG = "HybridFpsCounterView"
  }

  // View
  private val fpsTextView: TextView = TextView(context).apply {
    text = "0"
    gravity = Gravity.CENTER
    setTextColor(Color.WHITE)
    textSize = 16f
  }
  
  private val labelTextView: TextView = TextView(context).apply {
    text = ""
    gravity = Gravity.CENTER
    setTextColor(Color.WHITE)
    textSize = 10f
  }
  
  private val containerLayout: LinearLayout = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.CENTER
    addView(fpsTextView)
    addView(labelTextView)
  }
  
  override val view: View = containerLayout

  // State
  private var fpsMonitor: FpsMonitorRunnable? = null
  private var handler: Handler? = null
  private val deviceRefreshRate: Double by lazy { fetchDeviceRefreshRate() }

  // Props
  private var _valueBuffer: ArrayBuffer? = null
  
  override var valueBuffer: ArrayBuffer
    get() = _valueBuffer ?: throw IllegalStateException("valueBuffer not initialized")
    set(value) {
      _valueBuffer = value
      ensureMonitoringStarted()
    }

  private var _updateIntervalMs: Double = 500.0
  override var updateIntervalMs: Double
    get() = _updateIntervalMs
    set(value) {
      val changed = _updateIntervalMs != value
      _updateIntervalMs = value
      if (changed && fpsMonitor != null) {

        // Only restart if monitoring is already running
        Log.d(TAG, "Restarting monitoring due to interval change")
        restartMonitoring()
      } else {
        ensureMonitoringStarted()
      }
    }

  private var _label: String = ""
  override var label: String
    get() = _label
    set(value) {
      _label = value
      handler?.post {
        labelTextView.text = value
      }
    }

  init {
    Log.d(TAG, "HybridFpsCounterView initialized with refresh rate: $deviceRefreshRate Hz")
  }

  private fun fetchDeviceRefreshRate(): Double {
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

  private fun ensureMonitoringStarted() {
    // Start monitoring once we have the required props
    if (fpsMonitor == null && _valueBuffer != null) {
      startMonitoring()
    }
  }

  private fun restartMonitoring() {
    stopMonitoring()
    startMonitoring()
  }

  private fun startMonitoring() {
    if (fpsMonitor != null) {
      Log.d(TAG, "Monitoring already started, skipping")
      return
    }

    Log.d(TAG, "Starting FPS monitoring with interval ${_updateIntervalMs}ms")
    handler = Handler(Looper.getMainLooper())
    fpsMonitor = FpsMonitorRunnable(WeakReference(this)).also { it.start() }
  }

  private fun stopMonitoring() {
    fpsMonitor?.stop()
    fpsMonitor = null

    handler?.removeCallbacksAndMessages(null)
    handler = null
  }

  private fun interpolateColor(fps: Double): Int {
    // Clamp FPS between 0 and device refresh rate
    val clampedFps = fps.coerceIn(0.0, deviceRefreshRate)
    // Normalize to 0-1 range
    val normalized = clampedFps / deviceRefreshRate

    // Interpolate from red (255, 0, 0) to darker green (0, 180, 0)
    val red = (255 * (1 - normalized)).toInt()
    val green = (180 * normalized).toInt()
    val blue = 0

    return Color.rgb(red, green, blue)
  }

  private fun updateDisplay(fps: Double) {
    handler?.post {
      fpsTextView.text = fps.toInt().toString()
      containerLayout.setBackgroundColor(interpolateColor(fps))
    }
  }

  private class FpsMonitorRunnable(
    private val fpsCounterRef: WeakReference<HybridFpsCounterView>
  ) : Runnable {

    private var shouldStop = false

    override fun run() {
      if (shouldStop) return

      val fpsCounter = fpsCounterRef.get() ?: return
      val currentHandler = fpsCounter.handler ?: return

      // Read FPS value from the buffer (Int32, little-endian)
      val fps = fpsCounter._valueBuffer?.let { buffer ->
        val byteBuffer = buffer.getBuffer(false) // Don't copy, just wrap
        if (byteBuffer.capacity() >= 4) {
          byteBuffer.rewind()
          byteBuffer.order(java.nio.ByteOrder.LITTLE_ENDIAN)
          val fpsInt = byteBuffer.int
          fpsInt.toDouble()
        } else {
          0.0
        }
      } ?: 0.0

      fpsCounter.updateDisplay(fps)

      currentHandler.postDelayed(this, fpsCounter._updateIntervalMs.toLong())
    }

    fun start() {
      shouldStop = false
      Log.d(TAG, "FpsMonitorRunnable starting")
      fpsCounterRef.get()?.handler?.post(this)
    }

    fun stop() {
      shouldStop = true
      Log.d(TAG, "FpsMonitorRunnable stopped")
    }
  }
}
