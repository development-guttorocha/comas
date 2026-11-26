import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

// Audio for the admin's music library, on this machine only: macOS's own converter
// (afconvert) decodes any common format and encodes the AAC the site serves.

const run = promisify(execFile);

async function afconvert(args: string[]) {
  try {
    await run("/usr/bin/afconvert", args, { timeout: 120_000 });
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    throw new Error(missing ? "Este computador não tem o conversor de áudio do macOS (afconvert)." : "Não consegui ler este arquivo de áudio. Tente um MP3, M4A ou WAV.");
  }
}

/** A 16-bit PCM WAV file: its samples and format. */
async function readWav(file: string) {
  const buf = await readFile(file);
  let p = 12;
  let fmt = { channels: 1, rate: 44100, bits: 16 };
  while (p + 8 <= buf.length) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { channels: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === "data") return { ...fmt, data: buf.subarray(p + 8, p + 8 + size) };
    p += 8 + size + (size % 2);
  }
  throw new Error("Arquivo de áudio sem dados.");
}

/** Mono samples at a low rate, for the analysis. */
export async function decodeMono(input: string, work: string, rate = 11025) {
  const wav = `${work}/mono.wav`;
  await afconvert(["-f", "WAVE", "-d", `LEI16@${rate}`, "-c", "1", input, wav]);
  const { data } = await readWav(wav);
  const pcm = new Float32Array(data.length / 2);
  for (let i = 0; i < pcm.length; i++) pcm[i] = data.readInt16LE(i * 2) / 32768;
  return { pcm, rate };
}

/** The first `seconds` of the song, with a short fade at the end, as AAC (.m4a). */
export async function cutToAac(input: string, work: string, seconds: number, out: string) {
  const full = `${work}/full.wav`;
  await afconvert(["-f", "WAVE", "-d", "LEI16@44100", "-c", "2", input, full]);
  const wav = await readWav(full);
  const frame = wav.channels * 2;
  const frames = Math.min(Math.floor(seconds * wav.rate), Math.floor(wav.data.length / frame));
  const body = Buffer.from(wav.data.subarray(0, frames * frame));
  const fade = Math.floor(0.08 * wav.rate);
  for (let f = Math.max(0, frames - fade); f < frames; f++) {
    const g = (frames - f) / fade;
    for (let c = 0; c < wav.channels; c++) {
      const at = f * frame + c * 2;
      body.writeInt16LE(Math.round(body.readInt16LE(at) * g), at);
    }
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + body.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(wav.channels, 22);
  header.writeUInt32LE(wav.rate, 24);
  header.writeUInt32LE(wav.rate * frame, 28);
  header.writeUInt16LE(frame, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(body.length, 40);
  const cut = `${work}/cut.wav`;
  await writeFile(cut, Buffer.concat([header, body]));
  await afconvert(["-f", "m4af", "-d", "aac", "-b", "160000", cut, out]);
  return frames / wav.rate;
}
