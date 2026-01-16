var Rt = Object.defineProperty;
var _t = (i, e, t) => e in i ? Rt(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var de = (i, e, t) => _t(i, typeof e != "symbol" ? e + "" : e, t);
import { ipcMain as Pe, dialog as Mt } from "electron";
import ke, { open as Ft } from "node:fs/promises";
import N from "node:path";
import tt from "tty";
import Bt from "util";
import Dt from "os";
import { randomFillSync as Ot, randomUUID as Pt } from "node:crypto";
const I = [];
for (let i = 0; i < 256; ++i)
  I.push((i + 256).toString(16).slice(1));
function zt(i, e = 0) {
  return (I[i[e + 0]] + I[i[e + 1]] + I[i[e + 2]] + I[i[e + 3]] + "-" + I[i[e + 4]] + I[i[e + 5]] + "-" + I[i[e + 6]] + I[i[e + 7]] + "-" + I[i[e + 8]] + I[i[e + 9]] + "-" + I[i[e + 10]] + I[i[e + 11]] + I[i[e + 12]] + I[i[e + 13]] + I[i[e + 14]] + I[i[e + 15]]).toLowerCase();
}
const ae = new Uint8Array(256);
let Y = ae.length;
function Lt() {
  return Y > ae.length - 16 && (Ot(ae), Y = 0), ae.slice(Y, Y += 16);
}
const ze = { randomUUID: Pt };
function Nt(i, e, t) {
  var n;
  i = i || {};
  const r = i.random ?? ((n = i.rng) == null ? void 0 : n.call(i)) ?? Lt();
  if (r.length < 16)
    throw new Error("Random bytes length must be >= 16");
  return r[6] = r[6] & 15 | 64, r[8] = r[8] & 63 | 128, zt(r);
}
function Le(i, e, t) {
  return ze.randomUUID && !i ? ze.randomUUID() : Nt(i);
}
const Ut = "End-Of-Stream";
class v extends Error {
  constructor() {
    super(Ut), this.name = "EndOfStreamError";
  }
}
class Xt extends Error {
  constructor(e = "The operation was aborted") {
    super(e), this.name = "AbortError";
  }
}
class it {
  constructor() {
    this.endOfStream = !1, this.interrupted = !1, this.peekQueue = [];
  }
  async peek(e, t = !1) {
    const r = await this.read(e, t);
    return this.peekQueue.push(e.subarray(0, r)), r;
  }
  async read(e, t = !1) {
    if (e.length === 0)
      return 0;
    let r = this.readFromPeekBuffer(e);
    if (this.endOfStream || (r += await this.readRemainderFromStream(e.subarray(r), t)), r === 0 && !t)
      throw new v();
    return r;
  }
  /**
   * Read chunk from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @returns Number of bytes read
   */
  readFromPeekBuffer(e) {
    let t = e.length, r = 0;
    for (; this.peekQueue.length > 0 && t > 0; ) {
      const n = this.peekQueue.pop();
      if (!n)
        throw new Error("peekData should be defined");
      const a = Math.min(n.length, t);
      e.set(n.subarray(0, a), r), r += a, t -= a, a < n.length && this.peekQueue.push(n.subarray(a));
    }
    return r;
  }
  async readRemainderFromStream(e, t) {
    let r = 0;
    for (; r < e.length && !this.endOfStream; ) {
      if (this.interrupted)
        throw new Xt();
      const n = await this.readFromStream(e.subarray(r), t);
      if (n === 0)
        break;
      r += n;
    }
    if (!t && r < e.length)
      throw new v();
    return r;
  }
}
class Gt extends it {
  constructor(e) {
    super(), this.reader = e;
  }
  async abort() {
    return this.close();
  }
  async close() {
    this.reader.releaseLock();
  }
}
class jt extends Gt {
  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  async readFromStream(e, t) {
    if (e.length === 0)
      return 0;
    const r = await this.reader.read(new Uint8Array(e.length), { min: t ? void 0 : e.length });
    return r.done && (this.endOfStream = r.done), r.value ? (e.set(r.value), r.value.length) : 0;
  }
}
class Ne extends it {
  constructor(e) {
    super(), this.reader = e, this.buffer = null;
  }
  /**
   * Copy chunk to target, and store the remainder in this.buffer
   */
  writeChunk(e, t) {
    const r = Math.min(t.length, e.length);
    return e.set(t.subarray(0, r)), r < t.length ? this.buffer = t.subarray(r) : this.buffer = null, r;
  }
  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  async readFromStream(e, t) {
    if (e.length === 0)
      return 0;
    let r = 0;
    for (this.buffer && (r += this.writeChunk(e, this.buffer)); r < e.length && !this.endOfStream; ) {
      const n = await this.reader.read();
      if (n.done) {
        this.endOfStream = !0;
        break;
      }
      n.value && (r += this.writeChunk(e.subarray(r), n.value));
    }
    if (!t && r === 0 && this.endOfStream)
      throw new v();
    return r;
  }
  abort() {
    return this.interrupted = !0, this.reader.cancel();
  }
  async close() {
    await this.abort(), this.reader.releaseLock();
  }
}
function Wt(i) {
  try {
    const e = i.getReader({ mode: "byob" });
    return e instanceof ReadableStreamDefaultReader ? new Ne(e) : new jt(e);
  } catch (e) {
    if (e instanceof TypeError)
      return new Ne(i.getReader());
    throw e;
  }
}
class le {
  /**
   * Constructor
   * @param options Tokenizer options
   * @protected
   */
  constructor(e) {
    this.numBuffer = new Uint8Array(8), this.position = 0, this.onClose = e == null ? void 0 : e.onClose, e != null && e.abortSignal && e.abortSignal.addEventListener("abort", () => {
      this.abort();
    });
  }
  /**
   * Read a token from the tokenizer-stream
   * @param token - The token to read
   * @param position - If provided, the desired position in the tokenizer-stream
   * @returns Promise with token data
   */
  async readToken(e, t = this.position) {
    const r = new Uint8Array(e.len);
    if (await this.readBuffer(r, { position: t }) < e.len)
      throw new v();
    return e.get(r, 0);
  }
  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @returns Promise with token data
   */
  async peekToken(e, t = this.position) {
    const r = new Uint8Array(e.len);
    if (await this.peekBuffer(r, { position: t }) < e.len)
      throw new v();
    return e.get(r, 0);
  }
  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  async readNumber(e) {
    if (await this.readBuffer(this.numBuffer, { length: e.len }) < e.len)
      throw new v();
    return e.get(this.numBuffer, 0);
  }
  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  async peekNumber(e) {
    if (await this.peekBuffer(this.numBuffer, { length: e.len }) < e.len)
      throw new v();
    return e.get(this.numBuffer, 0);
  }
  /**
   * Ignore number of bytes, advances the pointer in under tokenizer-stream.
   * @param length - Number of bytes to ignore
   * @return resolves the number of bytes ignored, equals length if this available, otherwise the number of bytes available
   */
  async ignore(e) {
    if (this.fileInfo.size !== void 0) {
      const t = this.fileInfo.size - this.position;
      if (e > t)
        return this.position += t, t;
    }
    return this.position += e, e;
  }
  async close() {
    var e;
    await this.abort(), await ((e = this.onClose) == null ? void 0 : e.call(this));
  }
  normalizeOptions(e, t) {
    if (!this.supportsRandomAccess() && t && t.position !== void 0 && t.position < this.position)
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    return {
      mayBeLess: !1,
      offset: 0,
      length: e.length,
      position: this.position,
      ...t
    };
  }
  abort() {
    return Promise.resolve();
  }
}
const Ht = 256e3;
class qt extends le {
  /**
   * Constructor
   * @param streamReader stream-reader to read from
   * @param options Tokenizer options
   */
  constructor(e, t) {
    super(t), this.streamReader = e, this.fileInfo = (t == null ? void 0 : t.fileInfo) ?? {};
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Target Uint8Array to fill with data read from the tokenizer-stream
   * @param options - Read behaviour options
   * @returns Promise with number of bytes read
   */
  async readBuffer(e, t) {
    const r = this.normalizeOptions(e, t), n = r.position - this.position;
    if (n > 0)
      return await this.ignore(n), this.readBuffer(e, t);
    if (n < 0)
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    if (r.length === 0)
      return 0;
    const a = await this.streamReader.read(e.subarray(0, r.length), r.mayBeLess);
    if (this.position += a, (!t || !t.mayBeLess) && a < r.length)
      throw new v();
    return a;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise with number of bytes peeked
   */
  async peekBuffer(e, t) {
    const r = this.normalizeOptions(e, t);
    let n = 0;
    if (r.position) {
      const a = r.position - this.position;
      if (a > 0) {
        const s = new Uint8Array(r.length + a);
        return n = await this.peekBuffer(s, { mayBeLess: r.mayBeLess }), e.set(s.subarray(a)), n - a;
      }
      if (a < 0)
        throw new Error("Cannot peek from a negative offset in a stream");
    }
    if (r.length > 0) {
      try {
        n = await this.streamReader.peek(e.subarray(0, r.length), r.mayBeLess);
      } catch (a) {
        if (t != null && t.mayBeLess && a instanceof v)
          return 0;
        throw a;
      }
      if (!r.mayBeLess && n < r.length)
        throw new v();
    }
    return n;
  }
  async ignore(e) {
    const t = Math.min(Ht, e), r = new Uint8Array(t);
    let n = 0;
    for (; n < e; ) {
      const a = e - n, s = await this.readBuffer(r, { length: Math.min(t, a) });
      if (s < 0)
        return s;
      n += s;
    }
    return n;
  }
  abort() {
    return this.streamReader.abort();
  }
  async close() {
    return this.streamReader.close();
  }
  supportsRandomAccess() {
    return !1;
  }
}
class $t extends le {
  /**
   * Construct BufferTokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(e, t) {
    super(t), this.uint8Array = e, this.fileInfo = { ...(t == null ? void 0 : t.fileInfo) ?? {}, size: e.length };
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async readBuffer(e, t) {
    t != null && t.position && (this.position = t.position);
    const r = await this.peekBuffer(e, t);
    return this.position += r, r;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async peekBuffer(e, t) {
    const r = this.normalizeOptions(e, t), n = Math.min(this.uint8Array.length - r.position, r.length);
    if (!r.mayBeLess && n < r.length)
      throw new v();
    return e.set(this.uint8Array.subarray(r.position, r.position + n)), n;
  }
  close() {
    return super.close();
  }
  supportsRandomAccess() {
    return !0;
  }
  setPosition(e) {
    this.position = e;
  }
}
class Vt extends le {
  /**
   * Construct BufferTokenizer
   * @param blob - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(e, t) {
    super(t), this.blob = e, this.fileInfo = { ...(t == null ? void 0 : t.fileInfo) ?? {}, size: e.size, mimeType: e.type };
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async readBuffer(e, t) {
    t != null && t.position && (this.position = t.position);
    const r = await this.peekBuffer(e, t);
    return this.position += r, r;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async peekBuffer(e, t) {
    const r = this.normalizeOptions(e, t), n = Math.min(this.blob.size - r.position, r.length);
    if (!r.mayBeLess && n < r.length)
      throw new v();
    const a = await this.blob.slice(r.position, r.position + n).arrayBuffer();
    return e.set(new Uint8Array(a)), n;
  }
  close() {
    return super.close();
  }
  supportsRandomAccess() {
    return !0;
  }
  setPosition(e) {
    this.position = e;
  }
}
function Yt(i, e) {
  const t = Wt(i), r = e ?? {}, n = r.onClose;
  return r.onClose = async () => {
    if (await t.close(), n)
      return n();
  }, new qt(t, r);
}
function Ie(i, e) {
  return new $t(i, e);
}
function Zt(i, e) {
  return new Vt(i, e);
}
class Re extends le {
  /**
   * Create tokenizer from provided file path
   * @param sourceFilePath File path
   */
  static async fromFile(e) {
    const t = await Ft(e, "r"), r = await t.stat();
    return new Re(t, { fileInfo: { path: e, size: r.size } });
  }
  constructor(e, t) {
    super(t), this.fileHandle = e, this.fileInfo = t.fileInfo;
  }
  /**
   * Read buffer from file
   * @param uint8Array - Uint8Array to write result to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  async readBuffer(e, t) {
    const r = this.normalizeOptions(e, t);
    if (this.position = r.position, r.length === 0)
      return 0;
    const n = await this.fileHandle.read(e, 0, r.length, r.position);
    if (this.position += n.bytesRead, n.bytesRead < r.length && (!t || !t.mayBeLess))
      throw new v();
    return n.bytesRead;
  }
  /**
   * Peek buffer from file
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  async peekBuffer(e, t) {
    const r = this.normalizeOptions(e, t), n = await this.fileHandle.read(e, 0, r.length, r.position);
    if (!r.mayBeLess && n.bytesRead < r.length)
      throw new v();
    return n.bytesRead;
  }
  async close() {
    return await this.fileHandle.close(), super.close();
  }
  setPosition(e) {
    this.position = e;
  }
  supportsRandomAccess() {
    return !0;
  }
}
const Kt = Re.fromFile;
function Jt(i) {
  return i && i.__esModule && Object.prototype.hasOwnProperty.call(i, "default") ? i.default : i;
}
var ve = { exports: {} }, Z = { exports: {} }, fe, Ue;
function Qt() {
  if (Ue) return fe;
  Ue = 1;
  var i = 1e3, e = i * 60, t = e * 60, r = t * 24, n = r * 7, a = r * 365.25;
  fe = function(p, c) {
    c = c || {};
    var l = typeof p;
    if (l === "string" && p.length > 0)
      return s(p);
    if (l === "number" && isFinite(p))
      return c.long ? o(p) : u(p);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(p)
    );
  };
  function s(p) {
    if (p = String(p), !(p.length > 100)) {
      var c = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        p
      );
      if (c) {
        var l = parseFloat(c[1]), f = (c[2] || "ms").toLowerCase();
        switch (f) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return l * a;
          case "weeks":
          case "week":
          case "w":
            return l * n;
          case "days":
          case "day":
          case "d":
            return l * r;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return l * t;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return l * e;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return l * i;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return l;
          default:
            return;
        }
      }
    }
  }
  function u(p) {
    var c = Math.abs(p);
    return c >= r ? Math.round(p / r) + "d" : c >= t ? Math.round(p / t) + "h" : c >= e ? Math.round(p / e) + "m" : c >= i ? Math.round(p / i) + "s" : p + "ms";
  }
  function o(p) {
    var c = Math.abs(p);
    return c >= r ? d(p, c, r, "day") : c >= t ? d(p, c, t, "hour") : c >= e ? d(p, c, e, "minute") : c >= i ? d(p, c, i, "second") : p + " ms";
  }
  function d(p, c, l, f) {
    var g = c >= l * 1.5;
    return Math.round(p / l) + " " + f + (g ? "s" : "");
  }
  return fe;
}
var he, Xe;
function rt() {
  if (Xe) return he;
  Xe = 1;
  function i(e) {
    r.debug = r, r.default = r, r.coerce = d, r.disable = u, r.enable = a, r.enabled = o, r.humanize = Qt(), r.destroy = p, Object.keys(e).forEach((c) => {
      r[c] = e[c];
    }), r.names = [], r.skips = [], r.formatters = {};
    function t(c) {
      let l = 0;
      for (let f = 0; f < c.length; f++)
        l = (l << 5) - l + c.charCodeAt(f), l |= 0;
      return r.colors[Math.abs(l) % r.colors.length];
    }
    r.selectColor = t;
    function r(c) {
      let l, f = null, g, w;
      function y(...k) {
        if (!y.enabled)
          return;
        const B = y, $ = Number(/* @__PURE__ */ new Date()), At = $ - (l || $);
        B.diff = At, B.prev = l, B.curr = $, l = $, k[0] = r.coerce(k[0]), typeof k[0] != "string" && k.unshift("%O");
        let V = 0;
        k[0] = k[0].replace(/%([a-zA-Z%])/g, (pe, St) => {
          if (pe === "%%")
            return "%";
          V++;
          const Oe = r.formatters[St];
          if (typeof Oe == "function") {
            const Et = k[V];
            pe = Oe.call(B, Et), k.splice(V, 1), V--;
          }
          return pe;
        }), r.formatArgs.call(B, k), (B.log || r.log).apply(B, k);
      }
      return y.namespace = c, y.useColors = r.useColors(), y.color = r.selectColor(c), y.extend = n, y.destroy = r.destroy, Object.defineProperty(y, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => f !== null ? f : (g !== r.namespaces && (g = r.namespaces, w = r.enabled(c)), w),
        set: (k) => {
          f = k;
        }
      }), typeof r.init == "function" && r.init(y), y;
    }
    function n(c, l) {
      const f = r(this.namespace + (typeof l > "u" ? ":" : l) + c);
      return f.log = this.log, f;
    }
    function a(c) {
      r.save(c), r.namespaces = c, r.names = [], r.skips = [];
      const l = (typeof c == "string" ? c : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const f of l)
        f[0] === "-" ? r.skips.push(f.slice(1)) : r.names.push(f);
    }
    function s(c, l) {
      let f = 0, g = 0, w = -1, y = 0;
      for (; f < c.length; )
        if (g < l.length && (l[g] === c[f] || l[g] === "*"))
          l[g] === "*" ? (w = g, y = f, g++) : (f++, g++);
        else if (w !== -1)
          g = w + 1, y++, f = y;
        else
          return !1;
      for (; g < l.length && l[g] === "*"; )
        g++;
      return g === l.length;
    }
    function u() {
      const c = [
        ...r.names,
        ...r.skips.map((l) => "-" + l)
      ].join(",");
      return r.enable(""), c;
    }
    function o(c) {
      for (const l of r.skips)
        if (s(c, l))
          return !1;
      for (const l of r.names)
        if (s(c, l))
          return !0;
      return !1;
    }
    function d(c) {
      return c instanceof Error ? c.stack || c.message : c;
    }
    function p() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return r.enable(r.load()), r;
  }
  return he = i, he;
}
var Ge;
function ei() {
  return Ge || (Ge = 1, function(i, e) {
    e.formatArgs = r, e.save = n, e.load = a, e.useColors = t, e.storage = s(), e.destroy = /* @__PURE__ */ (() => {
      let o = !1;
      return () => {
        o || (o = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), e.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function t() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let o;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (o = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(o[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function r(o) {
      if (o[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + o[0] + (this.useColors ? "%c " : " ") + "+" + i.exports.humanize(this.diff), !this.useColors)
        return;
      const d = "color: " + this.color;
      o.splice(1, 0, d, "color: inherit");
      let p = 0, c = 0;
      o[0].replace(/%[a-zA-Z%]/g, (l) => {
        l !== "%%" && (p++, l === "%c" && (c = p));
      }), o.splice(c, 0, d);
    }
    e.log = console.debug || console.log || (() => {
    });
    function n(o) {
      try {
        o ? e.storage.setItem("debug", o) : e.storage.removeItem("debug");
      } catch {
      }
    }
    function a() {
      let o;
      try {
        o = e.storage.getItem("debug") || e.storage.getItem("DEBUG");
      } catch {
      }
      return !o && typeof process < "u" && "env" in process && (o = process.env.DEBUG), o;
    }
    function s() {
      try {
        return localStorage;
      } catch {
      }
    }
    i.exports = rt()(e);
    const { formatters: u } = i.exports;
    u.j = function(o) {
      try {
        return JSON.stringify(o);
      } catch (d) {
        return "[UnexpectedJSONParseError]: " + d.message;
      }
    };
  }(Z, Z.exports)), Z.exports;
}
var K = { exports: {} }, xe, je;
function ti() {
  return je || (je = 1, xe = (i, e = process.argv) => {
    const t = i.startsWith("-") ? "" : i.length === 1 ? "-" : "--", r = e.indexOf(t + i), n = e.indexOf("--");
    return r !== -1 && (n === -1 || r < n);
  }), xe;
}
var ge, We;
function ii() {
  if (We) return ge;
  We = 1;
  const i = Dt, e = tt, t = ti(), { env: r } = process;
  let n;
  t("no-color") || t("no-colors") || t("color=false") || t("color=never") ? n = 0 : (t("color") || t("colors") || t("color=true") || t("color=always")) && (n = 1), "FORCE_COLOR" in r && (r.FORCE_COLOR === "true" ? n = 1 : r.FORCE_COLOR === "false" ? n = 0 : n = r.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(r.FORCE_COLOR, 10), 3));
  function a(o) {
    return o === 0 ? !1 : {
      level: o,
      hasBasic: !0,
      has256: o >= 2,
      has16m: o >= 3
    };
  }
  function s(o, d) {
    if (n === 0)
      return 0;
    if (t("color=16m") || t("color=full") || t("color=truecolor"))
      return 3;
    if (t("color=256"))
      return 2;
    if (o && !d && n === void 0)
      return 0;
    const p = n || 0;
    if (r.TERM === "dumb")
      return p;
    if (process.platform === "win32") {
      const c = i.release().split(".");
      return Number(c[0]) >= 10 && Number(c[2]) >= 10586 ? Number(c[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in r)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((c) => c in r) || r.CI_NAME === "codeship" ? 1 : p;
    if ("TEAMCITY_VERSION" in r)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(r.TEAMCITY_VERSION) ? 1 : 0;
    if (r.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in r) {
      const c = parseInt((r.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (r.TERM_PROGRAM) {
        case "iTerm.app":
          return c >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(r.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(r.TERM) || "COLORTERM" in r ? 1 : p;
  }
  function u(o) {
    const d = s(o, o && o.isTTY);
    return a(d);
  }
  return ge = {
    supportsColor: u,
    stdout: a(s(!0, e.isatty(1))),
    stderr: a(s(!0, e.isatty(2)))
  }, ge;
}
var He;
function ri() {
  return He || (He = 1, function(i, e) {
    const t = tt, r = Bt;
    e.init = p, e.log = u, e.formatArgs = a, e.save = o, e.load = d, e.useColors = n, e.destroy = r.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), e.colors = [6, 2, 3, 4, 5, 1];
    try {
      const l = ii();
      l && (l.stderr || l).level >= 2 && (e.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    e.inspectOpts = Object.keys(process.env).filter((l) => /^debug_/i.test(l)).reduce((l, f) => {
      const g = f.substring(6).toLowerCase().replace(/_([a-z])/g, (y, k) => k.toUpperCase());
      let w = process.env[f];
      return /^(yes|on|true|enabled)$/i.test(w) ? w = !0 : /^(no|off|false|disabled)$/i.test(w) ? w = !1 : w === "null" ? w = null : w = Number(w), l[g] = w, l;
    }, {});
    function n() {
      return "colors" in e.inspectOpts ? !!e.inspectOpts.colors : t.isatty(process.stderr.fd);
    }
    function a(l) {
      const { namespace: f, useColors: g } = this;
      if (g) {
        const w = this.color, y = "\x1B[3" + (w < 8 ? w : "8;5;" + w), k = `  ${y};1m${f} \x1B[0m`;
        l[0] = k + l[0].split(`
`).join(`
` + k), l.push(y + "m+" + i.exports.humanize(this.diff) + "\x1B[0m");
      } else
        l[0] = s() + f + " " + l[0];
    }
    function s() {
      return e.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function u(...l) {
      return process.stderr.write(r.formatWithOptions(e.inspectOpts, ...l) + `
`);
    }
    function o(l) {
      l ? process.env.DEBUG = l : delete process.env.DEBUG;
    }
    function d() {
      return process.env.DEBUG;
    }
    function p(l) {
      l.inspectOpts = {};
      const f = Object.keys(e.inspectOpts);
      for (let g = 0; g < f.length; g++)
        l.inspectOpts[f[g]] = e.inspectOpts[f[g]];
    }
    i.exports = rt()(e);
    const { formatters: c } = i.exports;
    c.o = function(l) {
      return this.inspectOpts.colors = this.useColors, r.inspect(l, this.inspectOpts).split(`
`).map((f) => f.trim()).join(" ");
    }, c.O = function(l) {
      return this.inspectOpts.colors = this.useColors, r.inspect(l, this.inspectOpts);
    };
  }(K, K.exports)), K.exports;
}
typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? ve.exports = ei() : ve.exports = ri();
var ni = ve.exports;
const X = /* @__PURE__ */ Jt(ni);
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
var ue = function(i, e, t, r, n) {
  var a, s, u = n * 8 - r - 1, o = (1 << u) - 1, d = o >> 1, p = -7, c = t ? n - 1 : 0, l = t ? -1 : 1, f = i[e + c];
  for (c += l, a = f & (1 << -p) - 1, f >>= -p, p += u; p > 0; a = a * 256 + i[e + c], c += l, p -= 8)
    ;
  for (s = a & (1 << -p) - 1, a >>= -p, p += r; p > 0; s = s * 256 + i[e + c], c += l, p -= 8)
    ;
  if (a === 0)
    a = 1 - d;
  else {
    if (a === o)
      return s ? NaN : (f ? -1 : 1) * (1 / 0);
    s = s + Math.pow(2, r), a = a - d;
  }
  return (f ? -1 : 1) * s * Math.pow(2, a - r);
}, me = function(i, e, t, r, n, a) {
  var s, u, o, d = a * 8 - n - 1, p = (1 << d) - 1, c = p >> 1, l = n === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, f = r ? 0 : a - 1, g = r ? 1 : -1, w = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
  for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (u = isNaN(e) ? 1 : 0, s = p) : (s = Math.floor(Math.log(e) / Math.LN2), e * (o = Math.pow(2, -s)) < 1 && (s--, o *= 2), s + c >= 1 ? e += l / o : e += l * Math.pow(2, 1 - c), e * o >= 2 && (s++, o /= 2), s + c >= p ? (u = 0, s = p) : s + c >= 1 ? (u = (e * o - 1) * Math.pow(2, n), s = s + c) : (u = e * Math.pow(2, c - 1) * Math.pow(2, n), s = 0)); n >= 8; i[t + f] = u & 255, f += g, u /= 256, n -= 8)
    ;
  for (s = s << n | u, d += n; d > 0; i[t + f] = s & 255, f += g, s /= 256, d -= 8)
    ;
  i[t + f - g] |= w * 128;
};
const nt = {
  128: "€",
  130: "‚",
  131: "ƒ",
  132: "„",
  133: "…",
  134: "†",
  135: "‡",
  136: "ˆ",
  137: "‰",
  138: "Š",
  139: "‹",
  140: "Œ",
  142: "Ž",
  145: "‘",
  146: "’",
  147: "“",
  148: "”",
  149: "•",
  150: "–",
  151: "—",
  152: "˜",
  153: "™",
  154: "š",
  155: "›",
  156: "œ",
  158: "ž",
  159: "Ÿ"
}, at = {};
for (const [i, e] of Object.entries(nt))
  at[e] = Number.parseInt(i, 10);
let J, Q;
function ai() {
  if (!(typeof globalThis.TextDecoder > "u"))
    return J ?? (J = new globalThis.TextDecoder("utf-8"));
}
function si() {
  if (!(typeof globalThis.TextEncoder > "u"))
    return Q ?? (Q = new globalThis.TextEncoder());
}
const z = 32 * 1024;
function W(i, e = "utf-8") {
  switch (e.toLowerCase()) {
    case "utf-8":
    case "utf8": {
      const t = ai();
      return t ? t.decode(i) : ci(i);
    }
    case "utf-16le":
      return li(i);
    case "us-ascii":
    case "ascii":
      return ui(i);
    case "latin1":
    case "iso-8859-1":
      return mi(i);
    case "windows-1252":
      return pi(i);
    default:
      throw new RangeError(`Encoding '${e}' not supported`);
  }
}
function oi(i = "", e = "utf-8") {
  switch (e.toLowerCase()) {
    case "utf-8":
    case "utf8": {
      const t = si();
      return t ? t.encode(i) : di(i);
    }
    case "utf-16le":
      return fi(i);
    case "us-ascii":
    case "ascii":
      return hi(i);
    case "latin1":
    case "iso-8859-1":
      return xi(i);
    case "windows-1252":
      return gi(i);
    default:
      throw new RangeError(`Encoding '${e}' not supported`);
  }
}
function ci(i) {
  const e = [];
  let t = "", r = 0;
  for (; r < i.length; ) {
    const n = i[r++];
    if (n < 128)
      t += String.fromCharCode(n);
    else if (n < 224) {
      const a = i[r++] & 63;
      t += String.fromCharCode((n & 31) << 6 | a);
    } else if (n < 240) {
      const a = i[r++] & 63, s = i[r++] & 63;
      t += String.fromCharCode((n & 15) << 12 | a << 6 | s);
    } else {
      const a = i[r++] & 63, s = i[r++] & 63, u = i[r++] & 63;
      let o = (n & 7) << 18 | a << 12 | s << 6 | u;
      o -= 65536, t += String.fromCharCode(55296 + (o >> 10 & 1023), 56320 + (o & 1023));
    }
    t.length >= z && (e.push(t), t = "");
  }
  return t && e.push(t), e.join("");
}
function li(i) {
  const e = i.length & -2;
  if (e === 0)
    return "";
  const t = [], r = z;
  for (let n = 0; n < e; ) {
    const a = Math.min(r, e - n >> 1), s = new Array(a);
    for (let u = 0; u < a; u++, n += 2)
      s[u] = i[n] | i[n + 1] << 8;
    t.push(String.fromCharCode.apply(null, s));
  }
  return t.join("");
}
function ui(i) {
  const e = [];
  for (let t = 0; t < i.length; t += z) {
    const r = Math.min(i.length, t + z), n = new Array(r - t);
    for (let a = t, s = 0; a < r; a++, s++)
      n[s] = i[a] & 127;
    e.push(String.fromCharCode.apply(null, n));
  }
  return e.join("");
}
function mi(i) {
  const e = [];
  for (let t = 0; t < i.length; t += z) {
    const r = Math.min(i.length, t + z), n = new Array(r - t);
    for (let a = t, s = 0; a < r; a++, s++)
      n[s] = i[a];
    e.push(String.fromCharCode.apply(null, n));
  }
  return e.join("");
}
function pi(i) {
  const e = [];
  let t = "";
  for (let r = 0; r < i.length; r++) {
    const n = i[r], a = n >= 128 && n <= 159 ? nt[n] : void 0;
    t += a ?? String.fromCharCode(n), t.length >= z && (e.push(t), t = "");
  }
  return t && e.push(t), e.join("");
}
function di(i) {
  const e = [];
  for (let t = 0; t < i.length; t++) {
    let r = i.charCodeAt(t);
    if (r >= 55296 && r <= 56319 && t + 1 < i.length) {
      const n = i.charCodeAt(t + 1);
      n >= 56320 && n <= 57343 && (r = 65536 + (r - 55296 << 10) + (n - 56320), t++);
    }
    r < 128 ? e.push(r) : r < 2048 ? e.push(192 | r >> 6, 128 | r & 63) : r < 65536 ? e.push(224 | r >> 12, 128 | r >> 6 & 63, 128 | r & 63) : e.push(240 | r >> 18, 128 | r >> 12 & 63, 128 | r >> 6 & 63, 128 | r & 63);
  }
  return new Uint8Array(e);
}
function fi(i) {
  const e = new Uint8Array(i.length * 2);
  for (let t = 0; t < i.length; t++) {
    const r = i.charCodeAt(t), n = t * 2;
    e[n] = r & 255, e[n + 1] = r >>> 8;
  }
  return e;
}
function hi(i) {
  const e = new Uint8Array(i.length);
  for (let t = 0; t < i.length; t++)
    e[t] = i.charCodeAt(t) & 127;
  return e;
}
function xi(i) {
  const e = new Uint8Array(i.length);
  for (let t = 0; t < i.length; t++)
    e[t] = i.charCodeAt(t) & 255;
  return e;
}
function gi(i) {
  const e = new Uint8Array(i.length);
  for (let t = 0; t < i.length; t++) {
    const r = i[t], n = r.charCodeAt(0);
    if (n <= 255) {
      e[t] = n;
      continue;
    }
    const a = at[r];
    e[t] = a !== void 0 ? a : 63;
  }
  return e;
}
function h(i) {
  return new DataView(i.buffer, i.byteOffset);
}
const P = {
  len: 1,
  get(i, e) {
    return h(i).getUint8(e);
  },
  put(i, e, t) {
    return h(i).setUint8(e, t), e + 1;
  }
}, T = {
  len: 2,
  get(i, e) {
    return h(i).getUint16(e, !0);
  },
  put(i, e, t) {
    return h(i).setUint16(e, t, !0), e + 2;
  }
}, M = {
  len: 2,
  get(i, e) {
    return h(i).getUint16(e);
  },
  put(i, e, t) {
    return h(i).setUint16(e, t), e + 2;
  }
}, st = {
  len: 3,
  get(i, e) {
    const t = h(i);
    return t.getUint8(e) + (t.getUint16(e + 1, !0) << 8);
  },
  put(i, e, t) {
    const r = h(i);
    return r.setUint8(e, t & 255), r.setUint16(e + 1, t >> 8, !0), e + 3;
  }
}, ot = {
  len: 3,
  get(i, e) {
    const t = h(i);
    return (t.getUint16(e) << 8) + t.getUint8(e + 2);
  },
  put(i, e, t) {
    const r = h(i);
    return r.setUint16(e, t >> 8), r.setUint8(e + 2, t & 255), e + 3;
  }
}, x = {
  len: 4,
  get(i, e) {
    return h(i).getUint32(e, !0);
  },
  put(i, e, t) {
    return h(i).setUint32(e, t, !0), e + 4;
  }
}, j = {
  len: 4,
  get(i, e) {
    return h(i).getUint32(e);
  },
  put(i, e, t) {
    return h(i).setUint32(e, t), e + 4;
  }
}, Ce = {
  len: 1,
  get(i, e) {
    return h(i).getInt8(e);
  },
  put(i, e, t) {
    return h(i).setInt8(e, t), e + 1;
  }
}, Ti = {
  len: 2,
  get(i, e) {
    return h(i).getInt16(e);
  },
  put(i, e, t) {
    return h(i).setInt16(e, t), e + 2;
  }
}, wi = {
  len: 2,
  get(i, e) {
    return h(i).getInt16(e, !0);
  },
  put(i, e, t) {
    return h(i).setInt16(e, t, !0), e + 2;
  }
}, yi = {
  len: 3,
  get(i, e) {
    const t = st.get(i, e);
    return t > 8388607 ? t - 16777216 : t;
  },
  put(i, e, t) {
    const r = h(i);
    return r.setUint8(e, t & 255), r.setUint16(e + 1, t >> 8, !0), e + 3;
  }
}, bi = {
  len: 3,
  get(i, e) {
    const t = ot.get(i, e);
    return t > 8388607 ? t - 16777216 : t;
  },
  put(i, e, t) {
    const r = h(i);
    return r.setUint16(e, t >> 8), r.setUint8(e + 2, t & 255), e + 3;
  }
}, ct = {
  len: 4,
  get(i, e) {
    return h(i).getInt32(e);
  },
  put(i, e, t) {
    return h(i).setInt32(e, t), e + 4;
  }
}, ki = {
  len: 4,
  get(i, e) {
    return h(i).getInt32(e, !0);
  },
  put(i, e, t) {
    return h(i).setInt32(e, t, !0), e + 4;
  }
}, lt = {
  len: 8,
  get(i, e) {
    return h(i).getBigUint64(e, !0);
  },
  put(i, e, t) {
    return h(i).setBigUint64(e, t, !0), e + 8;
  }
}, Ii = {
  len: 8,
  get(i, e) {
    return h(i).getBigInt64(e, !0);
  },
  put(i, e, t) {
    return h(i).setBigInt64(e, t, !0), e + 8;
  }
}, vi = {
  len: 8,
  get(i, e) {
    return h(i).getBigUint64(e);
  },
  put(i, e, t) {
    return h(i).setBigUint64(e, t), e + 8;
  }
}, Ci = {
  len: 8,
  get(i, e) {
    return h(i).getBigInt64(e);
  },
  put(i, e, t) {
    return h(i).setBigInt64(e, t), e + 8;
  }
}, Ai = {
  len: 2,
  get(i, e) {
    return ue(i, e, !1, 10, this.len);
  },
  put(i, e, t) {
    return me(i, t, e, !1, 10, this.len), e + this.len;
  }
}, Si = {
  len: 2,
  get(i, e) {
    return ue(i, e, !0, 10, this.len);
  },
  put(i, e, t) {
    return me(i, t, e, !0, 10, this.len), e + this.len;
  }
}, Ei = {
  len: 4,
  get(i, e) {
    return h(i).getFloat32(e);
  },
  put(i, e, t) {
    return h(i).setFloat32(e, t), e + 4;
  }
}, Ri = {
  len: 4,
  get(i, e) {
    return h(i).getFloat32(e, !0);
  },
  put(i, e, t) {
    return h(i).setFloat32(e, t, !0), e + 4;
  }
}, _i = {
  len: 8,
  get(i, e) {
    return h(i).getFloat64(e);
  },
  put(i, e, t) {
    return h(i).setFloat64(e, t), e + 8;
  }
}, Mi = {
  len: 8,
  get(i, e) {
    return h(i).getFloat64(e, !0);
  },
  put(i, e, t) {
    return h(i).setFloat64(e, t, !0), e + 8;
  }
}, Fi = {
  len: 10,
  get(i, e) {
    return ue(i, e, !1, 63, this.len);
  },
  put(i, e, t) {
    return me(i, t, e, !1, 63, this.len), e + this.len;
  }
}, Bi = {
  len: 10,
  get(i, e) {
    return ue(i, e, !0, 63, this.len);
  },
  put(i, e, t) {
    return me(i, t, e, !0, 63, this.len), e + this.len;
  }
};
class Di {
  /**
   * @param len number of bytes to ignore
   */
  constructor(e) {
    this.len = e;
  }
  // ToDo: don't read, but skip data
  get(e, t) {
  }
}
class ut {
  constructor(e) {
    this.len = e;
  }
  get(e, t) {
    return e.subarray(t, t + this.len);
  }
}
class b {
  constructor(e, t) {
    this.len = e, this.encoding = t;
  }
  get(e, t = 0) {
    const r = e.subarray(t, t + this.len);
    return W(r, this.encoding);
  }
}
class Oi extends b {
  constructor(e) {
    super(e, "windows-1252");
  }
}
const Dn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AnsiStringType: Oi,
  Float16_BE: Ai,
  Float16_LE: Si,
  Float32_BE: Ei,
  Float32_LE: Ri,
  Float64_BE: _i,
  Float64_LE: Mi,
  Float80_BE: Fi,
  Float80_LE: Bi,
  INT16_BE: Ti,
  INT16_LE: wi,
  INT24_BE: bi,
  INT24_LE: yi,
  INT32_BE: ct,
  INT32_LE: ki,
  INT64_BE: Ci,
  INT64_LE: Ii,
  INT8: Ce,
  IgnoreType: Di,
  StringType: b,
  UINT16_BE: M,
  UINT16_LE: T,
  UINT24_BE: ot,
  UINT24_LE: st,
  UINT32_BE: j,
  UINT32_LE: x,
  UINT64_BE: vi,
  UINT64_LE: lt,
  UINT8: P,
  Uint8ArrayType: ut
}, Symbol.toStringTag, { value: "Module" })), U = {
  LocalFileHeader: 67324752,
  DataDescriptor: 134695760,
  CentralFileHeader: 33639248,
  EndOfCentralDirectory: 101010256
}, qe = {
  get(i) {
    return {
      signature: x.get(i, 0),
      compressedSize: x.get(i, 8),
      uncompressedSize: x.get(i, 12)
    };
  },
  len: 16
}, Pi = {
  get(i) {
    const e = T.get(i, 6);
    return {
      signature: x.get(i, 0),
      minVersion: T.get(i, 4),
      dataDescriptor: !!(e & 8),
      compressedMethod: T.get(i, 8),
      compressedSize: x.get(i, 18),
      uncompressedSize: x.get(i, 22),
      filenameLength: T.get(i, 26),
      extraFieldLength: T.get(i, 28),
      filename: null
    };
  },
  len: 30
}, zi = {
  get(i) {
    return {
      signature: x.get(i, 0),
      nrOfThisDisk: T.get(i, 4),
      nrOfThisDiskWithTheStart: T.get(i, 6),
      nrOfEntriesOnThisDisk: T.get(i, 8),
      nrOfEntriesOfSize: T.get(i, 10),
      sizeOfCd: x.get(i, 12),
      offsetOfStartOfCd: x.get(i, 16),
      zipFileCommentLength: T.get(i, 20)
    };
  },
  len: 22
}, Li = {
  get(i) {
    const e = T.get(i, 8);
    return {
      signature: x.get(i, 0),
      minVersion: T.get(i, 6),
      dataDescriptor: !!(e & 8),
      compressedMethod: T.get(i, 10),
      compressedSize: x.get(i, 20),
      uncompressedSize: x.get(i, 24),
      filenameLength: T.get(i, 28),
      extraFieldLength: T.get(i, 30),
      fileCommentLength: T.get(i, 32),
      relativeOffsetOfLocalHeader: x.get(i, 42),
      filename: null
    };
  },
  len: 46
};
function mt(i) {
  const e = new Uint8Array(x.len);
  return x.put(e, 0, i), e;
}
const S = X("tokenizer:inflate"), Te = 256 * 1024, Ni = mt(U.DataDescriptor), ee = mt(U.EndOfCentralDirectory);
class _e {
  constructor(e) {
    this.tokenizer = e, this.syncBuffer = new Uint8Array(Te);
  }
  async isZip() {
    return await this.peekSignature() === U.LocalFileHeader;
  }
  peekSignature() {
    return this.tokenizer.peekToken(x);
  }
  async findEndOfCentralDirectoryLocator() {
    const e = this.tokenizer, t = Math.min(16 * 1024, e.fileInfo.size), r = this.syncBuffer.subarray(0, t);
    await this.tokenizer.readBuffer(r, { position: e.fileInfo.size - t });
    for (let n = r.length - 4; n >= 0; n--)
      if (r[n] === ee[0] && r[n + 1] === ee[1] && r[n + 2] === ee[2] && r[n + 3] === ee[3])
        return e.fileInfo.size - t + n;
    return -1;
  }
  async readCentralDirectory() {
    if (!this.tokenizer.supportsRandomAccess()) {
      S("Cannot reading central-directory without random-read support");
      return;
    }
    S("Reading central-directory...");
    const e = this.tokenizer.position, t = await this.findEndOfCentralDirectoryLocator();
    if (t > 0) {
      S("Central-directory 32-bit signature found");
      const r = await this.tokenizer.readToken(zi, t), n = [];
      this.tokenizer.setPosition(r.offsetOfStartOfCd);
      for (let a = 0; a < r.nrOfEntriesOfSize; ++a) {
        const s = await this.tokenizer.readToken(Li);
        if (s.signature !== U.CentralFileHeader)
          throw new Error("Expected Central-File-Header signature");
        s.filename = await this.tokenizer.readToken(new b(s.filenameLength, "utf-8")), await this.tokenizer.ignore(s.extraFieldLength), await this.tokenizer.ignore(s.fileCommentLength), n.push(s), S(`Add central-directory file-entry: n=${a + 1}/${n.length}: filename=${n[a].filename}`);
      }
      return this.tokenizer.setPosition(e), n;
    }
    this.tokenizer.setPosition(e);
  }
  async unzip(e) {
    const t = await this.readCentralDirectory();
    if (t)
      return this.iterateOverCentralDirectory(t, e);
    let r = !1;
    do {
      const n = await this.readLocalFileHeader();
      if (!n)
        break;
      const a = e(n);
      r = !!a.stop;
      let s;
      if (await this.tokenizer.ignore(n.extraFieldLength), n.dataDescriptor && n.compressedSize === 0) {
        const u = [];
        let o = Te;
        S("Compressed-file-size unknown, scanning for next data-descriptor-signature....");
        let d = -1;
        for (; d < 0 && o === Te; ) {
          o = await this.tokenizer.peekBuffer(this.syncBuffer, { mayBeLess: !0 }), d = Ui(this.syncBuffer.subarray(0, o), Ni);
          const p = d >= 0 ? d : o;
          if (a.handler) {
            const c = new Uint8Array(p);
            await this.tokenizer.readBuffer(c), u.push(c);
          } else
            await this.tokenizer.ignore(p);
        }
        S(`Found data-descriptor-signature at pos=${this.tokenizer.position}`), a.handler && await this.inflate(n, Xi(u), a.handler);
      } else
        a.handler ? (S(`Reading compressed-file-data: ${n.compressedSize} bytes`), s = new Uint8Array(n.compressedSize), await this.tokenizer.readBuffer(s), await this.inflate(n, s, a.handler)) : (S(`Ignoring compressed-file-data: ${n.compressedSize} bytes`), await this.tokenizer.ignore(n.compressedSize));
      if (S(`Reading data-descriptor at pos=${this.tokenizer.position}`), n.dataDescriptor && (await this.tokenizer.readToken(qe)).signature !== 134695760)
        throw new Error(`Expected data-descriptor-signature at position ${this.tokenizer.position - qe.len}`);
    } while (!r);
  }
  async iterateOverCentralDirectory(e, t) {
    for (const r of e) {
      const n = t(r);
      if (n.handler) {
        this.tokenizer.setPosition(r.relativeOffsetOfLocalHeader);
        const a = await this.readLocalFileHeader();
        if (a) {
          await this.tokenizer.ignore(a.extraFieldLength);
          const s = new Uint8Array(r.compressedSize);
          await this.tokenizer.readBuffer(s), await this.inflate(a, s, n.handler);
        }
      }
      if (n.stop)
        break;
    }
  }
  async inflate(e, t, r) {
    if (e.compressedMethod === 0)
      return r(t);
    if (e.compressedMethod !== 8)
      throw new Error(`Unsupported ZIP compression method: ${e.compressedMethod}`);
    S(`Decompress filename=${e.filename}, compressed-size=${t.length}`);
    const n = await _e.decompressDeflateRaw(t);
    return r(n);
  }
  static async decompressDeflateRaw(e) {
    const t = new ReadableStream({
      start(a) {
        a.enqueue(e), a.close();
      }
    }), r = new DecompressionStream("deflate-raw"), n = t.pipeThrough(r);
    try {
      const s = await new Response(n).arrayBuffer();
      return new Uint8Array(s);
    } catch (a) {
      const s = a instanceof Error ? `Failed to deflate ZIP entry: ${a.message}` : "Unknown decompression error in ZIP entry";
      throw new TypeError(s);
    }
  }
  async readLocalFileHeader() {
    const e = await this.tokenizer.peekToken(x);
    if (e === U.LocalFileHeader) {
      const t = await this.tokenizer.readToken(Pi);
      return t.filename = await this.tokenizer.readToken(new b(t.filenameLength, "utf-8")), t;
    }
    if (e === U.CentralFileHeader)
      return !1;
    throw e === 3759263696 ? new Error("Encrypted ZIP") : new Error("Unexpected signature");
  }
}
function Ui(i, e) {
  const t = i.length, r = e.length;
  if (r > t)
    return -1;
  for (let n = 0; n <= t - r; n++) {
    let a = !0;
    for (let s = 0; s < r; s++)
      if (i[n + s] !== e[s]) {
        a = !1;
        break;
      }
    if (a)
      return n;
  }
  return -1;
}
function Xi(i) {
  const e = i.reduce((n, a) => n + a.length, 0), t = new Uint8Array(e);
  let r = 0;
  for (const n of i)
    t.set(n, r), r += n.length;
  return t;
}
class Gi {
  constructor(e) {
    this.tokenizer = e;
  }
  inflate() {
    const e = this.tokenizer;
    return new ReadableStream({
      async pull(t) {
        const r = new Uint8Array(1024), n = await e.readBuffer(r, { mayBeLess: !0 });
        if (n === 0) {
          t.close();
          return;
        }
        t.enqueue(r.subarray(0, n));
      }
    }).pipeThrough(new DecompressionStream("gzip"));
  }
}
const ji = Object.prototype.toString, Wi = "[object Uint8Array]";
function Hi(i, e, t) {
  return i ? i.constructor === e ? !0 : ji.call(i) === t : !1;
}
function qi(i) {
  return Hi(i, Uint8Array, Wi);
}
function $i(i) {
  if (!qi(i))
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof i}\``);
}
new globalThis.TextDecoder("utf8");
new globalThis.TextEncoder();
const Vi = Array.from({ length: 256 }, (i, e) => e.toString(16).padStart(2, "0"));
function On(i) {
  $i(i);
  let e = "";
  for (let t = 0; t < i.length; t++)
    e += Vi[i[t]];
  return e;
}
function Ae(i) {
  const { byteLength: e } = i;
  if (e === 6)
    return i.getUint16(0) * 2 ** 32 + i.getUint32(2);
  if (e === 5)
    return i.getUint8(0) * 2 ** 32 + i.getUint32(1);
  if (e === 4)
    return i.getUint32(0);
  if (e === 3)
    return i.getUint8(0) * 2 ** 16 + i.getUint16(1);
  if (e === 2)
    return i.getUint16(0);
  if (e === 1)
    return i.getUint8(0);
}
function Yi(i, e) {
  if (e === "utf-16le") {
    const t = [];
    for (let r = 0; r < i.length; r++) {
      const n = i.charCodeAt(r);
      t.push(n & 255, n >> 8 & 255);
    }
    return t;
  }
  if (e === "utf-16be") {
    const t = [];
    for (let r = 0; r < i.length; r++) {
      const n = i.charCodeAt(r);
      t.push(n >> 8 & 255, n & 255);
    }
    return t;
  }
  return [...i].map((t) => t.charCodeAt(0));
}
function Zi(i, e = 0) {
  const t = Number.parseInt(new b(6).get(i, 148).replace(/\0.*$/, "").trim(), 8);
  if (Number.isNaN(t))
    return !1;
  let r = 8 * 32;
  for (let n = e; n < e + 148; n++)
    r += i[n];
  for (let n = e + 156; n < e + 512; n++)
    r += i[n];
  return t === r;
}
const Ki = {
  get: (i, e) => i[e + 3] & 127 | i[e + 2] << 7 | i[e + 1] << 14 | i[e] << 21,
  len: 4
}, Ji = [
  "jpg",
  "png",
  "apng",
  "gif",
  "webp",
  "flif",
  "xcf",
  "cr2",
  "cr3",
  "orf",
  "arw",
  "dng",
  "nef",
  "rw2",
  "raf",
  "tif",
  "bmp",
  "icns",
  "jxr",
  "psd",
  "indd",
  "zip",
  "tar",
  "rar",
  "gz",
  "bz2",
  "7z",
  "dmg",
  "mp4",
  "mid",
  "mkv",
  "webm",
  "mov",
  "avi",
  "mpg",
  "mp2",
  "mp3",
  "m4a",
  "oga",
  "ogg",
  "ogv",
  "opus",
  "flac",
  "wav",
  "spx",
  "amr",
  "pdf",
  "epub",
  "elf",
  "macho",
  "exe",
  "swf",
  "rtf",
  "wasm",
  "woff",
  "woff2",
  "eot",
  "ttf",
  "otf",
  "ttc",
  "ico",
  "flv",
  "ps",
  "xz",
  "sqlite",
  "nes",
  "crx",
  "xpi",
  "cab",
  "deb",
  "ar",
  "rpm",
  "Z",
  "lz",
  "cfb",
  "mxf",
  "mts",
  "blend",
  "bpg",
  "docx",
  "pptx",
  "xlsx",
  "3gp",
  "3g2",
  "j2c",
  "jp2",
  "jpm",
  "jpx",
  "mj2",
  "aif",
  "qcp",
  "odt",
  "ods",
  "odp",
  "xml",
  "mobi",
  "heic",
  "cur",
  "ktx",
  "ape",
  "wv",
  "dcm",
  "ics",
  "glb",
  "pcap",
  "dsf",
  "lnk",
  "alias",
  "voc",
  "ac3",
  "m4v",
  "m4p",
  "m4b",
  "f4v",
  "f4p",
  "f4b",
  "f4a",
  "mie",
  "asf",
  "ogm",
  "ogx",
  "mpc",
  "arrow",
  "shp",
  "aac",
  "mp1",
  "it",
  "s3m",
  "xm",
  "skp",
  "avif",
  "eps",
  "lzh",
  "pgp",
  "asar",
  "stl",
  "chm",
  "3mf",
  "zst",
  "jxl",
  "vcf",
  "jls",
  "pst",
  "dwg",
  "parquet",
  "class",
  "arj",
  "cpio",
  "ace",
  "avro",
  "icc",
  "fbx",
  "vsdx",
  "vtt",
  "apk",
  "drc",
  "lz4",
  "potx",
  "xltx",
  "dotx",
  "xltm",
  "ott",
  "ots",
  "otp",
  "odg",
  "otg",
  "xlsm",
  "docm",
  "dotm",
  "potm",
  "pptm",
  "jar",
  "jmp",
  "rm",
  "sav",
  "ppsm",
  "ppsx",
  "tar.gz",
  "reg",
  "dat"
], Qi = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/flif",
  "image/x-xcf",
  "image/x-canon-cr2",
  "image/x-canon-cr3",
  "image/tiff",
  "image/bmp",
  "image/vnd.ms-photo",
  "image/vnd.adobe.photoshop",
  "application/x-indesign",
  "application/epub+zip",
  "application/x-xpinstall",
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/zip",
  "application/x-tar",
  "application/x-rar-compressed",
  "application/gzip",
  "application/x-bzip2",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/vnd.apache.arrow.file",
  "video/mp4",
  "audio/midi",
  "video/matroska",
  "video/webm",
  "video/quicktime",
  "video/vnd.avi",
  "audio/wav",
  "audio/qcelp",
  "audio/x-ms-asf",
  "video/x-ms-asf",
  "application/vnd.ms-asf",
  "video/mpeg",
  "video/3gpp",
  "audio/mpeg",
  "audio/mp4",
  // RFC 4337
  "video/ogg",
  "audio/ogg",
  "audio/ogg; codecs=opus",
  "application/ogg",
  "audio/flac",
  "audio/ape",
  "audio/wavpack",
  "audio/amr",
  "application/pdf",
  "application/x-elf",
  "application/x-mach-binary",
  "application/x-msdownload",
  "application/x-shockwave-flash",
  "application/rtf",
  "application/wasm",
  "font/woff",
  "font/woff2",
  "application/vnd.ms-fontobject",
  "font/ttf",
  "font/otf",
  "font/collection",
  "image/x-icon",
  "video/x-flv",
  "application/postscript",
  "application/eps",
  "application/x-xz",
  "application/x-sqlite3",
  "application/x-nintendo-nes-rom",
  "application/x-google-chrome-extension",
  "application/vnd.ms-cab-compressed",
  "application/x-deb",
  "application/x-unix-archive",
  "application/x-rpm",
  "application/x-compress",
  "application/x-lzip",
  "application/x-cfb",
  "application/x-mie",
  "application/mxf",
  "video/mp2t",
  "application/x-blender",
  "image/bpg",
  "image/j2c",
  "image/jp2",
  "image/jpx",
  "image/jpm",
  "image/mj2",
  "audio/aiff",
  "application/xml",
  "application/x-mobipocket-ebook",
  "image/heif",
  "image/heif-sequence",
  "image/heic",
  "image/heic-sequence",
  "image/icns",
  "image/ktx",
  "application/dicom",
  "audio/x-musepack",
  "text/calendar",
  "text/vcard",
  "text/vtt",
  "model/gltf-binary",
  "application/vnd.tcpdump.pcap",
  "audio/x-dsf",
  // Non-standard
  "application/x.ms.shortcut",
  // Invented by us
  "application/x.apple.alias",
  // Invented by us
  "audio/x-voc",
  "audio/vnd.dolby.dd-raw",
  "audio/x-m4a",
  "image/apng",
  "image/x-olympus-orf",
  "image/x-sony-arw",
  "image/x-adobe-dng",
  "image/x-nikon-nef",
  "image/x-panasonic-rw2",
  "image/x-fujifilm-raf",
  "video/x-m4v",
  "video/3gpp2",
  "application/x-esri-shape",
  "audio/aac",
  "audio/x-it",
  "audio/x-s3m",
  "audio/x-xm",
  "video/MP1S",
  "video/MP2P",
  "application/vnd.sketchup.skp",
  "image/avif",
  "application/x-lzh-compressed",
  "application/pgp-encrypted",
  "application/x-asar",
  "model/stl",
  "application/vnd.ms-htmlhelp",
  "model/3mf",
  "image/jxl",
  "application/zstd",
  "image/jls",
  "application/vnd.ms-outlook",
  "image/vnd.dwg",
  "application/vnd.apache.parquet",
  "application/java-vm",
  "application/x-arj",
  "application/x-cpio",
  "application/x-ace-compressed",
  "application/avro",
  "application/vnd.iccprofile",
  "application/x.autodesk.fbx",
  // Invented by us
  "application/vnd.visio",
  "application/vnd.android.package-archive",
  "application/vnd.google.draco",
  // Invented by us
  "application/x-lz4",
  // Invented by us
  "application/vnd.openxmlformats-officedocument.presentationml.template",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  "application/vnd.ms-excel.template.macroenabled.12",
  "application/vnd.oasis.opendocument.text-template",
  "application/vnd.oasis.opendocument.spreadsheet-template",
  "application/vnd.oasis.opendocument.presentation-template",
  "application/vnd.oasis.opendocument.graphics",
  "application/vnd.oasis.opendocument.graphics-template",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.ms-word.document.macroenabled.12",
  "application/vnd.ms-word.template.macroenabled.12",
  "application/vnd.ms-powerpoint.template.macroenabled.12",
  "application/vnd.ms-powerpoint.presentation.macroenabled.12",
  "application/java-archive",
  "application/vnd.rn-realmedia",
  "application/x-spss-sav",
  "application/x-ms-regedit",
  "application/x-ft-windows-registry-hive",
  "application/x-jmp-data"
], we = 4100;
async function pt(i, e) {
  return new er(e).fromBuffer(i);
}
function ye(i) {
  switch (i = i.toLowerCase(), i) {
    case "application/epub+zip":
      return {
        ext: "epub",
        mime: i
      };
    case "application/vnd.oasis.opendocument.text":
      return {
        ext: "odt",
        mime: i
      };
    case "application/vnd.oasis.opendocument.text-template":
      return {
        ext: "ott",
        mime: i
      };
    case "application/vnd.oasis.opendocument.spreadsheet":
      return {
        ext: "ods",
        mime: i
      };
    case "application/vnd.oasis.opendocument.spreadsheet-template":
      return {
        ext: "ots",
        mime: i
      };
    case "application/vnd.oasis.opendocument.presentation":
      return {
        ext: "odp",
        mime: i
      };
    case "application/vnd.oasis.opendocument.presentation-template":
      return {
        ext: "otp",
        mime: i
      };
    case "application/vnd.oasis.opendocument.graphics":
      return {
        ext: "odg",
        mime: i
      };
    case "application/vnd.oasis.opendocument.graphics-template":
      return {
        ext: "otg",
        mime: i
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.slideshow":
      return {
        ext: "ppsx",
        mime: i
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return {
        ext: "xlsx",
        mime: i
      };
    case "application/vnd.ms-excel.sheet.macroenabled":
      return {
        ext: "xlsm",
        mime: "application/vnd.ms-excel.sheet.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.template":
      return {
        ext: "xltx",
        mime: i
      };
    case "application/vnd.ms-excel.template.macroenabled":
      return {
        ext: "xltm",
        mime: "application/vnd.ms-excel.template.macroenabled.12"
      };
    case "application/vnd.ms-powerpoint.slideshow.macroenabled":
      return {
        ext: "ppsm",
        mime: "application/vnd.ms-powerpoint.slideshow.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return {
        ext: "docx",
        mime: i
      };
    case "application/vnd.ms-word.document.macroenabled":
      return {
        ext: "docm",
        mime: "application/vnd.ms-word.document.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.template":
      return {
        ext: "dotx",
        mime: i
      };
    case "application/vnd.ms-word.template.macroenabledtemplate":
      return {
        ext: "dotm",
        mime: "application/vnd.ms-word.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.template":
      return {
        ext: "potx",
        mime: i
      };
    case "application/vnd.ms-powerpoint.template.macroenabled":
      return {
        ext: "potm",
        mime: "application/vnd.ms-powerpoint.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return {
        ext: "pptx",
        mime: i
      };
    case "application/vnd.ms-powerpoint.presentation.macroenabled":
      return {
        ext: "pptm",
        mime: "application/vnd.ms-powerpoint.presentation.macroenabled.12"
      };
    case "application/vnd.ms-visio.drawing":
      return {
        ext: "vsdx",
        mime: "application/vnd.visio"
      };
    case "application/vnd.ms-package.3dmanufacturing-3dmodel+xml":
      return {
        ext: "3mf",
        mime: "model/3mf"
      };
  }
}
function E(i, e, t) {
  t = {
    offset: 0,
    ...t
  };
  for (const [r, n] of e.entries())
    if (t.mask) {
      if (n !== (t.mask[r] & i[r + t.offset]))
        return !1;
    } else if (n !== i[r + t.offset])
      return !1;
  return !0;
}
class er {
  constructor(e) {
    // Detections with a high degree of certainty in identifying the correct file type
    de(this, "detectConfident", async (e) => {
      if (this.buffer = new Uint8Array(we), e.fileInfo.size === void 0 && (e.fileInfo.size = Number.MAX_SAFE_INTEGER), this.tokenizer = e, await e.peekBuffer(this.buffer, { length: 32, mayBeLess: !0 }), this.check([66, 77]))
        return {
          ext: "bmp",
          mime: "image/bmp"
        };
      if (this.check([11, 119]))
        return {
          ext: "ac3",
          mime: "audio/vnd.dolby.dd-raw"
        };
      if (this.check([120, 1]))
        return {
          ext: "dmg",
          mime: "application/x-apple-diskimage"
        };
      if (this.check([77, 90]))
        return {
          ext: "exe",
          mime: "application/x-msdownload"
        };
      if (this.check([37, 33]))
        return await e.peekBuffer(this.buffer, { length: 24, mayBeLess: !0 }), this.checkString("PS-Adobe-", { offset: 2 }) && this.checkString(" EPSF-", { offset: 14 }) ? {
          ext: "eps",
          mime: "application/eps"
        } : {
          ext: "ps",
          mime: "application/postscript"
        };
      if (this.check([31, 160]) || this.check([31, 157]))
        return {
          ext: "Z",
          mime: "application/x-compress"
        };
      if (this.check([199, 113]))
        return {
          ext: "cpio",
          mime: "application/x-cpio"
        };
      if (this.check([96, 234]))
        return {
          ext: "arj",
          mime: "application/x-arj"
        };
      if (this.check([239, 187, 191]))
        return this.tokenizer.ignore(3), this.detectConfident(e);
      if (this.check([71, 73, 70]))
        return {
          ext: "gif",
          mime: "image/gif"
        };
      if (this.check([73, 73, 188]))
        return {
          ext: "jxr",
          mime: "image/vnd.ms-photo"
        };
      if (this.check([31, 139, 8])) {
        const r = new Gi(e).inflate();
        let n = !0;
        try {
          let a;
          try {
            a = await this.fromStream(r);
          } catch {
            n = !1;
          }
          if (a && a.ext === "tar")
            return {
              ext: "tar.gz",
              mime: "application/gzip"
            };
        } finally {
          n && await r.cancel();
        }
        return {
          ext: "gz",
          mime: "application/gzip"
        };
      }
      if (this.check([66, 90, 104]))
        return {
          ext: "bz2",
          mime: "application/x-bzip2"
        };
      if (this.checkString("ID3")) {
        await e.ignore(6);
        const t = await e.readToken(Ki);
        return e.position + t > e.fileInfo.size ? {
          ext: "mp3",
          mime: "audio/mpeg"
        } : (await e.ignore(t), this.fromTokenizer(e));
      }
      if (this.checkString("MP+"))
        return {
          ext: "mpc",
          mime: "audio/x-musepack"
        };
      if ((this.buffer[0] === 67 || this.buffer[0] === 70) && this.check([87, 83], { offset: 1 }))
        return {
          ext: "swf",
          mime: "application/x-shockwave-flash"
        };
      if (this.check([255, 216, 255]))
        return this.check([247], { offset: 3 }) ? {
          ext: "jls",
          mime: "image/jls"
        } : {
          ext: "jpg",
          mime: "image/jpeg"
        };
      if (this.check([79, 98, 106, 1]))
        return {
          ext: "avro",
          mime: "application/avro"
        };
      if (this.checkString("FLIF"))
        return {
          ext: "flif",
          mime: "image/flif"
        };
      if (this.checkString("8BPS"))
        return {
          ext: "psd",
          mime: "image/vnd.adobe.photoshop"
        };
      if (this.checkString("MPCK"))
        return {
          ext: "mpc",
          mime: "audio/x-musepack"
        };
      if (this.checkString("FORM"))
        return {
          ext: "aif",
          mime: "audio/aiff"
        };
      if (this.checkString("icns", { offset: 0 }))
        return {
          ext: "icns",
          mime: "image/icns"
        };
      if (this.check([80, 75, 3, 4])) {
        let t;
        return await new _e(e).unzip((r) => {
          switch (r.filename) {
            case "META-INF/mozilla.rsa":
              return t = {
                ext: "xpi",
                mime: "application/x-xpinstall"
              }, {
                stop: !0
              };
            case "META-INF/MANIFEST.MF":
              return t = {
                ext: "jar",
                mime: "application/java-archive"
              }, {
                stop: !0
              };
            case "mimetype":
              return {
                async handler(n) {
                  const a = new TextDecoder("utf-8").decode(n).trim();
                  t = ye(a);
                },
                stop: !0
              };
            case "[Content_Types].xml":
              return {
                async handler(n) {
                  let a = new TextDecoder("utf-8").decode(n);
                  const s = a.indexOf('.main+xml"');
                  if (s === -1) {
                    const u = "application/vnd.ms-package.3dmanufacturing-3dmodel+xml";
                    a.includes(`ContentType="${u}"`) && (t = ye(u));
                  } else {
                    a = a.slice(0, Math.max(0, s));
                    const u = a.lastIndexOf('"'), o = a.slice(Math.max(0, u + 1));
                    t = ye(o);
                  }
                },
                stop: !0
              };
            default:
              return /classes\d*\.dex/.test(r.filename) ? (t = {
                ext: "apk",
                mime: "application/vnd.android.package-archive"
              }, { stop: !0 }) : {};
          }
        }).catch((r) => {
          if (!(r instanceof v))
            throw r;
        }), t ?? {
          ext: "zip",
          mime: "application/zip"
        };
      }
      if (this.checkString("OggS")) {
        await e.ignore(28);
        const t = new Uint8Array(8);
        return await e.readBuffer(t), E(t, [79, 112, 117, 115, 72, 101, 97, 100]) ? {
          ext: "opus",
          mime: "audio/ogg; codecs=opus"
        } : E(t, [128, 116, 104, 101, 111, 114, 97]) ? {
          ext: "ogv",
          mime: "video/ogg"
        } : E(t, [1, 118, 105, 100, 101, 111, 0]) ? {
          ext: "ogm",
          mime: "video/ogg"
        } : E(t, [127, 70, 76, 65, 67]) ? {
          ext: "oga",
          mime: "audio/ogg"
        } : E(t, [83, 112, 101, 101, 120, 32, 32]) ? {
          ext: "spx",
          mime: "audio/ogg"
        } : E(t, [1, 118, 111, 114, 98, 105, 115]) ? {
          ext: "ogg",
          mime: "audio/ogg"
        } : {
          ext: "ogx",
          mime: "application/ogg"
        };
      }
      if (this.check([80, 75]) && (this.buffer[2] === 3 || this.buffer[2] === 5 || this.buffer[2] === 7) && (this.buffer[3] === 4 || this.buffer[3] === 6 || this.buffer[3] === 8))
        return {
          ext: "zip",
          mime: "application/zip"
        };
      if (this.checkString("MThd"))
        return {
          ext: "mid",
          mime: "audio/midi"
        };
      if (this.checkString("wOFF") && (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString("OTTO", { offset: 4 })))
        return {
          ext: "woff",
          mime: "font/woff"
        };
      if (this.checkString("wOF2") && (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString("OTTO", { offset: 4 })))
        return {
          ext: "woff2",
          mime: "font/woff2"
        };
      if (this.check([212, 195, 178, 161]) || this.check([161, 178, 195, 212]))
        return {
          ext: "pcap",
          mime: "application/vnd.tcpdump.pcap"
        };
      if (this.checkString("DSD "))
        return {
          ext: "dsf",
          mime: "audio/x-dsf"
          // Non-standard
        };
      if (this.checkString("LZIP"))
        return {
          ext: "lz",
          mime: "application/x-lzip"
        };
      if (this.checkString("fLaC"))
        return {
          ext: "flac",
          mime: "audio/flac"
        };
      if (this.check([66, 80, 71, 251]))
        return {
          ext: "bpg",
          mime: "image/bpg"
        };
      if (this.checkString("wvpk"))
        return {
          ext: "wv",
          mime: "audio/wavpack"
        };
      if (this.checkString("%PDF"))
        return {
          ext: "pdf",
          mime: "application/pdf"
        };
      if (this.check([0, 97, 115, 109]))
        return {
          ext: "wasm",
          mime: "application/wasm"
        };
      if (this.check([73, 73])) {
        const t = await this.readTiffHeader(!1);
        if (t)
          return t;
      }
      if (this.check([77, 77])) {
        const t = await this.readTiffHeader(!0);
        if (t)
          return t;
      }
      if (this.checkString("MAC "))
        return {
          ext: "ape",
          mime: "audio/ape"
        };
      if (this.check([26, 69, 223, 163])) {
        async function t() {
          const u = await e.peekNumber(P);
          let o = 128, d = 0;
          for (; !(u & o) && o !== 0; )
            ++d, o >>= 1;
          const p = new Uint8Array(d + 1);
          return await e.readBuffer(p), p;
        }
        async function r() {
          const u = await t(), o = await t();
          o[0] ^= 128 >> o.length - 1;
          const d = Math.min(6, o.length), p = new DataView(u.buffer), c = new DataView(o.buffer, o.length - d, d);
          return {
            id: Ae(p),
            len: Ae(c)
          };
        }
        async function n(u) {
          for (; u > 0; ) {
            const o = await r();
            if (o.id === 17026)
              return (await e.readToken(new b(o.len))).replaceAll(/\00.*$/g, "");
            await e.ignore(o.len), --u;
          }
        }
        const a = await r();
        switch (await n(a.len)) {
          case "webm":
            return {
              ext: "webm",
              mime: "video/webm"
            };
          case "matroska":
            return {
              ext: "mkv",
              mime: "video/matroska"
            };
          default:
            return;
        }
      }
      if (this.checkString("SQLi"))
        return {
          ext: "sqlite",
          mime: "application/x-sqlite3"
        };
      if (this.check([78, 69, 83, 26]))
        return {
          ext: "nes",
          mime: "application/x-nintendo-nes-rom"
        };
      if (this.checkString("Cr24"))
        return {
          ext: "crx",
          mime: "application/x-google-chrome-extension"
        };
      if (this.checkString("MSCF") || this.checkString("ISc("))
        return {
          ext: "cab",
          mime: "application/vnd.ms-cab-compressed"
        };
      if (this.check([237, 171, 238, 219]))
        return {
          ext: "rpm",
          mime: "application/x-rpm"
        };
      if (this.check([197, 208, 211, 198]))
        return {
          ext: "eps",
          mime: "application/eps"
        };
      if (this.check([40, 181, 47, 253]))
        return {
          ext: "zst",
          mime: "application/zstd"
        };
      if (this.check([127, 69, 76, 70]))
        return {
          ext: "elf",
          mime: "application/x-elf"
        };
      if (this.check([33, 66, 68, 78]))
        return {
          ext: "pst",
          mime: "application/vnd.ms-outlook"
        };
      if (this.checkString("PAR1") || this.checkString("PARE"))
        return {
          ext: "parquet",
          mime: "application/vnd.apache.parquet"
        };
      if (this.checkString("ttcf"))
        return {
          ext: "ttc",
          mime: "font/collection"
        };
      if (this.check([254, 237, 250, 206]) || this.check([254, 237, 250, 207]) || this.check([206, 250, 237, 254]) || this.check([207, 250, 237, 254]))
        return {
          ext: "macho",
          mime: "application/x-mach-binary"
        };
      if (this.check([4, 34, 77, 24]))
        return {
          ext: "lz4",
          mime: "application/x-lz4"
          // Invented by us
        };
      if (this.checkString("regf"))
        return {
          ext: "dat",
          mime: "application/x-ft-windows-registry-hive"
        };
      if (this.checkString("$FL2") || this.checkString("$FL3"))
        return {
          ext: "sav",
          mime: "application/x-spss-sav"
        };
      if (this.check([79, 84, 84, 79, 0]))
        return {
          ext: "otf",
          mime: "font/otf"
        };
      if (this.checkString("#!AMR"))
        return {
          ext: "amr",
          mime: "audio/amr"
        };
      if (this.checkString("{\\rtf"))
        return {
          ext: "rtf",
          mime: "application/rtf"
        };
      if (this.check([70, 76, 86, 1]))
        return {
          ext: "flv",
          mime: "video/x-flv"
        };
      if (this.checkString("IMPM"))
        return {
          ext: "it",
          mime: "audio/x-it"
        };
      if (this.checkString("-lh0-", { offset: 2 }) || this.checkString("-lh1-", { offset: 2 }) || this.checkString("-lh2-", { offset: 2 }) || this.checkString("-lh3-", { offset: 2 }) || this.checkString("-lh4-", { offset: 2 }) || this.checkString("-lh5-", { offset: 2 }) || this.checkString("-lh6-", { offset: 2 }) || this.checkString("-lh7-", { offset: 2 }) || this.checkString("-lzs-", { offset: 2 }) || this.checkString("-lz4-", { offset: 2 }) || this.checkString("-lz5-", { offset: 2 }) || this.checkString("-lhd-", { offset: 2 }))
        return {
          ext: "lzh",
          mime: "application/x-lzh-compressed"
        };
      if (this.check([0, 0, 1, 186])) {
        if (this.check([33], { offset: 4, mask: [241] }))
          return {
            ext: "mpg",
            // May also be .ps, .mpeg
            mime: "video/MP1S"
          };
        if (this.check([68], { offset: 4, mask: [196] }))
          return {
            ext: "mpg",
            // May also be .mpg, .m2p, .vob or .sub
            mime: "video/MP2P"
          };
      }
      if (this.checkString("ITSF"))
        return {
          ext: "chm",
          mime: "application/vnd.ms-htmlhelp"
        };
      if (this.check([202, 254, 186, 190])) {
        const t = j.get(this.buffer, 4), r = M.get(this.buffer, 6);
        if (t > 0 && t <= 30)
          return {
            ext: "macho",
            mime: "application/x-mach-binary"
          };
        if (r > 30)
          return {
            ext: "class",
            mime: "application/java-vm"
          };
      }
      if (this.checkString(".RMF"))
        return {
          ext: "rm",
          mime: "application/vnd.rn-realmedia"
        };
      if (this.checkString("DRACO"))
        return {
          ext: "drc",
          mime: "application/vnd.google.draco"
          // Invented by us
        };
      if (this.check([253, 55, 122, 88, 90, 0]))
        return {
          ext: "xz",
          mime: "application/x-xz"
        };
      if (this.checkString("<?xml "))
        return {
          ext: "xml",
          mime: "application/xml"
        };
      if (this.check([55, 122, 188, 175, 39, 28]))
        return {
          ext: "7z",
          mime: "application/x-7z-compressed"
        };
      if (this.check([82, 97, 114, 33, 26, 7]) && (this.buffer[6] === 0 || this.buffer[6] === 1))
        return {
          ext: "rar",
          mime: "application/x-rar-compressed"
        };
      if (this.checkString("solid "))
        return {
          ext: "stl",
          mime: "model/stl"
        };
      if (this.checkString("AC")) {
        const t = new b(4, "latin1").get(this.buffer, 2);
        if (t.match("^d*") && t >= 1e3 && t <= 1050)
          return {
            ext: "dwg",
            mime: "image/vnd.dwg"
          };
      }
      if (this.checkString("070707"))
        return {
          ext: "cpio",
          mime: "application/x-cpio"
        };
      if (this.checkString("BLENDER"))
        return {
          ext: "blend",
          mime: "application/x-blender"
        };
      if (this.checkString("!<arch>"))
        return await e.ignore(8), await e.readToken(new b(13, "ascii")) === "debian-binary" ? {
          ext: "deb",
          mime: "application/x-deb"
        } : {
          ext: "ar",
          mime: "application/x-unix-archive"
        };
      if (this.checkString("WEBVTT") && // One of LF, CR, tab, space, or end of file must follow "WEBVTT" per the spec (see `fixture/fixture-vtt-*.vtt` for examples). Note that `\0` is technically the null character (there is no such thing as an EOF character). However, checking for `\0` gives us the same result as checking for the end of the stream.
      [`
`, "\r", "	", " ", "\0"].some((t) => this.checkString(t, { offset: 6 })))
        return {
          ext: "vtt",
          mime: "text/vtt"
        };
      if (this.check([137, 80, 78, 71, 13, 10, 26, 10])) {
        await e.ignore(8);
        async function t() {
          return {
            length: await e.readToken(ct),
            type: await e.readToken(new b(4, "latin1"))
          };
        }
        do {
          const r = await t();
          if (r.length < 0)
            return;
          switch (r.type) {
            case "IDAT":
              return {
                ext: "png",
                mime: "image/png"
              };
            case "acTL":
              return {
                ext: "apng",
                mime: "image/apng"
              };
            default:
              await e.ignore(r.length + 4);
          }
        } while (e.position + 8 < e.fileInfo.size);
        return {
          ext: "png",
          mime: "image/png"
        };
      }
      if (this.check([65, 82, 82, 79, 87, 49, 0, 0]))
        return {
          ext: "arrow",
          mime: "application/vnd.apache.arrow.file"
        };
      if (this.check([103, 108, 84, 70, 2, 0, 0, 0]))
        return {
          ext: "glb",
          mime: "model/gltf-binary"
        };
      if (this.check([102, 114, 101, 101], { offset: 4 }) || this.check([109, 100, 97, 116], { offset: 4 }) || this.check([109, 111, 111, 118], { offset: 4 }) || this.check([119, 105, 100, 101], { offset: 4 }))
        return {
          ext: "mov",
          mime: "video/quicktime"
        };
      if (this.check([73, 73, 82, 79, 8, 0, 0, 0, 24]))
        return {
          ext: "orf",
          mime: "image/x-olympus-orf"
        };
      if (this.checkString("gimp xcf "))
        return {
          ext: "xcf",
          mime: "image/x-xcf"
        };
      if (this.checkString("ftyp", { offset: 4 }) && this.buffer[8] & 96) {
        const t = new b(4, "latin1").get(this.buffer, 8).replace("\0", " ").trim();
        switch (t) {
          case "avif":
          case "avis":
            return { ext: "avif", mime: "image/avif" };
          case "mif1":
            return { ext: "heic", mime: "image/heif" };
          case "msf1":
            return { ext: "heic", mime: "image/heif-sequence" };
          case "heic":
          case "heix":
            return { ext: "heic", mime: "image/heic" };
          case "hevc":
          case "hevx":
            return { ext: "heic", mime: "image/heic-sequence" };
          case "qt":
            return { ext: "mov", mime: "video/quicktime" };
          case "M4V":
          case "M4VH":
          case "M4VP":
            return { ext: "m4v", mime: "video/x-m4v" };
          case "M4P":
            return { ext: "m4p", mime: "video/mp4" };
          case "M4B":
            return { ext: "m4b", mime: "audio/mp4" };
          case "M4A":
            return { ext: "m4a", mime: "audio/x-m4a" };
          case "F4V":
            return { ext: "f4v", mime: "video/mp4" };
          case "F4P":
            return { ext: "f4p", mime: "video/mp4" };
          case "F4A":
            return { ext: "f4a", mime: "audio/mp4" };
          case "F4B":
            return { ext: "f4b", mime: "audio/mp4" };
          case "crx":
            return { ext: "cr3", mime: "image/x-canon-cr3" };
          default:
            return t.startsWith("3g") ? t.startsWith("3g2") ? { ext: "3g2", mime: "video/3gpp2" } : { ext: "3gp", mime: "video/3gpp" } : { ext: "mp4", mime: "video/mp4" };
        }
      }
      if (this.checkString(`REGEDIT4\r
`))
        return {
          ext: "reg",
          mime: "application/x-ms-regedit"
        };
      if (this.check([82, 73, 70, 70])) {
        if (this.checkString("WEBP", { offset: 8 }))
          return {
            ext: "webp",
            mime: "image/webp"
          };
        if (this.check([65, 86, 73], { offset: 8 }))
          return {
            ext: "avi",
            mime: "video/vnd.avi"
          };
        if (this.check([87, 65, 86, 69], { offset: 8 }))
          return {
            ext: "wav",
            mime: "audio/wav"
          };
        if (this.check([81, 76, 67, 77], { offset: 8 }))
          return {
            ext: "qcp",
            mime: "audio/qcelp"
          };
      }
      if (this.check([73, 73, 85, 0, 24, 0, 0, 0, 136, 231, 116, 216]))
        return {
          ext: "rw2",
          mime: "image/x-panasonic-rw2"
        };
      if (this.check([48, 38, 178, 117, 142, 102, 207, 17, 166, 217])) {
        async function t() {
          const r = new Uint8Array(16);
          return await e.readBuffer(r), {
            id: r,
            size: Number(await e.readToken(lt))
          };
        }
        for (await e.ignore(30); e.position + 24 < e.fileInfo.size; ) {
          const r = await t();
          let n = r.size - 24;
          if (E(r.id, [145, 7, 220, 183, 183, 169, 207, 17, 142, 230, 0, 192, 12, 32, 83, 101])) {
            const a = new Uint8Array(16);
            if (n -= await e.readBuffer(a), E(a, [64, 158, 105, 248, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43]))
              return {
                ext: "asf",
                mime: "audio/x-ms-asf"
              };
            if (E(a, [192, 239, 25, 188, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43]))
              return {
                ext: "asf",
                mime: "video/x-ms-asf"
              };
            break;
          }
          await e.ignore(n);
        }
        return {
          ext: "asf",
          mime: "application/vnd.ms-asf"
        };
      }
      if (this.check([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10]))
        return {
          ext: "ktx",
          mime: "image/ktx"
        };
      if ((this.check([126, 16, 4]) || this.check([126, 24, 4])) && this.check([48, 77, 73, 69], { offset: 4 }))
        return {
          ext: "mie",
          mime: "application/x-mie"
        };
      if (this.check([39, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { offset: 2 }))
        return {
          ext: "shp",
          mime: "application/x-esri-shape"
        };
      if (this.check([255, 79, 255, 81]))
        return {
          ext: "j2c",
          mime: "image/j2c"
        };
      if (this.check([0, 0, 0, 12, 106, 80, 32, 32, 13, 10, 135, 10]))
        switch (await e.ignore(20), await e.readToken(new b(4, "ascii"))) {
          case "jp2 ":
            return {
              ext: "jp2",
              mime: "image/jp2"
            };
          case "jpx ":
            return {
              ext: "jpx",
              mime: "image/jpx"
            };
          case "jpm ":
            return {
              ext: "jpm",
              mime: "image/jpm"
            };
          case "mjp2":
            return {
              ext: "mj2",
              mime: "image/mj2"
            };
          default:
            return;
        }
      if (this.check([255, 10]) || this.check([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10]))
        return {
          ext: "jxl",
          mime: "image/jxl"
        };
      if (this.check([254, 255]))
        return this.checkString("<?xml ", { offset: 2, encoding: "utf-16be" }) ? {
          ext: "xml",
          mime: "application/xml"
        } : void 0;
      if (this.check([208, 207, 17, 224, 161, 177, 26, 225]))
        return {
          ext: "cfb",
          mime: "application/x-cfb"
        };
      if (await e.peekBuffer(this.buffer, { length: Math.min(256, e.fileInfo.size), mayBeLess: !0 }), this.check([97, 99, 115, 112], { offset: 36 }))
        return {
          ext: "icc",
          mime: "application/vnd.iccprofile"
        };
      if (this.checkString("**ACE", { offset: 7 }) && this.checkString("**", { offset: 12 }))
        return {
          ext: "ace",
          mime: "application/x-ace-compressed"
        };
      if (this.checkString("BEGIN:")) {
        if (this.checkString("VCARD", { offset: 6 }))
          return {
            ext: "vcf",
            mime: "text/vcard"
          };
        if (this.checkString("VCALENDAR", { offset: 6 }))
          return {
            ext: "ics",
            mime: "text/calendar"
          };
      }
      if (this.checkString("FUJIFILMCCD-RAW"))
        return {
          ext: "raf",
          mime: "image/x-fujifilm-raf"
        };
      if (this.checkString("Extended Module:"))
        return {
          ext: "xm",
          mime: "audio/x-xm"
        };
      if (this.checkString("Creative Voice File"))
        return {
          ext: "voc",
          mime: "audio/x-voc"
        };
      if (this.check([4, 0, 0, 0]) && this.buffer.length >= 16) {
        const t = new DataView(this.buffer.buffer).getUint32(12, !0);
        if (t > 12 && this.buffer.length >= t + 16)
          try {
            const r = new TextDecoder().decode(this.buffer.subarray(16, t + 16));
            if (JSON.parse(r).files)
              return {
                ext: "asar",
                mime: "application/x-asar"
              };
          } catch {
          }
      }
      if (this.check([6, 14, 43, 52, 2, 5, 1, 1, 13, 1, 2, 1, 1, 2]))
        return {
          ext: "mxf",
          mime: "application/mxf"
        };
      if (this.checkString("SCRM", { offset: 44 }))
        return {
          ext: "s3m",
          mime: "audio/x-s3m"
        };
      if (this.check([71]) && this.check([71], { offset: 188 }))
        return {
          ext: "mts",
          mime: "video/mp2t"
        };
      if (this.check([71], { offset: 4 }) && this.check([71], { offset: 196 }))
        return {
          ext: "mts",
          mime: "video/mp2t"
        };
      if (this.check([66, 79, 79, 75, 77, 79, 66, 73], { offset: 60 }))
        return {
          ext: "mobi",
          mime: "application/x-mobipocket-ebook"
        };
      if (this.check([68, 73, 67, 77], { offset: 128 }))
        return {
          ext: "dcm",
          mime: "application/dicom"
        };
      if (this.check([76, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70]))
        return {
          ext: "lnk",
          mime: "application/x.ms.shortcut"
          // Invented by us
        };
      if (this.check([98, 111, 111, 107, 0, 0, 0, 0, 109, 97, 114, 107, 0, 0, 0, 0]))
        return {
          ext: "alias",
          mime: "application/x.apple.alias"
          // Invented by us
        };
      if (this.checkString("Kaydara FBX Binary  \0"))
        return {
          ext: "fbx",
          mime: "application/x.autodesk.fbx"
          // Invented by us
        };
      if (this.check([76, 80], { offset: 34 }) && (this.check([0, 0, 1], { offset: 8 }) || this.check([1, 0, 2], { offset: 8 }) || this.check([2, 0, 2], { offset: 8 })))
        return {
          ext: "eot",
          mime: "application/vnd.ms-fontobject"
        };
      if (this.check([6, 6, 237, 245, 216, 29, 70, 229, 189, 49, 239, 231, 254, 116, 183, 29]))
        return {
          ext: "indd",
          mime: "application/x-indesign"
        };
      if (this.check([255, 255, 0, 0, 7, 0, 0, 0, 4, 0, 0, 0, 1, 0, 1, 0]) || this.check([0, 0, 255, 255, 0, 0, 0, 7, 0, 0, 0, 4, 0, 1, 0, 1]))
        return {
          ext: "jmp",
          mime: "application/x-jmp-data"
        };
      if (await e.peekBuffer(this.buffer, { length: Math.min(512, e.fileInfo.size), mayBeLess: !0 }), this.checkString("ustar", { offset: 257 }) && (this.checkString("\0", { offset: 262 }) || this.checkString(" ", { offset: 262 })) || this.check([0, 0, 0, 0, 0, 0], { offset: 257 }) && Zi(this.buffer))
        return {
          ext: "tar",
          mime: "application/x-tar"
        };
      if (this.check([255, 254])) {
        const t = "utf-16le";
        return this.checkString("<?xml ", { offset: 2, encoding: t }) ? {
          ext: "xml",
          mime: "application/xml"
        } : this.check([255, 14], { offset: 2 }) && this.checkString("SketchUp Model", { offset: 4, encoding: t }) ? {
          ext: "skp",
          mime: "application/vnd.sketchup.skp"
        } : this.checkString(`Windows Registry Editor Version 5.00\r
`, { offset: 2, encoding: t }) ? {
          ext: "reg",
          mime: "application/x-ms-regedit"
        } : void 0;
      }
      if (this.checkString("-----BEGIN PGP MESSAGE-----"))
        return {
          ext: "pgp",
          mime: "application/pgp-encrypted"
        };
    });
    // Detections with limited supporting data, resulting in a higher likelihood of false positives
    de(this, "detectImprecise", async (e) => {
      if (this.buffer = new Uint8Array(we), await e.peekBuffer(this.buffer, { length: Math.min(8, e.fileInfo.size), mayBeLess: !0 }), this.check([0, 0, 1, 186]) || this.check([0, 0, 1, 179]))
        return {
          ext: "mpg",
          mime: "video/mpeg"
        };
      if (this.check([0, 1, 0, 0, 0]))
        return {
          ext: "ttf",
          mime: "font/ttf"
        };
      if (this.check([0, 0, 1, 0]))
        return {
          ext: "ico",
          mime: "image/x-icon"
        };
      if (this.check([0, 0, 2, 0]))
        return {
          ext: "cur",
          mime: "image/x-icon"
        };
      if (await e.peekBuffer(this.buffer, { length: Math.min(2 + this.options.mpegOffsetTolerance, e.fileInfo.size), mayBeLess: !0 }), this.buffer.length >= 2 + this.options.mpegOffsetTolerance)
        for (let t = 0; t <= this.options.mpegOffsetTolerance; ++t) {
          const r = this.scanMpeg(t);
          if (r)
            return r;
        }
    });
    this.options = {
      mpegOffsetTolerance: 0,
      ...e
    }, this.detectors = [
      ...(e == null ? void 0 : e.customDetectors) ?? [],
      { id: "core", detect: this.detectConfident },
      { id: "core.imprecise", detect: this.detectImprecise }
    ], this.tokenizerOptions = {
      abortSignal: e == null ? void 0 : e.signal
    };
  }
  async fromTokenizer(e) {
    const t = e.position;
    for (const r of this.detectors) {
      const n = await r.detect(e);
      if (n)
        return n;
      if (t !== e.position)
        return;
    }
  }
  async fromBuffer(e) {
    if (!(e instanceof Uint8Array || e instanceof ArrayBuffer))
      throw new TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof e}\``);
    const t = e instanceof Uint8Array ? e : new Uint8Array(e);
    if ((t == null ? void 0 : t.length) > 1)
      return this.fromTokenizer(Ie(t, this.tokenizerOptions));
  }
  async fromBlob(e) {
    const t = Zt(e, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(t);
    } finally {
      await t.close();
    }
  }
  async fromStream(e) {
    const t = Yt(e, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(t);
    } finally {
      await t.close();
    }
  }
  async toDetectionStream(e, t) {
    const { sampleSize: r = we } = t;
    let n, a;
    const s = e.getReader({ mode: "byob" });
    try {
      const { value: d, done: p } = await s.read(new Uint8Array(r));
      if (a = d, !p && d)
        try {
          n = await this.fromBuffer(d.subarray(0, r));
        } catch (c) {
          if (!(c instanceof v))
            throw c;
          n = void 0;
        }
      a = d;
    } finally {
      s.releaseLock();
    }
    const u = new TransformStream({
      async start(d) {
        d.enqueue(a);
      },
      transform(d, p) {
        p.enqueue(d);
      }
    }), o = e.pipeThrough(u);
    return o.fileType = n, o;
  }
  check(e, t) {
    return E(this.buffer, e, t);
  }
  checkString(e, t) {
    return this.check(Yi(e, t == null ? void 0 : t.encoding), t);
  }
  async readTiffTag(e) {
    const t = await this.tokenizer.readToken(e ? M : T);
    switch (this.tokenizer.ignore(10), t) {
      case 50341:
        return {
          ext: "arw",
          mime: "image/x-sony-arw"
        };
      case 50706:
        return {
          ext: "dng",
          mime: "image/x-adobe-dng"
        };
    }
  }
  async readTiffIFD(e) {
    const t = await this.tokenizer.readToken(e ? M : T);
    for (let r = 0; r < t; ++r) {
      const n = await this.readTiffTag(e);
      if (n)
        return n;
    }
  }
  async readTiffHeader(e) {
    const t = (e ? M : T).get(this.buffer, 2), r = (e ? j : x).get(this.buffer, 4);
    if (t === 42) {
      if (r >= 6) {
        if (this.checkString("CR", { offset: 8 }))
          return {
            ext: "cr2",
            mime: "image/x-canon-cr2"
          };
        if (r >= 8) {
          const a = (e ? M : T).get(this.buffer, 8), s = (e ? M : T).get(this.buffer, 10);
          if (a === 28 && s === 254 || a === 31 && s === 11)
            return {
              ext: "nef",
              mime: "image/x-nikon-nef"
            };
        }
      }
      return await this.tokenizer.ignore(r), await this.readTiffIFD(e) ?? {
        ext: "tif",
        mime: "image/tiff"
      };
    }
    if (t === 43)
      return {
        ext: "tif",
        mime: "image/tiff"
      };
  }
  /**
  	Scan check MPEG 1 or 2 Layer 3 header, or 'layer 0' for ADTS (MPEG sync-word 0xFFE).
  
  	@param offset - Offset to scan for sync-preamble.
  	@returns {{ext: string, mime: string}}
  	*/
  scanMpeg(e) {
    if (this.check([255, 224], { offset: e, mask: [255, 224] })) {
      if (this.check([16], { offset: e + 1, mask: [22] }))
        return this.check([8], { offset: e + 1, mask: [8] }) ? {
          ext: "aac",
          mime: "audio/aac"
        } : {
          ext: "aac",
          mime: "audio/aac"
        };
      if (this.check([2], { offset: e + 1, mask: [6] }))
        return {
          ext: "mp3",
          mime: "audio/mpeg"
        };
      if (this.check([4], { offset: e + 1, mask: [6] }))
        return {
          ext: "mp2",
          mime: "audio/mpeg"
        };
      if (this.check([6], { offset: e + 1, mask: [6] }))
        return {
          ext: "mp1",
          mime: "audio/mpeg"
        };
    }
  }
}
new Set(Ji);
new Set(Qi);
var Me = {};
/*!
 * content-type
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
var $e = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g, tr = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/, dt = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, ir = /\\([\u000b\u0020-\u00ff])/g, rr = /([\\"])/g, ft = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
Me.format = nr;
Me.parse = ar;
function nr(i) {
  if (!i || typeof i != "object")
    throw new TypeError("argument obj is required");
  var e = i.parameters, t = i.type;
  if (!t || !ft.test(t))
    throw new TypeError("invalid type");
  var r = t;
  if (e && typeof e == "object")
    for (var n, a = Object.keys(e).sort(), s = 0; s < a.length; s++) {
      if (n = a[s], !dt.test(n))
        throw new TypeError("invalid parameter name");
      r += "; " + n + "=" + or(e[n]);
    }
  return r;
}
function ar(i) {
  if (!i)
    throw new TypeError("argument string is required");
  var e = typeof i == "object" ? sr(i) : i;
  if (typeof e != "string")
    throw new TypeError("argument string is required to be a string");
  var t = e.indexOf(";"), r = t !== -1 ? e.slice(0, t).trim() : e.trim();
  if (!ft.test(r))
    throw new TypeError("invalid media type");
  var n = new cr(r.toLowerCase());
  if (t !== -1) {
    var a, s, u;
    for ($e.lastIndex = t; s = $e.exec(e); ) {
      if (s.index !== t)
        throw new TypeError("invalid parameter format");
      t += s[0].length, a = s[1].toLowerCase(), u = s[2], u.charCodeAt(0) === 34 && (u = u.slice(1, -1), u.indexOf("\\") !== -1 && (u = u.replace(ir, "$1"))), n.parameters[a] = u;
    }
    if (t !== e.length)
      throw new TypeError("invalid parameter format");
  }
  return n;
}
function sr(i) {
  var e;
  if (typeof i.getHeader == "function" ? e = i.getHeader("content-type") : typeof i.headers == "object" && (e = i.headers && i.headers["content-type"]), typeof e != "string")
    throw new TypeError("content-type header is missing from object");
  return e;
}
function or(i) {
  var e = String(i);
  if (dt.test(e))
    return e;
  if (e.length > 0 && !tr.test(e))
    throw new TypeError("invalid parameter value");
  return '"' + e.replace(rr, "\\$1") + '"';
}
function cr(i) {
  this.parameters = /* @__PURE__ */ Object.create(null), this.type = i;
}
/*!
 * media-typer
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */
var lr = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/, ur = mr;
function mr(i) {
  if (!i)
    throw new TypeError("argument string is required");
  if (typeof i != "string")
    throw new TypeError("argument string is required to be a string");
  var e = lr.exec(i.toLowerCase());
  if (!e)
    throw new TypeError("invalid media type");
  var t = e[1], r = e[2], n, a = r.lastIndexOf("+");
  return a !== -1 && (n = r.substr(a + 1), r = r.substr(0, a)), new pr(t, r, n);
}
function pr(i, e, t) {
  this.type = i, this.subtype = e, this.suffix = t;
}
const Pn = {
  10: "shot",
  20: "scene",
  30: "track",
  40: "part",
  50: "album",
  60: "edition",
  70: "collection"
}, R = {
  video: 1,
  audio: 2,
  complex: 3,
  logo: 4,
  subtitle: 17,
  button: 18,
  control: 32
}, dr = {
  [R.video]: "video",
  [R.audio]: "audio",
  [R.complex]: "complex",
  [R.logo]: "logo",
  [R.subtitle]: "subtitle",
  [R.button]: "button",
  [R.control]: "control"
}, H = (i) => class extends Error {
  constructor(t) {
    super(t), this.name = i;
  }
};
class ht extends H("CouldNotDetermineFileTypeError") {
}
class xt extends H("UnsupportedFileTypeError") {
}
class fr extends H("UnexpectedFileContentError") {
  constructor(e, t) {
    super(t), this.fileType = e;
  }
  // Override toString to include file type information.
  toString() {
    return `${this.name} (FileType: ${this.fileType}): ${this.message}`;
  }
}
class Fe extends H("FieldDecodingError") {
}
class gt extends H("InternalParserError") {
}
const hr = (i) => class extends fr {
  constructor(e) {
    super(i, e);
  }
};
function G(i, e, t) {
  return (i[e] & 1 << t) !== 0;
}
function Ve(i, e) {
  const t = i.length;
  if (e === "utf-16le") {
    for (let r = 0; r + 1 < t; r += 2)
      if (i[r] === 0 && i[r + 1] === 0)
        return r;
    return t;
  }
  for (let r = 0; r < t; r++)
    if (i[r] === 0)
      return r;
  return t;
}
function xr(i) {
  const e = i.indexOf("\0");
  return e === -1 ? i : i.substring(0, e);
}
function gr(i) {
  const e = i.length;
  if (e & 1)
    throw new Fe("Buffer length must be even");
  for (let t = 0; t < e; t += 2) {
    const r = i[t];
    i[t] = i[t + 1], i[t + 1] = r;
  }
  return i;
}
function Se(i, e) {
  if (i[0] === 255 && i[1] === 254)
    return Se(i.subarray(2), e);
  if (e === "utf-16le" && i[0] === 254 && i[1] === 255) {
    if (i.length & 1)
      throw new Fe("Expected even number of octets for 16-bit unicode string");
    return Se(gr(i), e);
  }
  return new b(i.length, e).get(i, 0);
}
function Ln(i) {
  return i = i.replace(/^\x00+/g, ""), i = i.replace(/\x00+$/g, ""), i;
}
function Tt(i, e, t, r) {
  const n = e + ~~(t / 8), a = t % 8;
  let s = i[n];
  s &= 255 >> a;
  const u = 8 - a, o = r - u;
  return o < 0 ? s >>= 8 - a - r : o > 0 && (s <<= o, s |= Tt(i, e, t + u, o)), s;
}
function Nn(i, e, t) {
  return Tt(i, e, t, 1) === 1;
}
function Tr(i) {
  const e = [];
  for (let t = 0, r = i.length; t < r; t++) {
    const n = Number(i.charCodeAt(t)).toString(16);
    e.push(n.length === 1 ? `0${n}` : n);
  }
  return e.join(" ");
}
function wr(i) {
  return 10 * Math.log10(i);
}
function yr(i) {
  return 10 ** (i / 10);
}
function br(i) {
  const e = i.split(" ").map((t) => t.trim().toLowerCase());
  if (e.length >= 1) {
    const t = Number.parseFloat(e[0]);
    return e.length === 2 && e[1] === "db" ? {
      dB: t,
      ratio: yr(t)
    } : {
      dB: wr(t),
      ratio: t
    };
  }
}
function Un(i) {
  if (i.length === 0)
    throw new Error("decodeUintBE: empty Uint8Array");
  const e = new DataView(i.buffer, i.byteOffset, i.byteLength);
  return Ae(e);
}
const Xn = {
  0: "Other",
  1: "32x32 pixels 'file icon' (PNG only)",
  2: "Other file icon",
  3: "Cover (front)",
  4: "Cover (back)",
  5: "Leaflet page",
  6: "Media (e.g. label side of CD)",
  7: "Lead artist/lead performer/soloist",
  8: "Artist/performer",
  9: "Conductor",
  10: "Band/Orchestra",
  11: "Composer",
  12: "Lyricist/text writer",
  13: "Recording Location",
  14: "During recording",
  15: "During performance",
  16: "Movie/video screen capture",
  17: "A bright coloured fish",
  18: "Illustration",
  19: "Band/artist logotype",
  20: "Publisher/Studio logotype"
}, wt = {
  lyrics: 1
}, yt = {
  notSynchronized: 0,
  milliseconds: 2
}, kr = {
  get: (i, e) => i[e + 3] & 127 | i[e + 2] << 7 | i[e + 1] << 14 | i[e] << 21,
  len: 4
}, Gn = {
  len: 10,
  get: (i, e) => ({
    // ID3v2/file identifier   "ID3"
    fileIdentifier: new b(3, "ascii").get(i, e),
    // ID3v2 versionIndex
    version: {
      major: Ce.get(i, e + 3),
      revision: Ce.get(i, e + 4)
    },
    // ID3v2 flags
    flags: {
      // Unsynchronisation
      unsynchronisation: G(i, e + 5, 7),
      // Extended header
      isExtendedHeader: G(i, e + 5, 6),
      // Experimental indicator
      expIndicator: G(i, e + 5, 5),
      footer: G(i, e + 5, 4)
    },
    size: kr.get(i, e + 6)
  })
}, jn = {
  len: 10,
  get: (i, e) => ({
    // Extended header size
    size: j.get(i, e),
    // Extended Flags
    extendedFlags: M.get(i, e + 4),
    // Size of padding
    sizeOfPadding: j.get(i, e + 6),
    // CRC data present
    crcDataPresent: G(i, e + 4, 31)
  })
}, Ir = {
  len: 1,
  get: (i, e) => {
    switch (i[e]) {
      case 0:
        return { encoding: "latin1" };
      case 1:
        return { encoding: "utf-16le", bom: !0 };
      case 2:
        return { encoding: "utf-16le", bom: !1 };
      case 3:
        return { encoding: "utf8", bom: !1 };
      default:
        return { encoding: "utf8", bom: !1 };
    }
  }
}, vr = {
  len: 4,
  get: (i, e) => ({
    encoding: Ir.get(i, e),
    language: new b(3, "latin1").get(i, e + 1)
  })
}, Wn = {
  len: 6,
  get: (i, e) => {
    const t = vr.get(i, e);
    return {
      encoding: t.encoding,
      language: t.language,
      timeStampFormat: P.get(i, e + 4),
      contentType: P.get(i, e + 5)
    };
  }
}, m = {
  multiple: !1
}, oe = {
  year: m,
  track: m,
  disk: m,
  title: m,
  artist: m,
  artists: { multiple: !0, unique: !0 },
  albumartist: m,
  album: m,
  date: m,
  originaldate: m,
  originalyear: m,
  releasedate: m,
  comment: { multiple: !0, unique: !1 },
  genre: { multiple: !0, unique: !0 },
  picture: { multiple: !0, unique: !0 },
  composer: { multiple: !0, unique: !0 },
  lyrics: { multiple: !0, unique: !1 },
  albumsort: { multiple: !1, unique: !0 },
  titlesort: { multiple: !1, unique: !0 },
  work: { multiple: !1, unique: !0 },
  artistsort: { multiple: !1, unique: !0 },
  albumartistsort: { multiple: !1, unique: !0 },
  composersort: { multiple: !1, unique: !0 },
  lyricist: { multiple: !0, unique: !0 },
  writer: { multiple: !0, unique: !0 },
  conductor: { multiple: !0, unique: !0 },
  remixer: { multiple: !0, unique: !0 },
  arranger: { multiple: !0, unique: !0 },
  engineer: { multiple: !0, unique: !0 },
  producer: { multiple: !0, unique: !0 },
  technician: { multiple: !0, unique: !0 },
  djmixer: { multiple: !0, unique: !0 },
  mixer: { multiple: !0, unique: !0 },
  label: { multiple: !0, unique: !0 },
  grouping: m,
  subtitle: { multiple: !0 },
  discsubtitle: m,
  totaltracks: m,
  totaldiscs: m,
  compilation: m,
  rating: { multiple: !0 },
  bpm: m,
  mood: m,
  media: m,
  catalognumber: { multiple: !0, unique: !0 },
  tvShow: m,
  tvShowSort: m,
  tvSeason: m,
  tvEpisode: m,
  tvEpisodeId: m,
  tvNetwork: m,
  podcast: m,
  podcasturl: m,
  releasestatus: m,
  releasetype: { multiple: !0 },
  releasecountry: m,
  script: m,
  language: m,
  copyright: m,
  license: m,
  encodedby: m,
  encodersettings: m,
  gapless: m,
  barcode: m,
  isrc: { multiple: !0 },
  asin: m,
  musicbrainz_recordingid: m,
  musicbrainz_trackid: m,
  musicbrainz_albumid: m,
  musicbrainz_artistid: { multiple: !0 },
  musicbrainz_albumartistid: { multiple: !0 },
  musicbrainz_releasegroupid: m,
  musicbrainz_workid: m,
  musicbrainz_trmid: m,
  musicbrainz_discid: m,
  acoustid_id: m,
  acoustid_fingerprint: m,
  musicip_puid: m,
  musicip_fingerprint: m,
  website: m,
  "performer:instrument": { multiple: !0, unique: !0 },
  averageLevel: m,
  peakLevel: m,
  notes: { multiple: !0, unique: !1 },
  key: m,
  originalalbum: m,
  originalartist: m,
  discogs_artist_id: { multiple: !0, unique: !0 },
  discogs_release_id: m,
  discogs_label_id: m,
  discogs_master_release_id: m,
  discogs_votes: m,
  discogs_rating: m,
  replaygain_track_peak: m,
  replaygain_track_gain: m,
  replaygain_album_peak: m,
  replaygain_album_gain: m,
  replaygain_track_minmax: m,
  replaygain_album_minmax: m,
  replaygain_undo: m,
  description: { multiple: !0 },
  longDescription: m,
  category: { multiple: !0 },
  hdVideo: m,
  keywords: { multiple: !0 },
  movement: m,
  movementIndex: m,
  movementTotal: m,
  podcastId: m,
  showMovement: m,
  stik: m,
  playCounter: m
};
function Cr(i) {
  return oe[i] && !oe[i].multiple;
}
function Ar(i) {
  return !oe[i].multiple || oe[i].unique || !1;
}
class A {
  static toIntOrNull(e) {
    const t = Number.parseInt(e, 10);
    return Number.isNaN(t) ? null : t;
  }
  // TODO: a string of 1of1 would fail to be converted
  // converts 1/10 to no : 1, of : 10
  // or 1 to no : 1, of : 0
  static normalizeTrack(e) {
    const t = e.toString().split("/");
    return {
      no: Number.parseInt(t[0], 10) || null,
      of: Number.parseInt(t[1], 10) || null
    };
  }
  constructor(e, t) {
    this.tagTypes = e, this.tagMap = t;
  }
  /**
   * Process and set common tags
   * write common tags to
   * @param tag Native tag
   * @param warnings Register warnings
   * @return common name
   */
  mapGenericTag(e, t) {
    e = { id: e.id, value: e.value }, this.postMap(e, t);
    const r = this.getCommonName(e.id);
    return r ? { id: r, value: e.value } : null;
  }
  /**
   * Convert native tag key to common tag key
   * @param tag Native header tag
   * @return common tag name (alias)
   */
  getCommonName(e) {
    return this.tagMap[e];
  }
  /**
   * Handle post mapping exceptions / correction
   * @param tag Tag e.g. {"©alb", "Buena Vista Social Club")
   * @param warnings Used to register warnings
   */
  postMap(e, t) {
  }
}
A.maxRatingScore = 1;
const Sr = {
  title: "title",
  artist: "artist",
  album: "album",
  year: "year",
  comment: "comment",
  track: "track",
  genre: "genre"
};
class Er extends A {
  constructor() {
    super(["ID3v1"], Sr);
  }
}
class q extends A {
  constructor(e, t) {
    const r = {};
    for (const n of Object.keys(t))
      r[n.toUpperCase()] = t[n];
    super(e, r);
  }
  /**
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  getCommonName(e) {
    return this.tagMap[e.toUpperCase()];
  }
}
const Rr = {
  // id3v2.3
  TIT2: "title",
  TPE1: "artist",
  "TXXX:Artists": "artists",
  TPE2: "albumartist",
  TALB: "album",
  TDRV: "date",
  // [ 'date', 'year' ] ToDo: improve 'year' mapping
  /**
   * Original release year
   */
  TORY: "originalyear",
  TPOS: "disk",
  TCON: "genre",
  APIC: "picture",
  TCOM: "composer",
  USLT: "lyrics",
  TSOA: "albumsort",
  TSOT: "titlesort",
  TOAL: "originalalbum",
  TSOP: "artistsort",
  TSO2: "albumartistsort",
  TSOC: "composersort",
  TEXT: "lyricist",
  "TXXX:Writer": "writer",
  TPE3: "conductor",
  // 'IPLS:instrument': 'performer:instrument', // ToDo
  TPE4: "remixer",
  "IPLS:arranger": "arranger",
  "IPLS:engineer": "engineer",
  "IPLS:producer": "producer",
  "IPLS:DJ-mix": "djmixer",
  "IPLS:mix": "mixer",
  TPUB: "label",
  TIT1: "grouping",
  TIT3: "subtitle",
  TRCK: "track",
  TCMP: "compilation",
  POPM: "rating",
  TBPM: "bpm",
  TMED: "media",
  "TXXX:CATALOGNUMBER": "catalognumber",
  "TXXX:MusicBrainz Album Status": "releasestatus",
  "TXXX:MusicBrainz Album Type": "releasetype",
  /**
   * Release country as documented: https://picard.musicbrainz.org/docs/mappings/#cite_note-0
   */
  "TXXX:MusicBrainz Album Release Country": "releasecountry",
  /**
   * Release country as implemented // ToDo: report
   */
  "TXXX:RELEASECOUNTRY": "releasecountry",
  "TXXX:SCRIPT": "script",
  TLAN: "language",
  TCOP: "copyright",
  WCOP: "license",
  TENC: "encodedby",
  TSSE: "encodersettings",
  "TXXX:BARCODE": "barcode",
  "TXXX:ISRC": "isrc",
  TSRC: "isrc",
  "TXXX:ASIN": "asin",
  "TXXX:originalyear": "originalyear",
  "UFID:http://musicbrainz.org": "musicbrainz_recordingid",
  "TXXX:MusicBrainz Release Track Id": "musicbrainz_trackid",
  "TXXX:MusicBrainz Album Id": "musicbrainz_albumid",
  "TXXX:MusicBrainz Artist Id": "musicbrainz_artistid",
  "TXXX:MusicBrainz Album Artist Id": "musicbrainz_albumartistid",
  "TXXX:MusicBrainz Release Group Id": "musicbrainz_releasegroupid",
  "TXXX:MusicBrainz Work Id": "musicbrainz_workid",
  "TXXX:MusicBrainz TRM Id": "musicbrainz_trmid",
  "TXXX:MusicBrainz Disc Id": "musicbrainz_discid",
  "TXXX:ACOUSTID_ID": "acoustid_id",
  "TXXX:Acoustid Id": "acoustid_id",
  "TXXX:Acoustid Fingerprint": "acoustid_fingerprint",
  "TXXX:MusicIP PUID": "musicip_puid",
  "TXXX:MusicMagic Fingerprint": "musicip_fingerprint",
  WOAR: "website",
  // id3v2.4
  // ToDo: In same sequence as defined at http://id3.org/id3v2.4.0-frames
  TDRC: "date",
  // date YYYY-MM-DD
  TYER: "year",
  TDOR: "originaldate",
  // 'TMCL:instrument': 'performer:instrument',
  "TIPL:arranger": "arranger",
  "TIPL:engineer": "engineer",
  "TIPL:producer": "producer",
  "TIPL:DJ-mix": "djmixer",
  "TIPL:mix": "mixer",
  TMOO: "mood",
  // additional mappings:
  SYLT: "lyrics",
  TSST: "discsubtitle",
  TKEY: "key",
  COMM: "comment",
  TOPE: "originalartist",
  // Windows Media Player
  "PRIV:AverageLevel": "averageLevel",
  "PRIV:PeakLevel": "peakLevel",
  // Discogs
  "TXXX:DISCOGS_ARTIST_ID": "discogs_artist_id",
  "TXXX:DISCOGS_ARTISTS": "artists",
  "TXXX:DISCOGS_ARTIST_NAME": "artists",
  "TXXX:DISCOGS_ALBUM_ARTISTS": "albumartist",
  "TXXX:DISCOGS_CATALOG": "catalognumber",
  "TXXX:DISCOGS_COUNTRY": "releasecountry",
  "TXXX:DISCOGS_DATE": "originaldate",
  "TXXX:DISCOGS_LABEL": "label",
  "TXXX:DISCOGS_LABEL_ID": "discogs_label_id",
  "TXXX:DISCOGS_MASTER_RELEASE_ID": "discogs_master_release_id",
  "TXXX:DISCOGS_RATING": "discogs_rating",
  "TXXX:DISCOGS_RELEASED": "date",
  "TXXX:DISCOGS_RELEASE_ID": "discogs_release_id",
  "TXXX:DISCOGS_VOTES": "discogs_votes",
  "TXXX:CATALOGID": "catalognumber",
  "TXXX:STYLE": "genre",
  "TXXX:REPLAYGAIN_TRACK_PEAK": "replaygain_track_peak",
  "TXXX:REPLAYGAIN_TRACK_GAIN": "replaygain_track_gain",
  "TXXX:REPLAYGAIN_ALBUM_PEAK": "replaygain_album_peak",
  "TXXX:REPLAYGAIN_ALBUM_GAIN": "replaygain_album_gain",
  "TXXX:MP3GAIN_MINMAX": "replaygain_track_minmax",
  "TXXX:MP3GAIN_ALBUM_MINMAX": "replaygain_album_minmax",
  "TXXX:MP3GAIN_UNDO": "replaygain_undo",
  MVNM: "movement",
  MVIN: "movementIndex",
  PCST: "podcast",
  TCAT: "category",
  TDES: "description",
  TDRL: "releasedate",
  TGID: "podcastId",
  TKWD: "keywords",
  WFED: "podcasturl",
  GRP1: "grouping",
  PCNT: "playCounter"
};
class Be extends q {
  static toRating(e) {
    return {
      source: e.email,
      rating: e.rating > 0 ? (e.rating - 1) / 254 * A.maxRatingScore : void 0
    };
  }
  constructor() {
    super(["ID3v2.3", "ID3v2.4"], Rr);
  }
  /**
   * Handle post mapping exceptions / correction
   * @param tag to post map
   * @param warnings Wil be used to register (collect) warnings
   */
  postMap(e, t) {
    switch (e.id) {
      case "UFID":
        {
          const r = e.value;
          r.owner_identifier === "http://musicbrainz.org" && (e.id += `:${r.owner_identifier}`, e.value = Se(r.identifier, "latin1"));
        }
        break;
      case "PRIV":
        {
          const r = e.value;
          switch (r.owner_identifier) {
            case "AverageLevel":
            case "PeakValue":
              e.id += `:${r.owner_identifier}`, e.value = r.data.length === 4 ? x.get(r.data, 0) : null, e.value === null && t.addWarning("Failed to parse PRIV:PeakValue");
              break;
            default:
              t.addWarning(`Unknown PRIV owner-identifier: ${r.data}`);
          }
        }
        break;
      case "POPM":
        e.value = Be.toRating(e.value);
        break;
    }
  }
}
const _r = {
  Title: "title",
  Author: "artist",
  "WM/AlbumArtist": "albumartist",
  "WM/AlbumTitle": "album",
  "WM/Year": "date",
  // changed to 'year' to 'date' based on Picard mappings; ToDo: check me
  "WM/OriginalReleaseTime": "originaldate",
  "WM/OriginalReleaseYear": "originalyear",
  Description: "comment",
  "WM/TrackNumber": "track",
  "WM/PartOfSet": "disk",
  "WM/Genre": "genre",
  "WM/Composer": "composer",
  "WM/Lyrics": "lyrics",
  "WM/AlbumSortOrder": "albumsort",
  "WM/TitleSortOrder": "titlesort",
  "WM/ArtistSortOrder": "artistsort",
  "WM/AlbumArtistSortOrder": "albumartistsort",
  "WM/ComposerSortOrder": "composersort",
  "WM/Writer": "lyricist",
  "WM/Conductor": "conductor",
  "WM/ModifiedBy": "remixer",
  "WM/Engineer": "engineer",
  "WM/Producer": "producer",
  "WM/DJMixer": "djmixer",
  "WM/Mixer": "mixer",
  "WM/Publisher": "label",
  "WM/ContentGroupDescription": "grouping",
  "WM/SubTitle": "subtitle",
  "WM/SetSubTitle": "discsubtitle",
  // 'WM/PartOfSet': 'totaldiscs',
  "WM/IsCompilation": "compilation",
  "WM/SharedUserRating": "rating",
  "WM/BeatsPerMinute": "bpm",
  "WM/Mood": "mood",
  "WM/Media": "media",
  "WM/CatalogNo": "catalognumber",
  "MusicBrainz/Album Status": "releasestatus",
  "MusicBrainz/Album Type": "releasetype",
  "MusicBrainz/Album Release Country": "releasecountry",
  "WM/Script": "script",
  "WM/Language": "language",
  Copyright: "copyright",
  LICENSE: "license",
  "WM/EncodedBy": "encodedby",
  "WM/EncodingSettings": "encodersettings",
  "WM/Barcode": "barcode",
  "WM/ISRC": "isrc",
  "MusicBrainz/Track Id": "musicbrainz_recordingid",
  "MusicBrainz/Release Track Id": "musicbrainz_trackid",
  "MusicBrainz/Album Id": "musicbrainz_albumid",
  "MusicBrainz/Artist Id": "musicbrainz_artistid",
  "MusicBrainz/Album Artist Id": "musicbrainz_albumartistid",
  "MusicBrainz/Release Group Id": "musicbrainz_releasegroupid",
  "MusicBrainz/Work Id": "musicbrainz_workid",
  "MusicBrainz/TRM Id": "musicbrainz_trmid",
  "MusicBrainz/Disc Id": "musicbrainz_discid",
  "Acoustid/Id": "acoustid_id",
  "Acoustid/Fingerprint": "acoustid_fingerprint",
  "MusicIP/PUID": "musicip_puid",
  "WM/ARTISTS": "artists",
  "WM/InitialKey": "key",
  ASIN: "asin",
  "WM/Work": "work",
  "WM/AuthorURL": "website",
  "WM/Picture": "picture"
};
class De extends A {
  static toRating(e) {
    return {
      rating: Number.parseFloat(e + 1) / 5
    };
  }
  constructor() {
    super(["asf"], _r);
  }
  postMap(e) {
    switch (e.id) {
      case "WM/SharedUserRating": {
        const t = e.id.split(":");
        e.value = De.toRating(e.value), e.id = t[0];
        break;
      }
    }
  }
}
const Mr = {
  TT2: "title",
  TP1: "artist",
  TP2: "albumartist",
  TAL: "album",
  TYE: "year",
  COM: "comment",
  TRK: "track",
  TPA: "disk",
  TCO: "genre",
  PIC: "picture",
  TCM: "composer",
  TOR: "originaldate",
  TOT: "originalalbum",
  TXT: "lyricist",
  TP3: "conductor",
  TPB: "label",
  TT1: "grouping",
  TT3: "subtitle",
  TLA: "language",
  TCR: "copyright",
  WCP: "license",
  TEN: "encodedby",
  TSS: "encodersettings",
  WAR: "website",
  PCS: "podcast",
  TCP: "compilation",
  TDR: "date",
  TS2: "albumartistsort",
  TSA: "albumsort",
  TSC: "composersort",
  TSP: "artistsort",
  TST: "titlesort",
  WFD: "podcasturl",
  TBP: "bpm"
};
class Fr extends q {
  constructor() {
    super(["ID3v2.2"], Mr);
  }
}
const Br = {
  Title: "title",
  Artist: "artist",
  Artists: "artists",
  "Album Artist": "albumartist",
  Album: "album",
  Year: "date",
  Originalyear: "originalyear",
  Originaldate: "originaldate",
  Releasedate: "releasedate",
  Comment: "comment",
  Track: "track",
  Disc: "disk",
  DISCNUMBER: "disk",
  // ToDo: backwards compatibility', valid tag?
  Genre: "genre",
  "Cover Art (Front)": "picture",
  "Cover Art (Back)": "picture",
  Composer: "composer",
  Lyrics: "lyrics",
  ALBUMSORT: "albumsort",
  TITLESORT: "titlesort",
  WORK: "work",
  ARTISTSORT: "artistsort",
  ALBUMARTISTSORT: "albumartistsort",
  COMPOSERSORT: "composersort",
  Lyricist: "lyricist",
  Writer: "writer",
  Conductor: "conductor",
  // 'Performer=artist (instrument)': 'performer:instrument',
  MixArtist: "remixer",
  Arranger: "arranger",
  Engineer: "engineer",
  Producer: "producer",
  DJMixer: "djmixer",
  Mixer: "mixer",
  Label: "label",
  Grouping: "grouping",
  Subtitle: "subtitle",
  DiscSubtitle: "discsubtitle",
  Compilation: "compilation",
  BPM: "bpm",
  Mood: "mood",
  Media: "media",
  CatalogNumber: "catalognumber",
  MUSICBRAINZ_ALBUMSTATUS: "releasestatus",
  MUSICBRAINZ_ALBUMTYPE: "releasetype",
  RELEASECOUNTRY: "releasecountry",
  Script: "script",
  Language: "language",
  Copyright: "copyright",
  LICENSE: "license",
  EncodedBy: "encodedby",
  EncoderSettings: "encodersettings",
  Barcode: "barcode",
  ISRC: "isrc",
  ASIN: "asin",
  musicbrainz_trackid: "musicbrainz_recordingid",
  musicbrainz_releasetrackid: "musicbrainz_trackid",
  MUSICBRAINZ_ALBUMID: "musicbrainz_albumid",
  MUSICBRAINZ_ARTISTID: "musicbrainz_artistid",
  MUSICBRAINZ_ALBUMARTISTID: "musicbrainz_albumartistid",
  MUSICBRAINZ_RELEASEGROUPID: "musicbrainz_releasegroupid",
  MUSICBRAINZ_WORKID: "musicbrainz_workid",
  MUSICBRAINZ_TRMID: "musicbrainz_trmid",
  MUSICBRAINZ_DISCID: "musicbrainz_discid",
  Acoustid_Id: "acoustid_id",
  ACOUSTID_FINGERPRINT: "acoustid_fingerprint",
  MUSICIP_PUID: "musicip_puid",
  Weblink: "website",
  REPLAYGAIN_TRACK_GAIN: "replaygain_track_gain",
  REPLAYGAIN_TRACK_PEAK: "replaygain_track_peak",
  MP3GAIN_MINMAX: "replaygain_track_minmax",
  MP3GAIN_UNDO: "replaygain_undo"
};
class Dr extends q {
  constructor() {
    super(["APEv2"], Br);
  }
}
const Or = {
  "©nam": "title",
  "©ART": "artist",
  aART: "albumartist",
  /**
   * ToDo: Album artist seems to be stored here while Picard documentation says: aART
   */
  "----:com.apple.iTunes:Band": "albumartist",
  "©alb": "album",
  "©day": "date",
  "©cmt": "comment",
  "©com": "comment",
  trkn: "track",
  disk: "disk",
  "©gen": "genre",
  covr: "picture",
  "©wrt": "composer",
  "©lyr": "lyrics",
  soal: "albumsort",
  sonm: "titlesort",
  soar: "artistsort",
  soaa: "albumartistsort",
  soco: "composersort",
  "----:com.apple.iTunes:LYRICIST": "lyricist",
  "----:com.apple.iTunes:CONDUCTOR": "conductor",
  "----:com.apple.iTunes:REMIXER": "remixer",
  "----:com.apple.iTunes:ENGINEER": "engineer",
  "----:com.apple.iTunes:PRODUCER": "producer",
  "----:com.apple.iTunes:DJMIXER": "djmixer",
  "----:com.apple.iTunes:MIXER": "mixer",
  "----:com.apple.iTunes:LABEL": "label",
  "©grp": "grouping",
  "----:com.apple.iTunes:SUBTITLE": "subtitle",
  "----:com.apple.iTunes:DISCSUBTITLE": "discsubtitle",
  cpil: "compilation",
  tmpo: "bpm",
  "----:com.apple.iTunes:MOOD": "mood",
  "----:com.apple.iTunes:MEDIA": "media",
  "----:com.apple.iTunes:CATALOGNUMBER": "catalognumber",
  tvsh: "tvShow",
  tvsn: "tvSeason",
  tves: "tvEpisode",
  sosn: "tvShowSort",
  tven: "tvEpisodeId",
  tvnn: "tvNetwork",
  pcst: "podcast",
  purl: "podcasturl",
  "----:com.apple.iTunes:MusicBrainz Album Status": "releasestatus",
  "----:com.apple.iTunes:MusicBrainz Album Type": "releasetype",
  "----:com.apple.iTunes:MusicBrainz Album Release Country": "releasecountry",
  "----:com.apple.iTunes:SCRIPT": "script",
  "----:com.apple.iTunes:LANGUAGE": "language",
  cprt: "copyright",
  "©cpy": "copyright",
  "----:com.apple.iTunes:LICENSE": "license",
  "©too": "encodedby",
  pgap: "gapless",
  "----:com.apple.iTunes:BARCODE": "barcode",
  "----:com.apple.iTunes:ISRC": "isrc",
  "----:com.apple.iTunes:ASIN": "asin",
  "----:com.apple.iTunes:NOTES": "comment",
  "----:com.apple.iTunes:MusicBrainz Track Id": "musicbrainz_recordingid",
  "----:com.apple.iTunes:MusicBrainz Release Track Id": "musicbrainz_trackid",
  "----:com.apple.iTunes:MusicBrainz Album Id": "musicbrainz_albumid",
  "----:com.apple.iTunes:MusicBrainz Artist Id": "musicbrainz_artistid",
  "----:com.apple.iTunes:MusicBrainz Album Artist Id": "musicbrainz_albumartistid",
  "----:com.apple.iTunes:MusicBrainz Release Group Id": "musicbrainz_releasegroupid",
  "----:com.apple.iTunes:MusicBrainz Work Id": "musicbrainz_workid",
  "----:com.apple.iTunes:MusicBrainz TRM Id": "musicbrainz_trmid",
  "----:com.apple.iTunes:MusicBrainz Disc Id": "musicbrainz_discid",
  "----:com.apple.iTunes:Acoustid Id": "acoustid_id",
  "----:com.apple.iTunes:Acoustid Fingerprint": "acoustid_fingerprint",
  "----:com.apple.iTunes:MusicIP PUID": "musicip_puid",
  "----:com.apple.iTunes:fingerprint": "musicip_fingerprint",
  "----:com.apple.iTunes:replaygain_track_gain": "replaygain_track_gain",
  "----:com.apple.iTunes:replaygain_track_peak": "replaygain_track_peak",
  "----:com.apple.iTunes:replaygain_album_gain": "replaygain_album_gain",
  "----:com.apple.iTunes:replaygain_album_peak": "replaygain_album_peak",
  "----:com.apple.iTunes:replaygain_track_minmax": "replaygain_track_minmax",
  "----:com.apple.iTunes:replaygain_album_minmax": "replaygain_album_minmax",
  "----:com.apple.iTunes:replaygain_undo": "replaygain_undo",
  // Additional mappings:
  gnre: "genre",
  // ToDo: check mapping
  "----:com.apple.iTunes:ALBUMARTISTSORT": "albumartistsort",
  "----:com.apple.iTunes:ARTISTS": "artists",
  "----:com.apple.iTunes:ORIGINALDATE": "originaldate",
  "----:com.apple.iTunes:ORIGINALYEAR": "originalyear",
  "----:com.apple.iTunes:RELEASEDATE": "releasedate",
  // '----:com.apple.iTunes:PERFORMER': 'performer'
  desc: "description",
  ldes: "longDescription",
  "©mvn": "movement",
  "©mvi": "movementIndex",
  "©mvc": "movementTotal",
  "©wrk": "work",
  catg: "category",
  egid: "podcastId",
  hdvd: "hdVideo",
  keyw: "keywords",
  shwm: "showMovement",
  stik: "stik",
  rate: "rating"
}, Pr = "iTunes";
class Ye extends q {
  constructor() {
    super([Pr], Or);
  }
  postMap(e, t) {
    switch (e.id) {
      case "rate":
        e.value = {
          source: void 0,
          rating: Number.parseFloat(e.value) / 100
        };
        break;
    }
  }
}
const zr = {
  TITLE: "title",
  ARTIST: "artist",
  ARTISTS: "artists",
  ALBUMARTIST: "albumartist",
  "ALBUM ARTIST": "albumartist",
  ALBUM: "album",
  DATE: "date",
  ORIGINALDATE: "originaldate",
  ORIGINALYEAR: "originalyear",
  RELEASEDATE: "releasedate",
  COMMENT: "comment",
  TRACKNUMBER: "track",
  DISCNUMBER: "disk",
  GENRE: "genre",
  METADATA_BLOCK_PICTURE: "picture",
  COMPOSER: "composer",
  LYRICS: "lyrics",
  ALBUMSORT: "albumsort",
  TITLESORT: "titlesort",
  WORK: "work",
  ARTISTSORT: "artistsort",
  ALBUMARTISTSORT: "albumartistsort",
  COMPOSERSORT: "composersort",
  LYRICIST: "lyricist",
  WRITER: "writer",
  CONDUCTOR: "conductor",
  // 'PERFORMER=artist (instrument)': 'performer:instrument', // ToDo
  REMIXER: "remixer",
  ARRANGER: "arranger",
  ENGINEER: "engineer",
  PRODUCER: "producer",
  DJMIXER: "djmixer",
  MIXER: "mixer",
  LABEL: "label",
  GROUPING: "grouping",
  SUBTITLE: "subtitle",
  DISCSUBTITLE: "discsubtitle",
  TRACKTOTAL: "totaltracks",
  DISCTOTAL: "totaldiscs",
  COMPILATION: "compilation",
  RATING: "rating",
  BPM: "bpm",
  KEY: "key",
  MOOD: "mood",
  MEDIA: "media",
  CATALOGNUMBER: "catalognumber",
  RELEASESTATUS: "releasestatus",
  RELEASETYPE: "releasetype",
  RELEASECOUNTRY: "releasecountry",
  SCRIPT: "script",
  LANGUAGE: "language",
  COPYRIGHT: "copyright",
  LICENSE: "license",
  ENCODEDBY: "encodedby",
  ENCODERSETTINGS: "encodersettings",
  BARCODE: "barcode",
  ISRC: "isrc",
  ASIN: "asin",
  MUSICBRAINZ_TRACKID: "musicbrainz_recordingid",
  MUSICBRAINZ_RELEASETRACKID: "musicbrainz_trackid",
  MUSICBRAINZ_ALBUMID: "musicbrainz_albumid",
  MUSICBRAINZ_ARTISTID: "musicbrainz_artistid",
  MUSICBRAINZ_ALBUMARTISTID: "musicbrainz_albumartistid",
  MUSICBRAINZ_RELEASEGROUPID: "musicbrainz_releasegroupid",
  MUSICBRAINZ_WORKID: "musicbrainz_workid",
  MUSICBRAINZ_TRMID: "musicbrainz_trmid",
  MUSICBRAINZ_DISCID: "musicbrainz_discid",
  ACOUSTID_ID: "acoustid_id",
  ACOUSTID_ID_FINGERPRINT: "acoustid_fingerprint",
  MUSICIP_PUID: "musicip_puid",
  // 'FINGERPRINT=MusicMagic Fingerprint {fingerprint}': 'musicip_fingerprint', // ToDo
  WEBSITE: "website",
  NOTES: "notes",
  TOTALTRACKS: "totaltracks",
  TOTALDISCS: "totaldiscs",
  // Discogs
  DISCOGS_ARTIST_ID: "discogs_artist_id",
  DISCOGS_ARTISTS: "artists",
  DISCOGS_ARTIST_NAME: "artists",
  DISCOGS_ALBUM_ARTISTS: "albumartist",
  DISCOGS_CATALOG: "catalognumber",
  DISCOGS_COUNTRY: "releasecountry",
  DISCOGS_DATE: "originaldate",
  DISCOGS_LABEL: "label",
  DISCOGS_LABEL_ID: "discogs_label_id",
  DISCOGS_MASTER_RELEASE_ID: "discogs_master_release_id",
  DISCOGS_RATING: "discogs_rating",
  DISCOGS_RELEASED: "date",
  DISCOGS_RELEASE_ID: "discogs_release_id",
  DISCOGS_VOTES: "discogs_votes",
  CATALOGID: "catalognumber",
  STYLE: "genre",
  //
  REPLAYGAIN_TRACK_GAIN: "replaygain_track_gain",
  REPLAYGAIN_TRACK_PEAK: "replaygain_track_peak",
  REPLAYGAIN_ALBUM_GAIN: "replaygain_album_gain",
  REPLAYGAIN_ALBUM_PEAK: "replaygain_album_peak",
  // To Sure if these (REPLAYGAIN_MINMAX, REPLAYGAIN_ALBUM_MINMAX & REPLAYGAIN_UNDO) are used for Vorbis:
  REPLAYGAIN_MINMAX: "replaygain_track_minmax",
  REPLAYGAIN_ALBUM_MINMAX: "replaygain_album_minmax",
  REPLAYGAIN_UNDO: "replaygain_undo"
};
class ce extends A {
  static toRating(e, t, r) {
    return {
      source: e ? e.toLowerCase() : void 0,
      rating: Number.parseFloat(t) / r * A.maxRatingScore
    };
  }
  constructor() {
    super(["vorbis"], zr);
  }
  postMap(e) {
    if (e.id === "RATING")
      e.value = ce.toRating(void 0, e.value, 100);
    else if (e.id.indexOf("RATING:") === 0) {
      const t = e.id.split(":");
      e.value = ce.toRating(t[1], e.value, 1), e.id = t[0];
    }
  }
}
const Lr = {
  IART: "artist",
  // Artist
  ICRD: "date",
  // DateCreated
  INAM: "title",
  // Title
  TITL: "title",
  IPRD: "album",
  // Product
  ITRK: "track",
  IPRT: "track",
  // Additional tag for track index
  COMM: "comment",
  // Comments
  ICMT: "comment",
  // Country
  ICNT: "releasecountry",
  GNRE: "genre",
  // Genre
  IWRI: "writer",
  // WrittenBy
  RATE: "rating",
  YEAR: "year",
  ISFT: "encodedby",
  // Software
  CODE: "encodedby",
  // EncodedBy
  TURL: "website",
  // URL,
  IGNR: "genre",
  // Genre
  IENG: "engineer",
  // Engineer
  ITCH: "technician",
  // Technician
  IMED: "media",
  // Original Media
  IRPD: "album"
  // Product, where the file was intended for
};
class Nr extends A {
  constructor() {
    super(["exif"], Lr);
  }
}
const Ur = {
  "segment:title": "title",
  "album:ARTIST": "albumartist",
  "album:ARTISTSORT": "albumartistsort",
  "album:TITLE": "album",
  "album:DATE_RECORDED": "originaldate",
  "album:DATE_RELEASED": "releasedate",
  "album:PART_NUMBER": "disk",
  "album:TOTAL_PARTS": "totaltracks",
  "track:ARTIST": "artist",
  "track:ARTISTSORT": "artistsort",
  "track:TITLE": "title",
  "track:PART_NUMBER": "track",
  "track:MUSICBRAINZ_TRACKID": "musicbrainz_recordingid",
  "track:MUSICBRAINZ_ALBUMID": "musicbrainz_albumid",
  "track:MUSICBRAINZ_ARTISTID": "musicbrainz_artistid",
  "track:PUBLISHER": "label",
  "track:GENRE": "genre",
  "track:ENCODER": "encodedby",
  "track:ENCODER_OPTIONS": "encodersettings",
  "edition:TOTAL_PARTS": "totaldiscs",
  picture: "picture"
};
class Xr extends q {
  constructor() {
    super(["matroska"], Ur);
  }
}
const Gr = {
  NAME: "title",
  AUTH: "artist",
  "(c) ": "copyright",
  ANNO: "comment"
};
class jr extends A {
  constructor() {
    super(["AIFF"], Gr);
  }
}
class Wr {
  constructor() {
    this.tagMappers = {}, [
      new Er(),
      new Fr(),
      new Be(),
      new Ye(),
      new Ye(),
      new ce(),
      new Dr(),
      new De(),
      new Nr(),
      new Xr(),
      new jr()
    ].forEach((e) => {
      this.registerTagMapper(e);
    });
  }
  /**
   * Convert native to generic (common) tags
   * @param tagType Originating tag format
   * @param tag     Native tag to map to a generic tag id
   * @param warnings
   * @return Generic tag result (output of this function)
   */
  mapTag(e, t, r) {
    if (this.tagMappers[e])
      return this.tagMappers[e].mapGenericTag(t, r);
    throw new gt(`No generic tag mapper defined for tag-format: ${e}`);
  }
  registerTagMapper(e) {
    for (const t of e.tagTypes)
      this.tagMappers[t] = e;
  }
}
const Ee = /\[(\d{2}):(\d{2})\.(\d{2,3})]/;
function Hr(i) {
  return Ee.test(i) ? $r(i) : qr(i);
}
function qr(i) {
  return {
    contentType: wt.lyrics,
    timeStampFormat: yt.notSynchronized,
    text: i.trim(),
    syncText: []
  };
}
function $r(i) {
  const e = i.split(`
`), t = [];
  for (const r of e) {
    const n = r.match(Ee);
    if (n) {
      const a = Number.parseInt(n[1], 10), s = Number.parseInt(n[2], 10), u = n[3].length === 3 ? Number.parseInt(n[3], 10) : Number.parseInt(n[3], 10) * 10, o = (a * 60 + s) * 1e3 + u, d = r.replace(Ee, "").trim();
      t.push({ timestamp: o, text: d });
    }
  }
  return {
    contentType: wt.lyrics,
    timeStampFormat: yt.milliseconds,
    text: t.map((r) => r.text).join(`
`),
    syncText: t
  };
}
const D = X("music-metadata:collector"), Vr = ["matroska", "APEv2", "vorbis", "ID3v2.4", "ID3v2.3", "ID3v2.2", "exif", "asf", "iTunes", "AIFF", "ID3v1"];
class Yr {
  constructor(e) {
    this.format = {
      tagTypes: [],
      trackInfo: []
    }, this.native = {}, this.common = {
      track: { no: null, of: null },
      disk: { no: null, of: null },
      movementIndex: { no: null, of: null }
    }, this.quality = {
      warnings: []
    }, this.commonOrigin = {}, this.originPriority = {}, this.tagMapper = new Wr(), this.opts = e;
    let t = 1;
    for (const r of Vr)
      this.originPriority[r] = t++;
    this.originPriority.artificial = 500, this.originPriority.id3v1 = 600;
  }
  /**
   * @returns {boolean} true if one or more tags have been found
   */
  hasAny() {
    return Object.keys(this.native).length > 0;
  }
  addStreamInfo(e) {
    D(`streamInfo: type=${e.type ? dr[e.type] : "?"}, codec=${e.codecName}`), this.format.trackInfo.push(e);
  }
  setFormat(e, t) {
    var r;
    D(`format: ${e} = ${t}`), this.format[e] = t, (r = this.opts) != null && r.observer && this.opts.observer({ metadata: this, tag: { type: "format", id: e, value: t } });
  }
  setAudioOnly() {
    this.setFormat("hasAudio", !0), this.setFormat("hasVideo", !1);
  }
  async addTag(e, t, r) {
    D(`tag ${e}.${t} = ${r}`), this.native[e] || (this.format.tagTypes.push(e), this.native[e] = []), this.native[e].push({ id: t, value: r }), await this.toCommon(e, t, r);
  }
  addWarning(e) {
    this.quality.warnings.push({ message: e });
  }
  async postMap(e, t) {
    switch (t.id) {
      case "artist":
        if (this.commonOrigin.artist === this.originPriority[e])
          return this.postMap("artificial", { id: "artists", value: t.value });
        this.common.artists || this.setGenericTag("artificial", { id: "artists", value: t.value });
        break;
      case "artists":
        if ((!this.common.artist || this.commonOrigin.artist === this.originPriority.artificial) && (!this.common.artists || this.common.artists.indexOf(t.value) === -1)) {
          const r = (this.common.artists || []).concat([t.value]), a = { id: "artist", value: Zr(r) };
          this.setGenericTag("artificial", a);
        }
        break;
      case "picture":
        return this.postFixPicture(t.value).then((r) => {
          r !== null && (t.value = r, this.setGenericTag(e, t));
        });
      case "totaltracks":
        this.common.track.of = A.toIntOrNull(t.value);
        return;
      case "totaldiscs":
        this.common.disk.of = A.toIntOrNull(t.value);
        return;
      case "movementTotal":
        this.common.movementIndex.of = A.toIntOrNull(t.value);
        return;
      case "track":
      case "disk":
      case "movementIndex": {
        const r = this.common[t.id].of;
        this.common[t.id] = A.normalizeTrack(t.value), this.common[t.id].of = r ?? this.common[t.id].of;
        return;
      }
      case "bpm":
      case "year":
      case "originalyear":
        t.value = Number.parseInt(t.value, 10);
        break;
      case "date": {
        const r = Number.parseInt(t.value.substr(0, 4), 10);
        Number.isNaN(r) || (this.common.year = r);
        break;
      }
      case "discogs_label_id":
      case "discogs_release_id":
      case "discogs_master_release_id":
      case "discogs_artist_id":
      case "discogs_votes":
        t.value = typeof t.value == "string" ? Number.parseInt(t.value, 10) : t.value;
        break;
      case "replaygain_track_gain":
      case "replaygain_track_peak":
      case "replaygain_album_gain":
      case "replaygain_album_peak":
        t.value = br(t.value);
        break;
      case "replaygain_track_minmax":
        t.value = t.value.split(",").map((r) => Number.parseInt(r, 10));
        break;
      case "replaygain_undo": {
        const r = t.value.split(",").map((n) => Number.parseInt(n, 10));
        t.value = {
          leftChannel: r[0],
          rightChannel: r[1]
        };
        break;
      }
      case "gapless":
      case "compilation":
      case "podcast":
      case "showMovement":
        t.value = t.value === "1" || t.value === 1;
        break;
      case "isrc": {
        const r = this.common[t.id];
        if (r && r.indexOf(t.value) !== -1)
          return;
        break;
      }
      case "comment":
        typeof t.value == "string" && (t.value = { text: t.value }), t.value.descriptor === "iTunPGAP" && this.setGenericTag(e, { id: "gapless", value: t.value.text === "1" });
        break;
      case "lyrics":
        typeof t.value == "string" && (t.value = Hr(t.value));
        break;
    }
    t.value !== null && this.setGenericTag(e, t);
  }
  /**
   * Convert native tags to common tags
   * @returns {IAudioMetadata} Native + common tags
   */
  toCommonMetadata() {
    return {
      format: this.format,
      native: this.native,
      quality: this.quality,
      common: this.common
    };
  }
  /**
   * Fix some common issues with picture object
   * @param picture Picture
   */
  async postFixPicture(e) {
    if (e.data && e.data.length > 0) {
      if (!e.format) {
        const t = await pt(Uint8Array.from(e.data));
        if (t)
          e.format = t.mime;
        else
          return null;
      }
      switch (e.format = e.format.toLocaleLowerCase(), e.format) {
        case "image/jpg":
          e.format = "image/jpeg";
      }
      return e;
    }
    return this.addWarning("Empty picture tag found"), null;
  }
  /**
   * Convert native tag to common tags
   */
  async toCommon(e, t, r) {
    const n = { id: t, value: r }, a = this.tagMapper.mapTag(e, n, this);
    a && await this.postMap(e, a);
  }
  /**
   * Set generic tag
   */
  setGenericTag(e, t) {
    var a;
    D(`common.${t.id} = ${t.value}`);
    const r = this.commonOrigin[t.id] || 1e3, n = this.originPriority[e];
    if (Cr(t.id))
      if (n <= r)
        this.common[t.id] = t.value, this.commonOrigin[t.id] = n;
      else
        return D(`Ignore native tag (singleton): ${e}.${t.id} = ${t.value}`);
    else if (n === r)
      !Ar(t.id) || this.common[t.id].indexOf(t.value) === -1 ? this.common[t.id].push(t.value) : D(`Ignore duplicate value: ${e}.${t.id} = ${t.value}`);
    else if (n < r)
      this.common[t.id] = [t.value], this.commonOrigin[t.id] = n;
    else
      return D(`Ignore native tag (list): ${e}.${t.id} = ${t.value}`);
    (a = this.opts) != null && a.observer && this.opts.observer({ metadata: this, tag: { type: "common", id: t.id, value: t.value } });
  }
}
function Zr(i) {
  return i.length > 2 ? `${i.slice(0, i.length - 1).join(", ")} & ${i[i.length - 1]}` : i.join(" & ");
}
const Kr = {
  parserType: "mpeg",
  extensions: [".mp2", ".mp3", ".m2a", ".aac", "aacp"],
  mimeTypes: ["audio/mpeg", "audio/mp3", "audio/aacs", "audio/aacp"],
  async load() {
    return (await import("./MpegParser-BssR5r9V.js")).MpegParser;
  }
}, Jr = {
  parserType: "apev2",
  extensions: [".ape"],
  mimeTypes: ["audio/ape", "audio/monkeys-audio"],
  async load() {
    return (await Promise.resolve().then(() => gn)).APEv2Parser;
  }
}, Qr = {
  parserType: "asf",
  extensions: [".asf"],
  mimeTypes: ["audio/ms-wma", "video/ms-wmv", "audio/ms-asf", "video/ms-asf", "application/vnd.ms-asf"],
  async load() {
    return (await import("./AsfParser-Sn6oXeqd.js")).AsfParser;
  }
}, en = {
  parserType: "dsdiff",
  extensions: [".dff"],
  mimeTypes: ["audio/dsf", "audio/dsd"],
  async load() {
    return (await import("./DsdiffParser-C6Au6qdd.js")).DsdiffParser;
  }
}, tn = {
  parserType: "aiff",
  extensions: [".aif", "aiff", "aifc"],
  mimeTypes: ["audio/aiff", "audio/aif", "audio/aifc", "application/aiff"],
  async load() {
    return (await import("./AiffParser-CPtsmfbF.js")).AIFFParser;
  }
}, rn = {
  parserType: "dsf",
  extensions: [".dsf"],
  mimeTypes: ["audio/dsf"],
  async load() {
    return (await import("./DsfParser-Dd3HeM0k.js")).DsfParser;
  }
}, nn = {
  parserType: "flac",
  extensions: [".flac"],
  mimeTypes: ["audio/flac"],
  async load() {
    return (await import("./FlacParser-CMkC8LTD.js").then((i) => i.d)).FlacParser;
  }
}, an = {
  parserType: "matroska",
  extensions: [".mka", ".mkv", ".mk3d", ".mks", "webm"],
  mimeTypes: ["audio/matroska", "video/matroska", "audio/webm", "video/webm"],
  async load() {
    return (await import("./MatroskaParser-BqSLkO36.js")).MatroskaParser;
  }
}, sn = {
  parserType: "mp4",
  extensions: [".mp4", ".m4a", ".m4b", ".m4pa", "m4v", "m4r", "3gp", ".mov", ".movie", ".qt"],
  mimeTypes: ["audio/mp4", "audio/m4a", "video/m4v", "video/mp4", "video/quicktime"],
  async load() {
    return (await import("./MP4Parser-B3Yrvuy4.js")).MP4Parser;
  }
}, on = {
  parserType: "musepack",
  extensions: [".mpc"],
  mimeTypes: ["audio/musepack"],
  async load() {
    return (await import("./MusepackParser-D8jbd5cn.js")).MusepackParser;
  }
}, cn = {
  parserType: "ogg",
  extensions: [".ogg", ".ogv", ".oga", ".ogm", ".ogx", ".opus", ".spx"],
  mimeTypes: ["audio/ogg", "audio/opus", "audio/speex", "video/ogg"],
  // RFC 7845, RFC 6716, RFC 5574
  async load() {
    return (await import("./OggParser-BzbT4-aD.js")).OggParser;
  }
}, ln = {
  parserType: "wavpack",
  extensions: [".wv", ".wvp"],
  mimeTypes: ["audio/wavpack"],
  async load() {
    return (await import("./WavPackParser-BanFLu_s.js")).WavPackParser;
  }
}, un = {
  parserType: "riff",
  extensions: [".wav", "wave", ".bwf"],
  mimeTypes: ["audio/vnd.wave", "audio/wav", "audio/wave"],
  async load() {
    return (await import("./WaveParser-BtSYdsVy.js")).WaveParser;
  }
}, O = X("music-metadata:parser:factory");
function mn(i) {
  const e = Me.parse(i), t = ur(e.type);
  return {
    type: t.type,
    subtype: t.subtype,
    suffix: t.suffix,
    parameters: e.parameters
  };
}
class pn {
  constructor() {
    this.parsers = [], [
      nn,
      Kr,
      Jr,
      sn,
      an,
      un,
      cn,
      Qr,
      tn,
      ln,
      on,
      rn,
      en
    ].forEach((e) => {
      this.registerParser(e);
    });
  }
  registerParser(e) {
    this.parsers.push(e);
  }
  async parse(e, t, r) {
    if (e.supportsRandomAccess() ? (O("tokenizer supports random-access, scanning for appending headers"), await bn(e, r)) : O("tokenizer does not support random-access, cannot scan for appending headers"), !t) {
      const u = new Uint8Array(4100);
      if (e.fileInfo.mimeType && (t = this.findLoaderForContentType(e.fileInfo.mimeType)), !t && e.fileInfo.path && (t = this.findLoaderForExtension(e.fileInfo.path)), !t) {
        O("Guess parser on content..."), await e.peekBuffer(u, { mayBeLess: !0 });
        const o = await pt(u, { mpegOffsetTolerance: 10 });
        if (!o || !o.mime)
          throw new ht("Failed to determine audio format");
        if (O(`Guessed file type is mime=${o.mime}, extension=${o.ext}`), t = this.findLoaderForContentType(o.mime), !t)
          throw new xt(`Guessed MIME-type not supported: ${o.mime}`);
      }
    }
    O(`Loading ${t.parserType} parser...`);
    const n = new Yr(r), a = await t.load(), s = new a(n, e, r ?? {});
    return O(`Parser ${t.parserType} loaded`), await s.parse(), n.format.trackInfo && (n.format.hasAudio === void 0 && n.setFormat("hasAudio", !!n.format.trackInfo.find((u) => u.type === R.audio)), n.format.hasVideo === void 0 && n.setFormat("hasVideo", !!n.format.trackInfo.find((u) => u.type === R.video))), n.toCommonMetadata();
  }
  /**
   * @param filePath - Path, filename or extension to audio file
   * @return Parser submodule name
   */
  findLoaderForExtension(e) {
    if (!e)
      return;
    const t = dn(e).toLocaleLowerCase() || e;
    return this.parsers.find((r) => r.extensions.indexOf(t) !== -1);
  }
  findLoaderForContentType(e) {
    let t;
    if (!e)
      return;
    try {
      t = mn(e);
    } catch {
      O(`Invalid HTTP Content-Type header value: ${e}`);
      return;
    }
    const r = t.subtype.indexOf("x-") === 0 ? t.subtype.substring(2) : t.subtype;
    return this.parsers.find((n) => n.mimeTypes.find((a) => a.indexOf(`${t.type}/${r}`) !== -1));
  }
  getSupportedMimeTypes() {
    const e = /* @__PURE__ */ new Set();
    return this.parsers.forEach((t) => {
      t.mimeTypes.forEach((r) => {
        e.add(r), e.add(r.replace("/", "/x-"));
      });
    }), Array.from(e);
  }
}
function dn(i) {
  const e = i.lastIndexOf(".");
  return e === -1 ? "" : i.substring(e);
}
class bt {
  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  constructor(e, t, r) {
    this.metadata = e, this.tokenizer = t, this.options = r;
  }
}
const fn = /^[\x21-\x7e©][\x20-\x7e\x00()]{3}/, kt = {
  len: 4,
  get: (i, e) => {
    const t = W(i.subarray(e, e + kt.len), "latin1");
    if (!t.match(fn))
      throw new Fe(`FourCC contains invalid characters: ${Tr(t)} "${t}"`);
    return t;
  },
  put: (i, e, t) => {
    const r = oi(t, "latin1");
    if (r.length !== 4)
      throw new gt("Invalid length");
    return i.set(r, e), e + 4;
  }
}, te = {
  text_utf8: 0,
  binary: 1,
  external_info: 2,
  reserved: 3
}, Ze = {
  len: 52,
  get: (i, e) => ({
    // should equal 'MAC '
    ID: kt.get(i, e),
    // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
    version: x.get(i, e + 4) / 1e3,
    // the number of descriptor bytes (allows later expansion of this header)
    descriptorBytes: x.get(i, e + 8),
    // the number of header APE_HEADER bytes
    headerBytes: x.get(i, e + 12),
    // the number of header APE_HEADER bytes
    seekTableBytes: x.get(i, e + 16),
    // the number of header data bytes (from original file)
    headerDataBytes: x.get(i, e + 20),
    // the number of bytes of APE frame data
    apeFrameDataBytes: x.get(i, e + 24),
    // the high order number of APE frame data bytes
    apeFrameDataBytesHigh: x.get(i, e + 28),
    // the terminating data of the file (not including tag data)
    terminatingDataBytes: x.get(i, e + 32),
    // the MD5 hash of the file (see notes for usage... it's a little tricky)
    fileMD5: new ut(16).get(i, e + 36)
  })
}, hn = {
  len: 24,
  get: (i, e) => ({
    // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
    compressionLevel: T.get(i, e),
    // any format flags (for future use)
    formatFlags: T.get(i, e + 2),
    // the number of audio blocks in one frame
    blocksPerFrame: x.get(i, e + 4),
    // the number of audio blocks in the final frame
    finalFrameBlocks: x.get(i, e + 8),
    // the total number of frames
    totalFrames: x.get(i, e + 12),
    // the bits per sample (typically 16)
    bitsPerSample: T.get(i, e + 16),
    // the number of channels (1 or 2)
    channel: T.get(i, e + 18),
    // the sample rate (typically 44100)
    sampleRate: x.get(i, e + 20)
  })
}, C = {
  len: 32,
  get: (i, e) => ({
    // should equal 'APETAGEX'
    ID: new b(8, "ascii").get(i, e),
    // equals CURRENT_APE_TAG_VERSION
    version: x.get(i, e + 8),
    // the complete size of the tag, including this footer (excludes header)
    size: x.get(i, e + 12),
    // the number of fields in the tag
    fields: x.get(i, e + 16),
    // reserved for later use (must be zero),
    flags: It(x.get(i, e + 20))
  })
}, be = {
  len: 8,
  get: (i, e) => ({
    // Length of assigned value in bytes
    size: x.get(i, e),
    // reserved for later use (must be zero),
    flags: It(x.get(i, e + 4))
  })
};
function It(i) {
  return {
    containsHeader: ie(i, 31),
    containsFooter: ie(i, 30),
    isHeader: ie(i, 29),
    readOnly: ie(i, 0),
    dataType: (i & 6) >> 1
  };
}
function ie(i, e) {
  return (i & 1 << e) !== 0;
}
const _ = X("music-metadata:parser:APEv2"), Ke = "APEv2", Je = "APETAGEX";
class se extends hr("APEv2") {
}
function xn(i, e, t) {
  return new F(i, e, t).tryParseApeHeader();
}
class F extends bt {
  constructor() {
    super(...arguments), this.ape = {};
  }
  /**
   * Calculate the media file duration
   * @param ah ApeHeader
   * @return {number} duration in seconds
   */
  static calculateDuration(e) {
    let t = e.totalFrames > 1 ? e.blocksPerFrame * (e.totalFrames - 1) : 0;
    return t += e.finalFrameBlocks, t / e.sampleRate;
  }
  /**
   * Calculates the APEv1 / APEv2 first field offset
   * @param tokenizer
   * @param offset
   */
  static async findApeFooterOffset(e, t) {
    const r = new Uint8Array(C.len), n = e.position;
    if (t <= C.len) {
      _(`Offset is too small to read APE footer: offset=${t}`);
      return;
    }
    if (t > C.len) {
      await e.readBuffer(r, { position: t - C.len }), e.setPosition(n);
      const a = C.get(r, 0);
      if (a.ID === "APETAGEX")
        return a.flags.isHeader ? _(`APE Header found at offset=${t - C.len}`) : (_(`APE Footer found at offset=${t - C.len}`), t -= a.size), { footer: a, offset: t };
    }
  }
  static parseTagFooter(e, t, r) {
    const n = C.get(t, t.length - C.len);
    if (n.ID !== Je)
      throw new se("Unexpected APEv2 Footer ID preamble value");
    return Ie(t), new F(e, Ie(t), r).parseTags(n);
  }
  /**
   * Parse APEv1 / APEv2 header if header signature found
   */
  async tryParseApeHeader() {
    if (this.tokenizer.fileInfo.size && this.tokenizer.fileInfo.size - this.tokenizer.position < C.len) {
      _("No APEv2 header found, end-of-file reached");
      return;
    }
    const e = await this.tokenizer.peekToken(C);
    if (e.ID === Je)
      return await this.tokenizer.ignore(C.len), this.parseTags(e);
    if (_(`APEv2 header not found at offset=${this.tokenizer.position}`), this.tokenizer.fileInfo.size) {
      const t = this.tokenizer.fileInfo.size - this.tokenizer.position, r = new Uint8Array(t);
      return await this.tokenizer.readBuffer(r), F.parseTagFooter(this.metadata, r, this.options);
    }
  }
  async parse() {
    const e = await this.tokenizer.readToken(Ze);
    if (e.ID !== "MAC ")
      throw new se("Unexpected descriptor ID");
    this.ape.descriptor = e;
    const t = e.descriptorBytes - Ze.len, r = await (t > 0 ? this.parseDescriptorExpansion(t) : this.parseHeader());
    return this.metadata.setAudioOnly(), await this.tokenizer.ignore(r.forwardBytes), this.tryParseApeHeader();
  }
  async parseTags(e) {
    const t = new Uint8Array(256);
    let r = e.size - C.len;
    _(`Parse APE tags at offset=${this.tokenizer.position}, size=${r}`);
    for (let n = 0; n < e.fields; n++) {
      if (r < be.len) {
        this.metadata.addWarning(`APEv2 Tag-header: ${e.fields - n} items remaining, but no more tag data to read.`);
        break;
      }
      const a = await this.tokenizer.readToken(be);
      r -= be.len + a.size, await this.tokenizer.peekBuffer(t, { length: Math.min(t.length, r) });
      let s = Ve(t);
      const u = await this.tokenizer.readToken(new b(s, "ascii"));
      switch (await this.tokenizer.ignore(1), r -= u.length + 1, a.flags.dataType) {
        case te.text_utf8: {
          const d = (await this.tokenizer.readToken(new b(a.size, "utf8"))).split(/\x00/g);
          await Promise.all(d.map((p) => this.metadata.addTag(Ke, u, p)));
          break;
        }
        case te.binary:
          if (this.options.skipCovers)
            await this.tokenizer.ignore(a.size);
          else {
            const o = new Uint8Array(a.size);
            await this.tokenizer.readBuffer(o), s = Ve(o);
            const d = W(o.subarray(0, s), "utf-8"), p = o.subarray(s + 1);
            await this.metadata.addTag(Ke, u, {
              description: d,
              data: p
            });
          }
          break;
        case te.external_info:
          _(`Ignore external info ${u}`), await this.tokenizer.ignore(a.size);
          break;
        case te.reserved:
          _(`Ignore external info ${u}`), this.metadata.addWarning(`APEv2 header declares a reserved datatype for "${u}"`), await this.tokenizer.ignore(a.size);
          break;
      }
    }
  }
  async parseDescriptorExpansion(e) {
    return await this.tokenizer.ignore(e), this.parseHeader();
  }
  async parseHeader() {
    const e = await this.tokenizer.readToken(hn);
    if (this.metadata.setFormat("lossless", !0), this.metadata.setFormat("container", "Monkey's Audio"), this.metadata.setFormat("bitsPerSample", e.bitsPerSample), this.metadata.setFormat("sampleRate", e.sampleRate), this.metadata.setFormat("numberOfChannels", e.channel), this.metadata.setFormat("duration", F.calculateDuration(e)), !this.ape.descriptor)
      throw new se("Missing APE descriptor");
    return {
      forwardBytes: this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes + this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
    };
  }
}
const gn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  APEv2Parser: F,
  ApeContentError: se,
  tryParseApeHeader: xn
}, Symbol.toStringTag, { value: "Module" })), re = X("music-metadata:parser:ID3v1"), Qe = [
  "Blues",
  "Classic Rock",
  "Country",
  "Dance",
  "Disco",
  "Funk",
  "Grunge",
  "Hip-Hop",
  "Jazz",
  "Metal",
  "New Age",
  "Oldies",
  "Other",
  "Pop",
  "R&B",
  "Rap",
  "Reggae",
  "Rock",
  "Techno",
  "Industrial",
  "Alternative",
  "Ska",
  "Death Metal",
  "Pranks",
  "Soundtrack",
  "Euro-Techno",
  "Ambient",
  "Trip-Hop",
  "Vocal",
  "Jazz+Funk",
  "Fusion",
  "Trance",
  "Classical",
  "Instrumental",
  "Acid",
  "House",
  "Game",
  "Sound Clip",
  "Gospel",
  "Noise",
  "Alt. Rock",
  "Bass",
  "Soul",
  "Punk",
  "Space",
  "Meditative",
  "Instrumental Pop",
  "Instrumental Rock",
  "Ethnic",
  "Gothic",
  "Darkwave",
  "Techno-Industrial",
  "Electronic",
  "Pop-Folk",
  "Eurodance",
  "Dream",
  "Southern Rock",
  "Comedy",
  "Cult",
  "Gangsta Rap",
  "Top 40",
  "Christian Rap",
  "Pop/Funk",
  "Jungle",
  "Native American",
  "Cabaret",
  "New Wave",
  "Psychedelic",
  "Rave",
  "Showtunes",
  "Trailer",
  "Lo-Fi",
  "Tribal",
  "Acid Punk",
  "Acid Jazz",
  "Polka",
  "Retro",
  "Musical",
  "Rock & Roll",
  "Hard Rock",
  "Folk",
  "Folk/Rock",
  "National Folk",
  "Swing",
  "Fast-Fusion",
  "Bebob",
  "Latin",
  "Revival",
  "Celtic",
  "Bluegrass",
  "Avantgarde",
  "Gothic Rock",
  "Progressive Rock",
  "Psychedelic Rock",
  "Symphonic Rock",
  "Slow Rock",
  "Big Band",
  "Chorus",
  "Easy Listening",
  "Acoustic",
  "Humour",
  "Speech",
  "Chanson",
  "Opera",
  "Chamber Music",
  "Sonata",
  "Symphony",
  "Booty Bass",
  "Primus",
  "Porn Groove",
  "Satire",
  "Slow Jam",
  "Club",
  "Tango",
  "Samba",
  "Folklore",
  "Ballad",
  "Power Ballad",
  "Rhythmic Soul",
  "Freestyle",
  "Duet",
  "Punk Rock",
  "Drum Solo",
  "A Cappella",
  "Euro-House",
  "Dance Hall",
  "Goa",
  "Drum & Bass",
  "Club-House",
  "Hardcore",
  "Terror",
  "Indie",
  "BritPop",
  "Negerpunk",
  "Polsk Punk",
  "Beat",
  "Christian Gangsta Rap",
  "Heavy Metal",
  "Black Metal",
  "Crossover",
  "Contemporary Christian",
  "Christian Rock",
  "Merengue",
  "Salsa",
  "Thrash Metal",
  "Anime",
  "JPop",
  "Synthpop",
  "Abstract",
  "Art Rock",
  "Baroque",
  "Bhangra",
  "Big Beat",
  "Breakbeat",
  "Chillout",
  "Downtempo",
  "Dub",
  "EBM",
  "Eclectic",
  "Electro",
  "Electroclash",
  "Emo",
  "Experimental",
  "Garage",
  "Global",
  "IDM",
  "Illbient",
  "Industro-Goth",
  "Jam Band",
  "Krautrock",
  "Leftfield",
  "Lounge",
  "Math Rock",
  "New Romantic",
  "Nu-Breakz",
  "Post-Punk",
  "Post-Rock",
  "Psytrance",
  "Shoegaze",
  "Space Rock",
  "Trop Rock",
  "World Music",
  "Neoclassical",
  "Audiobook",
  "Audio Theatre",
  "Neue Deutsche Welle",
  "Podcast",
  "Indie Rock",
  "G-Funk",
  "Dubstep",
  "Garage Rock",
  "Psybient"
], ne = {
  len: 128,
  /**
   * @param buf Buffer possibly holding the 128 bytes ID3v1.1 metadata header
   * @param off Offset in buffer in bytes
   * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
   */
  get: (i, e) => {
    const t = new L(3).get(i, e);
    return t === "TAG" ? {
      header: t,
      title: new L(30).get(i, e + 3),
      artist: new L(30).get(i, e + 33),
      album: new L(30).get(i, e + 63),
      year: new L(4).get(i, e + 93),
      comment: new L(28).get(i, e + 97),
      // ID3v1.1 separator for track
      zeroByte: P.get(i, e + 127),
      // track: ID3v1.1 field added by Michael Mutschler
      track: P.get(i, e + 126),
      genre: P.get(i, e + 127)
    } : null;
  }
};
class L {
  constructor(e) {
    this.len = e, this.stringType = new b(e, "latin1");
  }
  get(e, t) {
    let r = this.stringType.get(e, t);
    return r = xr(r), r = r.trim(), r.length > 0 ? r : void 0;
  }
}
class vt extends bt {
  constructor(e, t, r) {
    super(e, t, r), this.apeHeader = r.apeHeader;
  }
  static getGenre(e) {
    if (e < Qe.length)
      return Qe[e];
  }
  async parse() {
    if (!this.tokenizer.fileInfo.size) {
      re("Skip checking for ID3v1 because the file-size is unknown");
      return;
    }
    this.apeHeader && (this.tokenizer.ignore(this.apeHeader.offset - this.tokenizer.position), await new F(this.metadata, this.tokenizer, this.options).parseTags(this.apeHeader.footer));
    const e = this.tokenizer.fileInfo.size - ne.len;
    if (this.tokenizer.position > e) {
      re("Already consumed the last 128 bytes");
      return;
    }
    const t = await this.tokenizer.readToken(ne, e);
    if (t) {
      re("ID3v1 header found at: pos=%s", this.tokenizer.fileInfo.size - ne.len);
      const r = ["title", "artist", "album", "comment", "track", "year"];
      for (const a of r)
        t[a] && t[a] !== "" && await this.addTag(a, t[a]);
      const n = vt.getGenre(t.genre);
      n && await this.addTag("genre", n);
    } else
      re("ID3v1 header not found at: pos=%s", this.tokenizer.fileInfo.size - ne.len);
  }
  async addTag(e, t) {
    await this.metadata.addTag("ID3v1", e, t);
  }
}
async function Tn(i) {
  if (i.fileInfo.size >= 128) {
    const e = new Uint8Array(3), t = i.position;
    return await i.readBuffer(e, { position: i.fileInfo.size - 128 }), i.setPosition(t), W(e, "latin1") === "TAG";
  }
  return !1;
}
const wn = "LYRICS200";
async function yn(i) {
  const e = i.fileInfo.size;
  if (e >= 143) {
    const t = new Uint8Array(15), r = i.position;
    await i.readBuffer(t, { position: e - 143 }), i.setPosition(r);
    const n = W(t, "latin1");
    if (n.substring(6) === wn)
      return Number.parseInt(n.substring(0, 6), 10) + 15;
  }
  return 0;
}
async function bn(i, e = {}) {
  let t = i.fileInfo.size;
  if (await Tn(i)) {
    t -= 128;
    const r = await yn(i);
    t -= r;
  }
  e.apeHeader = await F.findApeFooterOffset(i, t);
}
const et = X("music-metadata:parser");
async function kn(i, e = {}) {
  et(`parseFile: ${i}`);
  const t = await Kt(i), r = new pn();
  try {
    const n = r.findLoaderForExtension(i);
    n || et("Parser could not be determined by file extension");
    try {
      return await r.parse(t, n, e);
    } catch (a) {
      throw (a instanceof ht || a instanceof xt) && (a.message += `: ${i}`), a;
    }
  } finally {
    await t.close();
  }
}
const In = /* @__PURE__ */ new Set([".wav", ".mp3", ".aiff", ".flac", ".ogg", ".m4a"]);
async function Ct(i) {
  const e = await ke.readdir(i, { withFileTypes: !0 }), t = await Promise.all(
    e.map((r) => {
      const n = N.resolve(i, r.name);
      return r.isDirectory() ? Ct(n) : n;
    })
  );
  return Array.prototype.concat(...t);
}
function vn() {
  Pe.handle("dialog:openDirectory", async () => {
    const { canceled: i, filePaths: e } = await Mt.showOpenDialog({
      properties: ["openDirectory"]
    });
    return i ? null : e[0];
  }), Pe.handle("fs:scanFolder", async (i, e) => {
    try {
      const r = (await Ct(e)).filter((a) => {
        const s = N.extname(a).toLowerCase();
        return In.has(s);
      }), n = [];
      for (const a of r)
        try {
          const s = await ke.stat(a), u = await kn(a, { skipCovers: !0, duration: !0 });
          n.push({
            id: Le(),
            name: N.basename(a),
            path: a,
            extension: N.extname(a).toLowerCase(),
            size: s.size,
            createdAt: s.birthtimeMs,
            duration: u.format.duration || 0,
            format: u.format.container || ""
          });
        } catch (s) {
          console.warn(`Failed to parse metadata for ${a}`, s);
          const u = await ke.stat(a).catch(() => null);
          u && n.push({
            id: Le(),
            name: N.basename(a),
            path: a,
            extension: N.extname(a).toLowerCase(),
            size: u.size,
            createdAt: u.birthtimeMs,
            duration: 0,
            format: "unknown"
          });
        }
      return n;
    } catch (t) {
      throw console.error("Error scanning folder:", t), t;
    }
  });
}
const Hn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  registerHandlers: vn
}, Symbol.toStringTag, { value: "Module" }));
export {
  Xn as A,
  bt as B,
  On as C,
  W as D,
  v as E,
  kt as F,
  Qe as G,
  xn as H,
  Ti as I,
  xr as J,
  Gn as K,
  vt as L,
  st as M,
  Ir as N,
  Un as O,
  vr as P,
  Wn as Q,
  Ve as R,
  b as S,
  R as T,
  j as U,
  kr as V,
  jn as W,
  Hn as X,
  M as a,
  P as b,
  X as c,
  ut as d,
  Se as e,
  x as f,
  Tt as g,
  lt as h,
  Nn as i,
  T as j,
  G as k,
  Ci as l,
  hr as m,
  Ie as n,
  Ii as o,
  ki as p,
  _i as q,
  Ei as r,
  Ln as s,
  vi as t,
  Pn as u,
  ct as v,
  bi as w,
  Ce as x,
  ot as y,
  Dn as z
};
