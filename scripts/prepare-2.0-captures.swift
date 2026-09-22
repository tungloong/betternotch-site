#!/usr/bin/swift
import AppKit
import CoreText
import ImageIO
import UniformTypeIdentifiers

let assets = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let glassBuiltin = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-20-2.0-glass-r9/source/builtin.png")
let gradient = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-19-2.0-hero-r7/source/gradient.png")
let ink = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-20-2.0-ink-r4/source/pointer-05-menu.png")
let windowEN = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-20-2.0-controls-r5/source/main-window-en-US.png")
let windowZH = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-20-2.0-controls-r5/source/main-window-zh-Hans.png")
let blendEN = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-20-2.0-details-r4/source/blend-window-en-US.png")
let blendZH = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-20-2.0-details-r4/source/blend-window-zh-Hans.png")
let glassEN = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-20-2.0-details-r4/source/glass-window-en-US.png")
let glassZH = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/AppStore/Candidates/2026-09-20-2.0-details-r4/source/glass-window-zh-Hans.png")
let icon = URL(fileURLWithPath: "/Users/tungloong/Codes/BetterNotchAssets/Design/Icon/Releases/2.0/AppIcon.appiconset/icon_128x128.png")

func load(_ url: URL) -> CGImage {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: true] as CFDictionary),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        fputs("error: could not read \(url.path)\n", stderr)
        exit(1)
    }
    return image
}

func crop(_ image: CGImage, x: Int, y: Int, width: Int, height: Int, expected: (Int, Int)? = nil) -> CGImage {
    if let expected {
        guard image.width == expected.0, image.height == expected.1 else {
            fputs("error: unexpected size \(image.width)x\(image.height) (wanted \(expected.0)x\(expected.1))\n", stderr)
            exit(1)
        }
    }
    let rect = CGRect(x: x, y: y, width: width, height: height)
    guard let cropped = image.cropping(to: rect) else {
        fputs("error: crop \(rect) failed\n", stderr)
        exit(1)
    }
    return cropped
}

func opaque(_ image: CGImage, width: Int? = nil, height: Int? = nil) -> CGImage {
    let outWidth = width ?? image.width
    let outHeight = height ?? image.height
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let context = CGContext(
        data: nil,
        width: outWidth,
        height: outHeight,
        bitsPerComponent: 8,
        bytesPerRow: outWidth * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    ) else {
        fputs("error: could not allocate bitmap \(outWidth)x\(outHeight)\n", stderr)
        exit(1)
    }
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(x: 0, y: 0, width: outWidth, height: outHeight))
    guard let result = context.makeImage() else {
        fputs("error: could not flatten bitmap\n", stderr)
        exit(1)
    }
    return result
}

/// Keep product pixels inside a measured rounded chrome; exterior becomes transparent.
func punchOutsideRoundRect(_ image: CGImage, radius: CGFloat) -> CGImage {
    let width = image.width
    let height = image.height
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fputs("error: could not allocate alpha round-rect bitmap \(width)x\(height)\n", stderr)
        exit(1)
    }
    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
    let rect = CGRect(x: 0, y: 0, width: width, height: height)
    context.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
    context.clip()
    context.interpolationQuality = .high
    context.draw(image, in: rect)
    guard let result = context.makeImage() else {
        fputs("error: could not flatten alpha round-rect bitmap\n", stderr)
        exit(1)
    }
    return result
}

/// 1200×630 shared OG: promo page fill, 2.0 icon, BetterNotch wordmark, real gradient capture.
/// Crop starts after English menu titles. No slogan or control-UI lettering.
func composeOpenGraph(icon: CGImage, capture: CGImage) -> CGImage {
    let width = 1200
    let height = 630
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fputs("error: could not allocate OG bitmap\n", stderr)
        exit(1)
    }

    let page = CGColor(srgbRed: 244.0 / 255.0, green: 243.0 / 255.0, blue: 236.0 / 255.0, alpha: 1)
    context.setFillColor(page)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))

    let iconSize: CGFloat = 96
    let iconX: CGFloat = 56
    let iconY = CGFloat(height) - 36 - iconSize
    context.interpolationQuality = .high
    context.draw(icon, in: CGRect(x: iconX, y: iconY, width: iconSize, height: iconSize))

    let font = CTFontCreateUIFontForLanguage(.system, 48, nil)
        ?? CTFontCreateWithName("SF Pro Display" as CFString, 48, nil)
    let ink = CGColor(srgbRed: 34.0 / 255.0, green: 46.0 / 255.0, blue: 43.0 / 255.0, alpha: 1)
    let attributes: [CFString: Any] = [
        kCTFontAttributeName: font,
        kCTForegroundColorAttributeName: ink,
        kCTKernAttributeName: -1.7,
    ]
    let attributed = CFAttributedStringCreate(nil, "BetterNotch" as CFString, attributes as CFDictionary)!
    let line = CTLineCreateWithAttributedString(attributed)
    var ascent: CGFloat = 0
    var descent: CGFloat = 0
    var leading: CGFloat = 0
    CTLineGetTypographicBounds(line, &ascent, &descent, &leading)
    let textX = iconX + iconSize + 18
    let textY = iconY + (iconSize - (ascent + descent)) / 2 + descent
    context.textMatrix = .identity
    context.textPosition = CGPoint(x: textX, y: textY)
    CTLineDraw(line, context)

    let captureRect = CGRect(x: 56, y: 40, width: 1088, height: 430)
    let capturePath = CGPath(roundedRect: captureRect, cornerWidth: 18, cornerHeight: 18, transform: nil)
    context.saveGState()
    context.setShadow(
        offset: CGSize(width: 0, height: -8),
        blur: 24,
        color: CGColor(srgbRed: 40.0 / 255.0, green: 34.0 / 255.0, blue: 28.0 / 255.0, alpha: 0.14)
    )
    context.setFillColor(page)
    context.addPath(capturePath)
    context.fillPath()
    context.restoreGState()

    context.saveGState()
    context.addPath(capturePath)
    context.clip()
    context.interpolationQuality = .high
    context.draw(capture, in: captureRect)
    context.restoreGState()

    guard let result = context.makeImage() else {
        fputs("error: could not flatten OG composite\n", stderr)
        exit(1)
    }
    return opaque(result, width: width, height: height)
}

