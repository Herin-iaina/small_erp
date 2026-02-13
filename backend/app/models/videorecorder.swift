import SwiftUI
import ScreenCaptureKit
import AVFoundation
import Combine

struct ContentView: View {
    @StateObject private var recorder = ScreenRecorder()
    @State private var selectedDisplay: SCDisplay?
    @State private var selectedWindow: SCWindow?
    @State private var captureMode: CaptureMode = .fullScreen
    @State private var includeAudio = true
    @State private var quality: VideoQuality = .high
    @State private var countdown = 0
    @State private var showSettings = false
    
    enum CaptureMode: String, CaseIterable {
        case fullScreen = "Écran entier"
        case window = "Fenêtre spécifique"
    }
    
    enum VideoQuality: String, CaseIterable {
        case low = "Basse (720p)"
        case medium = "Moyenne (1080p)"
        case high = "Haute (1440p)"
        case ultra = "Ultra (4K)"
        
        var resolution: (width: Int, height: Int) {
            switch self {
            case .low: return (1280, 720)
            case .medium: return (1920, 1080)
            case .high: return (2560, 1440)
            case .ultra: return (3840, 2160)
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 20) {
            // Titre
            Text("Enregistreur d'écran Pro")
                .font(.system(size: 28, weight: .bold))
            
            if countdown > 0 {
                // Compte à rebours
                VStack {
                    Text("\(countdown)")
                        .font(.system(size: 80, weight: .bold))
                        .foregroundColor(.red)
                    Text("L'enregistrement commence...")
                        .font(.headline)
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                
            } else if recorder.isRecording {
                // Enregistrement en cours
                VStack(spacing: 15) {
                    HStack {
                        Circle()
                            .fill(.red)
                            .frame(width: 12, height: 12)
                        Text("Enregistrement en cours")
                            .font(.headline)
                    }
                    
                    if let duration = recorder.recordingDuration {
                        Text(formatDuration(duration))
                            .font(.system(size: 36, weight: .medium))
                            .monospacedDigit()
                    }
                    
                    Button(action: {
                        recorder.stopRecording()
                    }) {
                        HStack {
                            Image(systemName: "stop.fill")
                            Text("Arrêter l'enregistrement")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
                .padding()
                
            } else {
                // Configuration
                VStack(spacing: 20) {
                    // Mode de capture
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Mode de capture")
                            .font(.headline)
                        
                        Picker("", selection: $captureMode) {
                            ForEach(CaptureMode.allCases, id: \.self) { mode in
                                Text(mode.rawValue).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                    
                    // Sélection de fenêtre (si mode fenêtre)
                    if captureMode == .window {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Fenêtre à enregistrer")
                                .font(.headline)
                            
                            Button(action: {
                                Task {
                                    await recorder.loadWindows()
                                }
                            }) {
                                HStack {
                                    Image(systemName: "arrow.clockwise")
                                    Text(selectedWindow?.title ?? "Choisir une fenêtre")
                                        .lineLimit(1)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(8)
                                .background(Color.gray.opacity(0.2))
                                .cornerRadius(8)
                            }
                            .buttonStyle(.plain)
                            
                            if !recorder.availableWindows.isEmpty {
                                ScrollView {
                                    VStack(spacing: 4) {
                                        ForEach(recorder.availableWindows, id: \.windowID) { window in
                                            Button(action: {
                                                selectedWindow = window
                                            }) {
                                                HStack {
                                                    Text(window.title ?? "Sans titre")
                                                        .lineLimit(1)
                                                    Spacer()
                                                    if selectedWindow?.windowID == window.windowID {
                                                        Image(systemName: "checkmark")
                                                            .foregroundColor(.blue)
                                                    }
                                                }
                                                .padding(8)
                                                .background(selectedWindow?.windowID == window.windowID ? Color.blue.opacity(0.1) : Color.clear)
                                                .cornerRadius(6)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                }
                                .frame(height: 150)
                                .padding(8)
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(8)
                            }
                        }
                    }
                    
                    Divider()
                    
                    // Options
                    VStack(spacing: 12) {
                        Toggle(isOn: $includeAudio) {
                            HStack {
                                Image(systemName: "mic.fill")
                                Text("Enregistrer l'audio du système")
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Qualité vidéo")
                                .font(.headline)
                            
                            Picker("", selection: $quality) {
                                ForEach(VideoQuality.allCases, id: \.self) { q in
                                    Text(q.rawValue).tag(q)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                    
                    Divider()
                    
                    // Bouton démarrer
                    Button(action: {
                        startRecordingWithCountdown()
                    }) {
                        HStack {
                            Image(systemName: "record.circle.fill")
                            Text("Démarrer l'enregistrement")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
                .padding()
            }
            
            // Messages d'erreur
            if let error = recorder.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
            }
            
            // Vidéo sauvegardée
            if let outputURL = recorder.outputURL {
                VStack(spacing: 10) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Vidéo sauvegardée !")
                            .font(.headline)
                    }
                    
                    Text(outputURL.lastPathComponent)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                    
                    HStack(spacing: 10) {
                        Button("Révéler dans Finder") {
                            NSWorkspace.shared.selectFile(outputURL.path, inFileViewerRootedAtPath: "")
                        }
                        .buttonStyle(.bordered)
                        
                        Button("Lire") {
                            NSWorkspace.shared.open(outputURL)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .padding()
                .background(Color.green.opacity(0.1))
                .cornerRadius(10)
            }
        }
        .padding(30)
        .frame(width: 500, height: 600)
    }
    
    func startRecordingWithCountdown() {
        countdown = 3
        
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { timer in
            countdown -= 1
            
            if countdown == 0 {
                timer.invalidate()
                Task {
                    await recorder.startRecording(
                        mode: captureMode,
                        window: selectedWindow,
                        includeAudio: includeAudio,
                        quality: quality
                    )
                }
            }
        }
    }
    
    func formatDuration(_ seconds: TimeInterval) -> String {
        let hours = Int(seconds) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        let secs = Int(seconds) % 60
        
        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }
}

class ScreenRecorder: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var errorMessage: String?
    @Published var outputURL: URL?
    @Published var recordingDuration: TimeInterval?
    @Published var availableWindows: [SCWindow] = []
    
    private var streamOutput: StreamOutput?
    private var stream: SCStream?
    private var recordingStartTime: Date?
    private var durationTimer: Timer?
    
    func loadWindows() async {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            await MainActor.run {
                self.availableWindows = content.windows.filter { window in
                    guard let title = window.title, !title.isEmpty else { return false }
                    return window.frame.width > 100 && window.frame.height > 100
                }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Impossible de charger les fenêtres"
            }
        }
    }
    
    func startRecording(mode: ContentView.CaptureMode, window: SCWindow?, includeAudio: Bool, quality: ContentView.VideoQuality) async {
        errorMessage = nil
        outputURL = nil
        recordingDuration = nil
        
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            
            guard let display = content.displays.first else {
                errorMessage = "Aucun écran détecté"
                return
            }
            
            // Configuration
            let config = SCStreamConfiguration()
            
            let res = quality.resolution
            config.width = res.width
            config.height = res.height
            config.minimumFrameInterval = CMTime(value: 1, timescale: 60)
            config.queueDepth = 5
            
            // Audio
            if includeAudio {
                config.capturesAudio = true
                config.excludesCurrentProcessAudio = true
            }
            
            // Fichier de sortie
            let desktopURL = URL(fileURLWithPath: NSString(string: "~/Desktop").expandingTildeInPath)
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd-HH-mm-ss"
            let fileName = "Enregistrement-\(dateFormatter.string(from: Date())).mp4"
            outputURL = desktopURL.appendingPathComponent(fileName)
            
            // Stream output
            streamOutput = try StreamOutput(outputURL: outputURL!, quality: quality, includeAudio: includeAudio)
            
            // Filtre selon le mode
            let filter: SCContentFilter
            if mode == .window, let selectedWindow = window {
                filter = SCContentFilter(desktopIndependentWindow: selectedWindow)
            } else {
                filter = SCContentFilter(display: display, excludingWindows: [])
            }
            
            // Créer le stream
            stream = SCStream(filter: filter, configuration: config, delegate: nil)
            
            // Ajouter outputs
            try stream?.addStreamOutput(streamOutput!, type: .screen, sampleHandlerQueue: DispatchQueue.main)
            
            if includeAudio {
                try stream?.addStreamOutput(streamOutput!, type: .audio, sampleHandlerQueue: DispatchQueue.main)
            }
            
            // Démarrer
            try await stream?.startCapture()
            
            isRecording = true
            recordingStartTime = Date()
            
            // Timer pour la durée
            durationTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                guard let self = self, let startTime = self.recordingStartTime else { return }
                self.recordingDuration = Date().timeIntervalSince(startTime)
            }
            
        } catch {
            errorMessage = "Erreur : \(error.localizedDescription)"
        }
    }
    
    func stopRecording() {
        durationTimer?.invalidate()
        durationTimer = nil
        
        Task {
            do {
                try await stream?.stopCapture()
                await streamOutput?.finishWriting()
                isRecording = false
                recordingStartTime = nil
            } catch {
                errorMessage = "Erreur lors de l'arrêt : \(error.localizedDescription)"
            }
        }
    }
}

class StreamOutput: NSObject, SCStreamOutput {
    private var assetWriter: AVAssetWriter?
    private var videoInput: AVAssetWriterInput?
    private var audioInput: AVAssetWriterInput?
    private var pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
    private var isSessionStarted = false
    private var frameCount: Int64 = 0
    private let includeAudio: Bool
    
    init(outputURL: URL, quality: ContentView.VideoQuality, includeAudio: Bool) throws {
        self.includeAudio = includeAudio
        super.init()
        
        assetWriter = try AVAssetWriter(url: outputURL, fileType: .mp4)
        
        let res = quality.resolution
        // Bitrate adaptatif selon la qualité
        let bitrate: Int
        switch quality {
        case .low:
            bitrate = 2_500_000  // 2.5 Mbps pour 720p
        case .medium:
            bitrate = 4_000_000  // 4 Mbps pour 1080p
        case .high:
            bitrate = 6_000_000  // 6 Mbps pour 1440p
        case .ultra:
            bitrate = 10_000_000 // 10 Mbps pour 4K
        }
        
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: res.width,
            AVVideoHeightKey: res.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: bitrate,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoMaxKeyFrameIntervalKey: 60,  // Keyframe toutes les 60 frames
                AVVideoExpectedSourceFrameRateKey: 60,
                AVVideoH264EntropyModeKey: AVVideoH264EntropyModeCABAC  // Meilleure compression
            ]
        ]
        
        videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        videoInput?.expectsMediaDataInRealTime = true
        
        let sourcePixelBufferAttributes: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: res.width,
            kCVPixelBufferHeightKey as String: res.height
        ]
        
        pixelBufferAdaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: videoInput!,
            sourcePixelBufferAttributes: sourcePixelBufferAttributes
        )
        
        if let videoInput = videoInput {
            assetWriter?.add(videoInput)
        }
        
        // Audio
        if includeAudio {
            let audioSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 48000,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 128000
            ]
            
            audioInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
            audioInput?.expectsMediaDataInRealTime = true
            
            if let audioInput = audioInput {
                assetWriter?.add(audioInput)
            }
        }
        
        assetWriter?.startWriting()
    }
    
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard sampleBuffer.isValid else { return }
        
        if !isSessionStarted {
            let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
            assetWriter?.startSession(atSourceTime: presentationTime)
            isSessionStarted = true
        }
        
        switch type {
        case .screen:
            guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer),
                  videoInput?.isReadyForMoreMediaData == true else { return }
            
            let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
            pixelBufferAdaptor?.append(pixelBuffer, withPresentationTime: presentationTime)
            frameCount += 1
            
        case .audio:
            guard includeAudio,
                  audioInput?.isReadyForMoreMediaData == true else { return }
            audioInput?.append(sampleBuffer)
            
        case .microphone:
            break
        @unknown default:
            break
        }
    }
    
    func finishWriting() async {
        videoInput?.markAsFinished()
        audioInput?.markAsFinished()
        await assetWriter?.finishWriting()
    }
}
