//
//  HybridPerformanceToolkit.swift
//  Pods
//
//  Created by Daniel Suchý on 10/6/2025.
//

import Foundation
import UIKit
import NitroModules

// Proxy to break retain cycle between CADisplayLink and HybridPerformanceToolkit
private class DisplayLinkProxy {
    weak var target: HybridPerformanceToolkit?
    
    init(target: HybridPerformanceToolkit) {
        self.target = target
    }
    
    @objc func handleDisplayLink(_ link: CADisplayLink) {
        target?.handleDisplayLink(link)
    }
}

class HybridPerformanceToolkit: HybridPerformanceToolkitSpec {
    private static let UI_FPS_UPDATE_INTERVAL: TimeInterval = 0.5
    private static let CPU_UPDATE_INTERVAL: TimeInterval = 0.5
    private static let MEMORY_UPDATE_INTERVAL: TimeInterval = 0.5
    
    // UI FPS tracking
    private var displayLink: CADisplayLink?
    private var displayLinkProxy: DisplayLinkProxy?
    private var uiFpsTimer: Timer?
    private var uiFpsBuffer: ArrayBuffer?
    private var frameCount: Int = 0
    private var lastFrameTime: CFTimeInterval = 0
    private var isUiFpsTrackingStarting = false
    
    // CPU tracking
    private var cpuTimer: Timer?
    private var cpuBuffer: ArrayBuffer?
    private var lastCpuCollectionTime: CFTimeInterval = 0
    private var lastCpuValue: Double = 0.0
    private var lastTotalCpuTime: Double = 0.0
    private var isCpuTrackingStarting = false
    private static let CPU_COLLECTION_INTERVAL: CFTimeInterval = 0.5
    
    // Memory tracking
    private var memoryTimer: Timer?
    private var memoryBuffer: ArrayBuffer?
    private var isMemoryTrackingStarting = false
    
    private lazy var maxDeviceFps: Double = {
        let fps = Double(UIScreen.main.maximumFramesPerSecond)
        #if DEBUG
        print("[PerformanceToolkit] Device max refresh rate: \(fps) FPS")
        #endif
        return fps
    }()
    
    override init() {
        super.init()
    }
    
    deinit {
        // Capture timers to invalidate them on the correct thread
        let displayLinkCopy = displayLink
        let displayLinkProxyCopy = displayLinkProxy
        let uiFpsTimerCopy = uiFpsTimer
        let cpuTimerCopy = cpuTimer
        let memoryTimerCopy = memoryTimer
        
        DispatchQueue.main.async {
            displayLinkCopy?.invalidate()
            uiFpsTimerCopy?.invalidate()
            cpuTimerCopy?.invalidate()
            memoryTimerCopy?.invalidate()
            // Proxy will be deallocated when no longer referenced
            _ = displayLinkProxyCopy
        }
    }
    
    // MARK: - UI FPS Buffer
    
    func getUiFpsBuffer() throws -> ArrayBuffer {
        if uiFpsBuffer == nil {
            uiFpsBuffer = ArrayBuffer.allocate(size: MemoryLayout<Int32>.size)
            uiFpsBuffer!.data.withMemoryRebound(to: Int32.self, capacity: 1) { $0.pointee = 0 }
        }
        
        if displayLink == nil && !isUiFpsTrackingStarting {
            isUiFpsTrackingStarting = true
            startUiFpsTracking()
        }
        
        return uiFpsBuffer!
    }
    
    private func startUiFpsTracking() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { 
                self?.isUiFpsTrackingStarting = false
                return 
            }
            
            // Double-check on main thread to prevent race condition
            guard self.displayLink == nil else {
                self.isUiFpsTrackingStarting = false
                return
            }
            
