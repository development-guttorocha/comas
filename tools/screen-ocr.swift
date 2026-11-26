import Foundation
import Vision
import AppKit

// screen-ocr <image>: every recognised line with its box and the box of each of its letters,
// in image pixels with the origin at the top left, as JSON. Used by lib/screenDesign.
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }
let W = Double(cg.width), H = Double(cg.height)
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.recognitionLanguages = ["pt-BR", "en-US"]
req.usesLanguageCorrection = true
try VNImageRequestHandler(cgImage: cg).perform([req])
func px(_ b: CGRect) -> [String: Double] { ["x": b.minX * W, "y": (1 - b.maxY) * H, "w": b.width * W, "h": b.height * H] }
var out: [[String: Any]] = []
for o in req.results ?? [] {
  guard let c = o.topCandidates(1).first else { continue }
  var chars: [[String: Double]] = []
  var i = c.string.startIndex
  while i < c.string.endIndex {
    let next = c.string.index(after: i)
    if !c.string[i].isWhitespace, let box = try? c.boundingBox(for: i..<next)?.boundingBox { chars.append(px(box)) }
    i = next
  }
  var line: [String: Any] = px(o.boundingBox)
  line["text"] = c.string
  line["conf"] = c.confidence
  line["chars"] = chars
  out.append(line)
}
let data = try JSONSerialization.data(withJSONObject: ["width": W, "height": H, "lines": out])
FileHandle.standardOutput.write(data)
