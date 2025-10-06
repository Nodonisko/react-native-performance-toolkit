package com.performancetoolkit

import com.margelo.nitro.performancetoolkit.HybridPerformanceToolkitSpec

class HybridPerformanceToolkit: HybridPerformanceToolkitSpec() {    
    override fun sum(num1: Double, num2: Double): Double {
        return num1 + num2
    }
}