            // Use proxy to avoid retain cycle
            let proxy = DisplayLinkProxy(target: self)
            self.displayLinkProxy = proxy
            self.displayLink = CADisplayLink(target: proxy, selector: #selector(DisplayLinkProxy.handleDisplayLink(_:)))
            self.displayLink?.add(to: .main, forMode: .common)
            
            self.frameCount = 0
            self.lastFrameTime = 0
            
            self.uiFpsTimer = Timer.scheduledTimer(withTimeInterval: Self.UI_FPS_UPDATE_INTERVAL, repeats: true) { [weak self] _ in
                self?.updateUiFpsBuffer()
            }
            
            self.isUiFpsTrackingStarting = false
        }
    }
    
    fileprivate func handleDisplayLink(_ link: CADisplayLink) {
        frameCount += 1
        lastFrameTime = link.timestamp
    }
    
    private func updateUiFpsBuffer() {
        guard let buffer = uiFpsBuffer else { return }
        
        let fps = Double(frameCount) * (1.0 / Self.UI_FPS_UPDATE_INTERVAL)
        let roundedFps = round(fps)
        let cappedFps = min(roundedFps, maxDeviceFps)
        
        buffer.data.withMemoryRebound(to: Int32.self, capacity: 1) { $0.pointee = Int32(cappedFps) }
        
        frameCount = 0
    }
    
    // MARK: - CPU Usage Buffer
    
    func getCpuUsageBuffer() throws -> ArrayBuffer {
        if cpuBuffer == nil {
            cpuBuffer = ArrayBuffer.allocate(size: MemoryLayout<Int32>.size)
            cpuBuffer!.data.withMemoryRebound(to: Int32.self, capacity: 1) { $0.pointee = 0 }
        }
        
        if cpuTimer == nil && !isCpuTrackingStarting {
            isCpuTrackingStarting = true
            startCpuTracking()
        }
        
        return cpuBuffer!
    }
    
    private func startCpuTracking() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                self?.isCpuTrackingStarting = false
                return
            }
            
            // Double-check on main thread to prevent race condition
            guard self.cpuTimer == nil else {
                self.isCpuTrackingStarting = false
                return
            }
            
            self.cpuTimer = Timer.scheduledTimer(withTimeInterval: Self.CPU_UPDATE_INTERVAL, repeats: true) { [weak self] _ in
                self?.updateCpuBuffer()
            }
            
            self.isCpuTrackingStarting = false
        }
    }
    
    private func updateCpuBuffer() {
        guard let buffer = cpuBuffer else { return }
        
        let cpuValue = collectUsedCpu()
        let roundedCpu = round(cpuValue)
        
        buffer.data.withMemoryRebound(to: Int32.self, capacity: 1) { $0.pointee = Int32(roundedCpu) }
    }
    
    private func collectUsedCpu() -> Double {
        let now = CACurrentMediaTime()
        
        var usage = rusage()
        let rusageResult = getrusage(RUSAGE_SELF, &usage)
        
        guard rusageResult == 0 else {
            #if DEBUG
            print("[PerformanceToolkit] CPU: getrusage failed, returning cached value: \(lastCpuValue)")
            #endif
            return lastCpuValue
        }
        
        let userTime = Double(usage.ru_utime.tv_sec) + Double(usage.ru_utime.tv_usec) / 1_000_000.0
        let systemTime = Double(usage.ru_stime.tv_sec) + Double(usage.ru_stime.tv_usec) / 1_000_000.0
        let totalCpuTime = userTime + systemTime
        
        if lastCpuCollectionTime == 0 {
            lastCpuCollectionTime = now
            lastTotalCpuTime = totalCpuTime
            lastCpuValue = 0.0
            return 0.0
        }
        
        let elapsedTime = now - lastCpuCollectionTime
        
        if elapsedTime < Self.CPU_COLLECTION_INTERVAL {
            return lastCpuValue
        }
        
        let cpuTimeDelta = totalCpuTime - lastTotalCpuTime
        let cpuPercentage = (cpuTimeDelta / elapsedTime) * 100.0
        
        lastCpuCollectionTime = now
        lastTotalCpuTime = totalCpuTime
        lastCpuValue = cpuPercentage
        
        return cpuPercentage
    }
    
    // MARK: - Memory Usage Buffer
    
    func getMemoryUsageBuffer() throws -> ArrayBuffer {
        if memoryBuffer == nil {
            memoryBuffer = ArrayBuffer.allocate(size: MemoryLayout<Int32>.size)
            memoryBuffer!.data.withMemoryRebound(to: Int32.self, capacity: 1) { $0.pointee = 0 }
        }
        
        if memoryTimer == nil && !isMemoryTrackingStarting {
            isMemoryTrackingStarting = true
            startMemoryTracking()
        }
        
        return memoryBuffer!
    }
    
    private func startMemoryTracking() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                self?.isMemoryTrackingStarting = false
                return
            }
            
            // Double-check on main thread to prevent race condition
            guard self.memoryTimer == nil else {
                self.isMemoryTrackingStarting = false
                return
            }
            
            self.memoryTimer = Timer.scheduledTimer(withTimeInterval: Self.MEMORY_UPDATE_INTERVAL, repeats: true) { [weak self] _ in
                self?.updateMemoryBuffer()
            }
            
            self.isMemoryTrackingStarting = false
        }
    }
    
    private func updateMemoryBuffer() {
        guard let buffer = memoryBuffer else { return }
        
        let ramValue = collectUsedRam()
        
        buffer.data.withMemoryRebound(to: Int32.self, capacity: 1) { $0.pointee = Int32(ramValue) }
    }
    
    private func collectUsedRam() -> Double {
        // Use task_vm_info to get phys_footprint, which matches Xcode's memory gauge
        // This excludes shared memory (frameworks, dylibs) and shows actual app footprint
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size) / 4
        
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        
        guard result == KERN_SUCCESS else {
            return 0.0
        }
        
        return Double(info.phys_footprint) / 1_048_576.0
    }
}