func write(_ image: CGImage, to name: String, preserveAlpha: Bool = false) {
    let url = assets.appendingPathComponent(name)
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        fputs("error: could not create \(url.path)\n", stderr)
        exit(1)
    }
    let properties: [CFString: Any] = preserveAlpha
        ? [:]
        : [kCGImagePropertyHasAlpha: false, kCGImageDestinationLossyCompressionQuality: 1.0]
    CGImageDestinationAddImage(destination, image, properties as CFDictionary)
    guard CGImageDestinationFinalize(destination) else {
        fputs("error: could not write \(url.path)\n", stderr)
        exit(1)
    }
    print("wrote \(name) \(image.width)x\(image.height)")
}

try FileManager.default.createDirectory(at: assets, withIntermediateDirectories: true)

let glassStrip = opaque(crop(load(glassBuiltin), x: 0, y: 0, width: 2320, height: 450, expected: (3420, 2224)))
write(glassStrip, to: "menubar-glass-ink.png")
write(opaque(glassStrip, width: 1392, height: 270), to: "menubar-glass-ink-web.png")

let gradientStrip = opaque(load(gradient))
guard gradientStrip.width == 2320, gradientStrip.height == 820 else {
    fputs("error: unexpected gradient source \(gradientStrip.width)x\(gradientStrip.height)\n", stderr)
    exit(1)
}
write(gradientStrip, to: "menubar-gradient.png")
write(opaque(crop(gradientStrip, x: 0, y: 0, width: 2320, height: 480), width: 1392, height: 288), to: "menubar-gradient-web.png")

let inkStrip = opaque(load(ink))
guard inkStrip.width == 2320, inkStrip.height == 450 else {
    fputs("error: unexpected ink source \(inkStrip.width)x\(inkStrip.height)\n", stderr)
    exit(1)
}
write(inkStrip, to: "menubar-ink.png")
write(opaque(inkStrip, width: 1392, height: 270), to: "menubar-ink-web.png")

let windowEnCrop = punchOutsideRoundRect(opaque(crop(load(windowEN), x: 48, y: 48, width: 1240, height: 958, expected: (1336, 1054))), radius: 32)
write(windowEnCrop, to: "window-en.png", preserveAlpha: true)
write(windowEnCrop, to: "window-en-web.png", preserveAlpha: true)

let windowZhCrop = punchOutsideRoundRect(opaque(crop(load(windowZH), x: 112, y: 76, width: 1240, height: 1006, expected: (1464, 1230))), radius: 32)
write(windowZhCrop, to: "window-zh.png", preserveAlpha: true)
write(windowZhCrop, to: "window-zh-web.png", preserveAlpha: true)

func panel(_ url: URL, expectedHeight: Int, name: String) {
    let cropped = punchOutsideRoundRect(
        opaque(crop(load(url), x: 26, y: 26, width: 1120, height: expectedHeight - 52, expected: (1172, expectedHeight))),
        radius: 24
    )
    write(cropped, to: name, preserveAlpha: true)
    write(cropped, to: name.replacingOccurrences(of: ".png", with: "-web.png"), preserveAlpha: true)
}

panel(blendEN, expectedHeight: 766, name: "details-blend-en.png")
panel(blendZH, expectedHeight: 766, name: "details-blend-zh.png")
panel(glassEN, expectedHeight: 726, name: "details-glass-en.png")
panel(glassZH, expectedHeight: 726, name: "details-glass-zh.png")

let iconImage = load(icon)
guard iconImage.width == 128, iconImage.height == 128 else {
    fputs("error: unexpected icon size \(iconImage.width)x\(iconImage.height)\n", stderr)
    exit(1)
}
write(iconImage, to: "betternotch-icon-128.png", preserveAlpha: true)

let ogCapture = opaque(crop(gradientStrip, x: 800, y: 0, width: 870, height: 344))
write(composeOpenGraph(icon: iconImage, capture: ogCapture), to: "og-betternotch-2.0.png")
