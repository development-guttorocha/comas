// Text of each page of a PDF, with macOS's own PDFKit (no dependency to install).
// The admin compiles it once into .admin/bin/ (lib/material/extract.ts) and runs it on this Mac.
// Usage: pdf-text <file.pdf>  →  {"pages": ["text of page 1", …]} on stdout.
import Foundation
import PDFKit

let args = CommandLine.arguments
guard args.count > 1, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
  FileHandle.standardError.write("Não foi possível abrir o PDF.\n".data(using: .utf8)!)
  exit(1)
}
if doc.isLocked {
  FileHandle.standardError.write("O PDF está protegido por senha.\n".data(using: .utf8)!)
  exit(2)
}
var pages: [String] = []
for i in 0..<doc.pageCount { pages.append(doc.page(at: i)?.string ?? "") }
let data = try! JSONSerialization.data(withJSONObject: ["pages": pages])
FileHandle.standardOutput.write(data)
