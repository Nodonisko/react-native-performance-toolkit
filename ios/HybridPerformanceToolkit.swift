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
    // Shared backing buffer for getMemoryUsage() and getExtendedMemoryUsage().
    // The basic API reads only offset 0; collecting extended fields adds no
    // additional task_info call.
    // Buffer layout (little-endian):
    //   offset  0 : Int32   phys_footprint (MB)  -- primary, jetsam-relevant
    //   offset  8 : Float64 resident_size  (KB)  -- resident secondary
    //   offset 16 : Float64 region_count   (count) -- address-space diagnostic
    // virtual_size is intentionally not collected (reserved address space is
    // not a useful memory-usage signal).
    private static let MEMORY_BUFFER_SIZE = 24
    private static let MEMORY_PHYS_FOOTPRINT_MB_OFFSET = 0
    private static let MEMORY_RESIDENT_SIZE_KB_OFFSET = 8
    private static let MEMORY_REGION_COUNT_OFFSET = 16
    private var memoryTimer: Timer?
    private var memoryMetricsBuffer: ArrayBuffer?
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
    
    // MARK: - Memory Metrics Buffer
    
    func getMemoryUsageBuffer() throws -> ArrayBuffer {
        if memoryMetricsBuffer == nil {
            memoryMetricsBuffer = ArrayBuffer.allocate(size: Self.MEMORY_BUFFER_SIZE)
            memset(memoryMetricsBuffer!.data, 0, Self.MEMORY_BUFFER_SIZE)
            // Populate synchronously so the very first read returns real values rather than 0.
            // Memory is an instantaneous measurement (no delta required), so this is safe to do
            // on the calling thread; it matches the work the periodic updater does every 500ms.
            updateMemoryMetricsBuffer()
        }
        
        if memoryTimer == nil && !isMemoryTrackingStarting {
            isMemoryTrackingStarting = true
            startMemoryTracking()
        }
        
        return memoryMetricsBuffer!
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
                self?.updateMemoryMetricsBuffer()
            }
            
            self.isMemoryTrackingStarting = false
        }
    }
    
    private struct TaskVmInfoSample {
        let physFootprintMb: Double?
        let residentSizeKb: Double?
        let regionCount: Double?
    }
    
    private func updateMemoryMetricsBuffer() {
        guard let buffer = memoryMetricsBuffer else { return }
        
        let sample = collectTaskVmInfo()
        
        buffer.data.advanced(by: Self.MEMORY_PHYS_FOOTPRINT_MB_OFFSET)
            .withMemoryRebound(to: Int32.self, capacity: 1) {
                $0.pointee = Int32(sample.physFootprintMb ?? 0.0)
            }
        writeDouble(buffer, offset: Self.MEMORY_RESIDENT_SIZE_KB_OFFSET, value: sample.residentSizeKb ?? 0.0)
        writeDouble(buffer, offset: Self.MEMORY_REGION_COUNT_OFFSET, value: sample.regionCount ?? 0.0)
    }
    
    private func writeDouble(_ buffer: ArrayBuffer, offset: Int, value: Double) {
        var mutableValue = value
        withUnsafeBytes(of: &mutableValue) { bytes in
            memcpy(buffer.data.advanced(by: offset), bytes.baseAddress!, MemoryLayout<Double>.size)
        }
    }
    
    private func taskVmInfoCountCovers<T>(_ field: KeyPath<task_vm_info_data_t, T>, count: mach_msg_type_number_t) -> Bool {
        guard let offset = MemoryLayout<task_vm_info_data_t>.offset(of: field) else {
            return false
        }
        let wordSize = MemoryLayout<natural_t>.size
        let requiredCount = mach_msg_type_number_t((offset + MemoryLayout<T>.size + wordSize - 1) / wordSize)
        return count >= requiredCount
    }
    
    private func collectTaskVmInfo() -> TaskVmInfoSample {
        // TASK_VM_INFO gives phys_footprint plus resident size and region count.
        // Swift does not import the TASK_VM_INFO_COUNT macro, so compute the same
        // natural_t word count and verify the returned revision covers each late
        // field before reading it. virtual_size is intentionally not read: it
        // measures reserved-but-uncommitted address space and is useless as a
        // memory-usage signal.
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        
        guard result == KERN_SUCCESS else {
            return TaskVmInfoSample(physFootprintMb: nil, residentSizeKb: nil, regionCount: nil)
        }
        
        let physFootprintMb: Double?
        if taskVmInfoCountCovers(\task_vm_info_data_t.phys_footprint, count: count) {
            physFootprintMb = Double(info.phys_footprint) / 1_048_576.0
        } else {
            physFootprintMb = nil
        }
        
        let residentSizeKb: Double?
        if taskVmInfoCountCovers(\task_vm_info_data_t.resident_size, count: count) {
            residentSizeKb = Double(info.resident_size) / 1024.0
        } else {
            residentSizeKb = nil
        }
        
        let regionCount: Double?
        if taskVmInfoCountCovers(\task_vm_info_data_t.region_count, count: count) {
            regionCount = Double(info.region_count)
        } else {
            regionCount = nil
        }
        
        return TaskVmInfoSample(
            physFootprintMb: physFootprintMb,
            residentSizeKb: residentSizeKb,
            regionCount: regionCount
        )
    }
    
    func getDeviceMaxRefreshRate() throws -> Double {
        return maxDeviceFps
    }
    
    func getDeviceCurrentRefreshRate() throws -> Double {
        // On iOS, the current refresh rate is the same as max for most cases
        // ProMotion devices (120Hz) may throttle down, but CADisplayLink will reflect this
        if let displayLink = displayLink {
            // preferredFramesPerSecond returns the actual frame rate being used
            // 0 means maximum available, so we return maxDeviceFps
            if displayLink.preferredFramesPerSecond == 0 {
                return maxDeviceFps
            }
            return Double(displayLink.preferredFramesPerSecond)
        }
        
        // Fallback to current screen refresh rate
        return Double(UIScreen.main.maximumFramesPerSecond)
    }
}
