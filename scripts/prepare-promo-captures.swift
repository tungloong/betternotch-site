#!/usr/bin/swift
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Source pixels from the two product-owner-approved App Store compositions.
// Re-encoding removes source metadata. Only the MacBook's off-canvas Dock is
// cropped away; source-width scaling and visible menu-bar coordinates stay intact.
let destination = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let candidates = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates", isDirectory: true)
let captures: [(String, String, Int, Int, Int)] = [
    ("2026-09-19-2.0-hero-r7/source/original.png", "promo-original", 2320, 820, 1600),
    ("2026-09-19-2.0-hero-r7/source/gradient.png", "promo-gradient", 2320, 820, 1600),
    ("2026-09-19-2.0-hero-r7/source/glass-ink.png", "promo-glass-ink", 2320, 820, 1600),
    ("2026-09-20-2.0-glass-r9/source/external.png", "promo-external", 5120, 2880, 2200),
    ("2026-09-20-2.0-glass-r9/source/builtin.png", "promo-builtin", 3420, 1800, 2200),
    ("2026-09-20-2.0-glass-r9/source/ipad.png", "promo-sidecar", 1194, 834, 1194),
]
try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)
for (sourcePath, name, cropWidth, cropHeight, outputWidth) in captures {
    let source = CGImageSourceCreateWithURL(candidates.appendingPathComponent(sourcePath) as CFURL, nil)!
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)!
    precondition(image.width == cropWidth && image.height >= cropHeight)
    let crop = image.cropping(to: CGRect(x: 0, y: 0, width: cropWidth, height: cropHeight))!
    let outputHeight = Int((Double(cropHeight) * Double(outputWidth) / Double(cropWidth)).rounded())
    let context = CGContext(data: nil, width: outputWidth, height: outputHeight,
        bitsPerComponent: 8, bytesPerRow: outputWidth * 4,
        space: CGColorSpace(name: CGColorSpace.sRGB)!,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    context.interpolationQuality = .high
    context.draw(crop, in: CGRect(x: 0, y: 0, width: outputWidth, height: outputHeight))
    let url = destination.appendingPathComponent(name + ".jpg")
    let writer = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(writer, context.makeImage()!, [kCGImageDestinationLossyCompressionQuality: 0.92] as CFDictionary)
    precondition(CGImageDestinationFinalize(writer))
    print("Wrote \(name).jpg \(outputWidth)×\(outputHeight)")
}
