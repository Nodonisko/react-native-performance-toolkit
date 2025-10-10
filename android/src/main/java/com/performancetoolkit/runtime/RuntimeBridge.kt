package com.performancetoolkit.runtime

import android.util.Log
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.RuntimeExecutor

@Suppress("KotlinJniMissingFunction")
class RuntimeBridge {
    @DoNotStrip
    private var mHybridData: HybridData?

    @DoNotStrip
    private external fun initHybrid(
        runtimeExecutor: RuntimeExecutor
    ): HybridData

    init {
        mHybridData = null
    }

    fun initialize(
        runtimeExecutor: RuntimeExecutor
    ) {
        if (mHybridData != null) {
            return
        }
        mHybridData = initHybrid(runtimeExecutor)
    }

    companion object {
        private var instance: RuntimeBridge? = null
        private const val TAG = "RuntimeBridge"

        @JvmStatic
        @Synchronized
        fun initializeOnce(reactContext: ReactContext) {
            if (instance == null) {
                instance = RuntimeBridge()
            }
            
            try {
                // Use reflection to access internal ReactHostImpl fields
                val reactHostField = reactContext.javaClass.getDeclaredField("reactHost")
                reactHostField.isAccessible = true
                val reactHost = reactHostField.get(reactContext)
                
                if (reactHost == null) {
                    Log.w(TAG, "ReactHost is null, cannot initialize RuntimeBridge")
                    return
                }
                
                // Get reactInstance field using reflection
                val reactInstanceField = reactHost.javaClass.getDeclaredField("reactInstance")
                reactInstanceField.isAccessible = true
                val reactInstance = reactInstanceField.get(reactHost)
                
                if (reactInstance == null) {
                    Log.w(TAG, "ReactInstance is null, cannot initialize RuntimeBridge")
                    return
                }
                
                // Get bufferedRuntimeExecutor from reactInstance
                val getBufferedRuntimeExecutorMethod = reactInstance.javaClass.getDeclaredMethod("getBufferedRuntimeExecutor")
                getBufferedRuntimeExecutorMethod.isAccessible = true
                val runtimeExecutor = getBufferedRuntimeExecutorMethod.invoke(reactInstance) as? RuntimeExecutor
                
                if (runtimeExecutor == null) {
                    Log.w(TAG, "RuntimeExecutor is null, cannot initialize RuntimeBridge")
                    return
                }
                
                instance?.initialize(runtimeExecutor)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize RuntimeBridge via reflection", e)
            }
        }
    }
}

