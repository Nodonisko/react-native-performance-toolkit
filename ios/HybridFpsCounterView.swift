import UIKit
import NitroModules

class HybridFpsCounterView : HybridFpsCounterViewSpec {
  private static let TAG = "HybridFpsCounterView"
  
  // View components
  private let fpsLabel: UILabel = {
    let label = UILabel()
    label.text = "0"
    label.textAlignment = .center
    label.textColor = .white
    label.font = UIFont.systemFont(ofSize: 16)
    label.translatesAutoresizingMaskIntoConstraints = false
    return label
  }()
  
  private let labelTextView: UILabel = {
    let label = UILabel()
    label.text = ""
    label.textAlignment = .center
    label.textColor = .white
    label.font = UIFont.systemFont(ofSize: 10)
    label.translatesAutoresizingMaskIntoConstraints = false
    return label
  }()
  
  private let containerView: UIView = {
    let view = UIView()
    view.clipsToBounds = true
    return view
  }()
  
  private let stackView: UIStackView = {
    let stack = UIStackView()
    stack.axis = .vertical
    stack.alignment = .center
    stack.distribution = .fill
    stack.spacing = 2
    stack.translatesAutoresizingMaskIntoConstraints = false
    return stack
  }()
  
  // State
  private var timer: Timer?
  private let deviceRefreshRate: Double
  
  // Props backing storage
  private var _valueBuffer: ArrayBuffer?
  private var _updateIntervalMs: Double = 500.0
  private var _label: String = ""
  
  var view: UIView {
    return containerView
  }
  
  var valueBuffer: ArrayBuffer {
    get {
      guard let buffer = _valueBuffer else {
        fatalError("valueBuffer not initialized")
      }
      return buffer
    }
    set {
      _valueBuffer = newValue
      ensureMonitoringStarted()
    }
  }
  
  var updateIntervalMs: Double {
    get {
      return _updateIntervalMs
    }
    set {
      let changed = _updateIntervalMs != newValue
      _updateIntervalMs = newValue
      
      if changed && timer != nil {
        // Only restart if monitoring is already running
        print("\(Self.TAG): Restarting monitoring due to interval change")
        restartMonitoring()
      } else {
        ensureMonitoringStarted()
      }
    }
  }
  
  var label: String {
    get {
      return _label
    }
    set {
      _label = newValue
      DispatchQueue.main.async { [weak self] in
        self?.labelTextView.text = newValue
      }
    }
  }
  
  override init() {
    // Get device refresh rate
    self.deviceRefreshRate = Self.fetchDeviceRefreshRate()
    
    super.init()
    
    print("\(Self.TAG): HybridFpsCounterView initialized with refresh rate: \(deviceRefreshRate) Hz")
    
    setupViews()
  }
  
  private static func fetchDeviceRefreshRate() -> Double {
    if #available(iOS 10.3, *) {
      return Double(UIScreen.main.maximumFramesPerSecond)
    } else {
      return 60.0
    }
  }
  
  private func setupViews() {
    // Add labels to stack
    stackView.addArrangedSubview(fpsLabel)
    stackView.addArrangedSubview(labelTextView)
    
    // Add stack to container
    containerView.addSubview(stackView)
    
    // Setup constraints - center the stack view in the container
    NSLayoutConstraint.activate([
      stackView.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
      stackView.centerYAnchor.constraint(equalTo: containerView.centerYAnchor)
    ])
    
    // Set initial background color
    containerView.backgroundColor = interpolateColor(fps: 0)
  }
  
  private func ensureMonitoringStarted() {
    // Start monitoring once we have the required props
    if timer == nil && _valueBuffer != nil {
      startMonitoring()
    }
  }
  
  private func restartMonitoring() {
    stopMonitoring()
    startMonitoring()
  }
  
  private func startMonitoring() {
    if timer != nil {
      print("\(Self.TAG): Monitoring already started, skipping")
      return
    }
    
    print("\(Self.TAG): Starting FPS monitoring with interval \(_updateIntervalMs)ms")
    
    let intervalInSeconds = _updateIntervalMs / 1000.0
    timer = Timer.scheduledTimer(withTimeInterval: intervalInSeconds, repeats: true) { [weak self] _ in
      self?.updateFpsDisplay()
    }
    
    // Fire immediately
    updateFpsDisplay()
  }
  
  private func stopMonitoring() {
    timer?.invalidate()
    timer = nil
    print("\(Self.TAG): Monitoring stopped")
  }
  
  private func updateFpsDisplay() {
    guard let buffer = _valueBuffer else { return }
    
    // Read FPS value from the buffer (Int32, little-endian)
    let fps: Double
    let data = buffer.data
    let size = buffer.size
    
    if size >= 4 {
      // Read as little-endian Int32
      let int32Value = data.withMemoryRebound(to: Int32.self, capacity: 1) { ptr in
        Int32(littleEndian: ptr.pointee)
      }
      fps = Double(int32Value)
    } else {
      fps = 0.0
    }
    
    updateDisplay(fps: fps)
  }
  
  private func updateDisplay(fps: Double) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.fpsLabel.text = "\(Int(fps))"
      self.containerView.backgroundColor = self.interpolateColor(fps: fps)
    }
  }
  
  private func interpolateColor(fps: Double) -> UIColor {
    // Clamp FPS between 0 and device refresh rate
    let clampedFps = max(0.0, min(fps, deviceRefreshRate))
    // Normalize to 0-1 range
    let normalized = clampedFps / deviceRefreshRate
    
    // Interpolate from red (255, 0, 0) to darker green (0, 180, 0)
    let red = CGFloat(255 * (1 - normalized)) / 255.0
    let green = CGFloat(180 * normalized) / 255.0
    let blue: CGFloat = 0.0
    
    return UIColor(red: red, green: green, blue: blue, alpha: 1.0)
  }
  
  deinit {
    stopMonitoring()
  }
}
