/**
 * Lossless WebM/Opus → OGG/Opus container remuxer.
 * No dependencies — pure TypeScript.
 *
 * The Meta WhatsApp Cloud API rejects audio/webm even when re-labeled as OGG.
 * This module extracts raw Opus packets from the WebM (Matroska/EBML) container
 * and wraps them in a valid OGG container that Meta accepts.
 */

// ─── OGG CRC-32 (polynomial 0x04C11DB7) ───────────────────────────
const CRC = new Uint32Array(256);
(() => {
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
    CRC[i] = r >>> 0;
  }
})();

function crc32(data: Uint8Array): number {
  let c = 0;
  for (let i = 0; i < data.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ data[i]) & 0xff]) >>> 0;
  return c;
}

// ─── EBML helpers ──────────────────────────────────────────────────
function readVint(d: Uint8Array, o: number): [value: number, len: number] {
  if (o >= d.length) return [0, 0];
  const f = d[o];
  let len = 1, mask = 0x80;
  while (len < 8 && !(f & mask)) { len++; mask >>= 1; }
  let v = f & (mask - 1);
  for (let i = 1; i < len; i++) v = v * 256 + (d[o + i] ?? 0);
  return [v, len];
}

function readId(d: Uint8Array, o: number): [id: number, len: number] {
  if (o >= d.length) return [0, 0];
  const f = d[o];
  const len = f & 0x80 ? 1 : f & 0x40 ? 2 : f & 0x20 ? 3 : f & 0x10 ? 4 : 1;
  let id = 0;
  for (let i = 0; i < len; i++) id = id * 256 + (d[o + i] ?? 0);
  return [id, len];
}

// WebM element IDs we care about
const SEGMENT = 0x18538067;
const CLUSTER = 0x1f43b675;
const SIMPLE_BLOCK = 0xa3;

function extractOpusPackets(data: Uint8Array): Uint8Array[] {
  const packets: Uint8Array[] = [];

  function scan(start: number, end: number) {
    let pos = start;
    while (pos < end && pos < data.length) {
      const [id, idLen] = readId(data, pos);
      if (idLen === 0) break;
      const [size, sizeLen] = readVint(data, pos + idLen);
      if (sizeLen === 0) break;

      const dataStart = pos + idLen + sizeLen;
      const elemEnd = dataStart + size > end ? end : dataStart + size;

      if (id === SEGMENT || id === CLUSTER) {
        scan(dataStart, elemEnd);
      } else if (id === SIMPLE_BLOCK) {
        // SimpleBlock: trackNum(vint) + timecode(2) + flags(1) + opus data
        const [, tLen] = readVint(data, dataStart);
        const hdr = tLen + 3;
        if (dataStart + hdr < elemEnd) {
          packets.push(data.slice(dataStart + hdr, elemEnd));
        }
      }

      pos = elemEnd;
      if (pos <= dataStart) break; // safety
    }
  }

  scan(0, data.length);
  return packets;
}

// ─── Opus helpers ──────────────────────────────────────────────────
function opusPacketSamples(pkt: Uint8Array): number {
  if (pkt.length === 0) return 960;
  const toc = pkt[0];
  const cfg = (toc >> 3) & 0x1f;
  const c = toc & 0x03;

  // Frame duration in samples at 48 kHz
  let fs: number;
  if (cfg <= 11) fs = [480, 960, 1920, 2880][cfg % 4];
  else if (cfg <= 15) fs = [480, 960][cfg % 2];
  else fs = [120, 240, 480, 960][cfg % 4];

  const frames = c < 2 ? c + 1 : c === 2 ? 2 : pkt.length > 1 ? pkt[1] & 0x3f : 1;
  return fs * frames;
}

// ─── OGG page builder ──────────────────────────────────────────────
function oggPage(
  headerType: number,
  granule: bigint,
  serial: number,
  seq: number,
  pkts: Uint8Array[],
): Uint8Array {
  const segs: number[] = [];
  for (const p of pkts) {
    let r = p.length;
    while (r >= 255) { segs.push(255); r -= 255; }
    segs.push(r);
  }

  const dataLen = pkts.reduce((s, p) => s + p.length, 0);
  const page = new Uint8Array(27 + segs.length + dataLen);
  const v = new DataView(page.buffer);

  // "OggS"
  page[0] = 0x4f; page[1] = 0x67; page[2] = 0x67; page[3] = 0x53;
  page[4] = 0;           // version
  page[5] = headerType;
  v.setBigInt64(6, granule, true);
  v.setUint32(14, serial, true);
  v.setUint32(18, seq, true);
  // CRC placeholder at 22
  page[26] = segs.length;
  for (let i = 0; i < segs.length; i++) page[27 + i] = segs[i];

  let off = 27 + segs.length;
  for (const p of pkts) { page.set(p, off); off += p.length; }

  v.setUint32(22, crc32(page), true);
  return page;
}

// ─── Public API ────────────────────────────────────────────────────
export async function remuxWebmToOgg(webmBlob: Blob): Promise<Blob> {
  const data = new Uint8Array(await webmBlob.arrayBuffer());
  const packets = extractOpusPackets(data);

  if (packets.length === 0) {
    throw new Error("No Opus packets found in WebM");
  }

  const serial = (Math.random() * 0xffffffff) >>> 0;
  const pages: Uint8Array[] = [];
  let seq = 0;

  // Page 0 – OpusHead (BOS)
  const head = new Uint8Array(19);
  const hs = "OpusHead";
  for (let i = 0; i < 8; i++) head[i] = hs.charCodeAt(i);
  head[8] = 1;  // version
  head[9] = 1;  // channels (mono)
  new DataView(head.buffer).setUint16(10, 3840, true); // pre-skip 80 ms
  new DataView(head.buffer).setUint32(12, 48000, true); // sample rate
  pages.push(oggPage(0x02, 0n, serial, seq++, [head]));

  // Page 1 – OpusTags
  const vendor = "lovable";
  const tags = new Uint8Array(8 + 4 + vendor.length + 4);
  const ts = "OpusTags";
  for (let i = 0; i < 8; i++) tags[i] = ts.charCodeAt(i);
  new DataView(tags.buffer).setUint32(8, vendor.length, true);
  for (let i = 0; i < vendor.length; i++) tags[12 + i] = vendor.charCodeAt(i);
  pages.push(oggPage(0x00, 0n, serial, seq++, [tags]));

  // Audio pages (batch ~50 packets per page ≈ 1 s)
  const BATCH = 50;
  let granule = 0n;

  for (let i = 0; i < packets.length; i += BATCH) {
    const batch = packets.slice(i, Math.min(i + BATCH, packets.length));
    for (const p of batch) granule += BigInt(opusPacketSamples(p));
    const last = i + BATCH >= packets.length;
    pages.push(oggPage(last ? 0x04 : 0x00, granule, serial, seq++, batch));
  }

  return new Blob(pages as unknown as BlobPart[], { type: "audio/ogg; codecs=opus" });
}
