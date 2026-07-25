import axios from "axios";
import zlib from "zlib";
import crypto from "crypto";
class WebToApp {
  constructor() {
    this.tasks = {};
    this.templateData = null;
    this.tmplUrl = "https://freewebtoapk.com/assets/template.apk";
    this.pollInterval = 3e3;
    this.subtle = crypto.webcrypto?.subtle;
    this.CHUNK_SIZE = 1024 * 1024;
    this.ALGORITHM_ID = 259;
    this.FIXED_KEY = {
      publicKey: {
        kty: "RSA",
        n: "h3JuLr3s6LzuVcGD0H6EXBbBaOX5K_kvGz4P6YUu7M0Vv7kgojhA99TFlUzl_4CVT7qizsjgFcW1LtqY_6u_E4pjn25mGeYUOEe8PWTKuK2dHdHIsIyLRYkM-7ML7Y3seex40TelAQPkNsf9g5i4rNs2HBqflGJF99v01xQzDDS0C_OSUT4neGQKN4cLVW0IaphYDxcJmwN9CpkZH_l9VNqRiW22MTFnmza3MPuYCP8Ew2B4Jw1Zbs4SN68-ENH3v8gSfWDT8OHzNCN1vLLibfn4XEeBmcTMnaFnesiHwz3Z7hDlxLiTQ4DzFzXj-Xzv0OMRF4GTQjLWgdSjuJEbIQ",
        e: "AQAB"
      },
      privateKey: {
        kty: "RSA",
        n: "h3JuLr3s6LzuVcGD0H6EXBbBaOX5K_kvGz4P6YUu7M0Vv7kgojhA99TFlUzl_4CVT7qizsjgFcW1LtqY_6u_E4pjn25mGeYUOEe8PWTKuK2dHdHIsIyLRYkM-7ML7Y3seex40TelAQPkNsf9g5i4rNs2HBqflGJF99v01xQzDDS0C_OSUT4neGQKN4cLVW0IaphYDxcJmwN9CpkZH_l9VNqRiW22MTFnmza3MPuYCP8Ew2B4Jw1Zbs4SN68-ENH3v8gSfWDT8OHzNCN1vLLibfn4XEeBmcTMnaFnesiHwz3Z7hDlxLiTQ4DzFzXj-Xzv0OMRF4GTQjLWgdSjuJEbIQ",
        e: "AQAB",
        d: "DuG9xW5Mt2L6yiVRoaN6UNFB6Dqhs_kppH6fKkiIgrAjMZuE6w3vOsuqoeApwnboRjL6wb7vEAqsVjziY--vi4AVuLtdMH9HvXSe9B08637316zoYK2F0oVfuHqlrDDUc1j4tVQTJxdnCGB_iZP1cS3stg3Jds44DdGhsc1LBo4i8TORztfw8pqTUnfZIu692F3_Mzsd75B_jz2keKQIZquwhicV90IV23Jrv-UwD4i8W3QFfEo1O7Tf-DgIUuck50EI7IMKvQsqQ1tZ8mqNTHBP0X7H0Kvc-h3YZWg8HivCetcx8d7-LinZ9Xr2iwTXsGoNoutKfX6ooDfvZU1OQ",
        p: "u5jHKdIoRQugILT6ha_WSj0jwV1D-ftT-4CKGg2niBL-0Tpz_btGNoSVMArnQ2IhltSOg_WhU08OBeFvrBP0s6vQmO2Ia3bzIZstC2U1ByGOLuIbNiNvXxOgPNF6Fpon4u7Y66_3NbDEhS_xhqPJ3Ag6MTWME-0DlkKwSyYUeks",
        q: "uNW615IaXxlganTa8NIs-5idlX1WigqikorkjqUuM-w4vLYjaEQky06aornfVe4DJHOVIEpd6i7YHeJxUvrGF730xDzeGXPSQmXsV-L1D8ktCjyTQUQxV842Q3S83EzzVmXblYx8VBQ3-xNsViBNdiOjDpFCXyi0H8g5qy3vXMM",
        dp: "oCGrcDFqGnXv-7tAVblgzAIgcUAxdENqzrZMLC0XonnEdcjVlfKz3nmR9253NfegAGX0OQQE71399FsYveRS7sNszf2Eg2cH5tnUu3NqrmmgOrjazX215YyVLRUKiBySi42iMJ0GAhifx6jDHFDXUDDdq3-v0Jpyg2LtpVgeBr0",
        dq: "TdInFaY9FjcwAgJrQCOtrsyl5I_eBMbPhhWWf3yKhG_7v3CMXdT7DOJudv79Skeo6QsFCZBmFDhe4844WnCdQNfIm2rpNBwwtaYGKUa0WU4heYLhmQQmJkr7S9F1xudbONAv8Loyio_stfiKj4SQOKJuf66nHDueAxehODJh6lM",
        qi: "FbFS0z1gRYulSEEI1CIC2348maQkydjY9rwP7vpFXxyyggSUjTSZp8WNIdLukX9bJ95-eQ4julLqTXRzKCbL1A-IuTvMyv2vRNAFgdoRKuua4lQa8f1d4qOV0shz9g6OFqd9piI63ecbF03wOc49wLRyKCnFBGfq8cfhIjh3yog"
      }
    };
    this.fallbackIcon = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    this.ASN1 = {
      TAG_INTEGER: 2,
      TAG_BIT_STRING: 3,
      TAG_OCTET_STRING: 4,
      TAG_NULL: 5,
      TAG_OID: 6,
      TAG_UTF8_STRING: 12,
      TAG_SEQUENCE: 48,
      TAG_SET: 49,
      TAG_UTC_TIME: 23,
      TAG_GENERALIZED_TIME: 24,
      encodeLength(len) {
        if (len < 128) return new Uint8Array([len]);
        if (len < 256) return new Uint8Array([129, len]);
        if (len < 65536) return new Uint8Array([130, len >> 8 & 255, len & 255]);
        return new Uint8Array([131, len >> 16 & 255, len >> 8 & 255, len & 255]);
      },
      encode(tag, content) {
        const lenBytes = this.encodeLength(content.length);
        const result = new Uint8Array(1 + lenBytes.length + content.length);
        result[0] = tag;
        result.set(lenBytes, 1);
        result.set(content, 1 + lenBytes.length);
        return result;
      },
      sequence(...elements) {
        const total = elements.reduce((sum, e) => sum + e.length, 0);
        const content = new Uint8Array(total);
        let offset = 0;
        for (const e of elements) {
          content.set(e, offset);
          offset += e.length;
        }
        return this.encode(this.TAG_SEQUENCE, content);
      },
      set(...elements) {
        const total = elements.reduce((sum, e) => sum + e.length, 0);
        const content = new Uint8Array(total);
        let offset = 0;
        for (const e of elements) {
          content.set(e, offset);
          offset += e.length;
        }
        return this.encode(this.TAG_SET, content);
      },
      integer(value) {
        let bytes = value;
        if (typeof value === "number") {
          if (value === 0) return this.encode(this.TAG_INTEGER, new Uint8Array([0]));
          const arr = [];
          let v = value;
          while (v > 0) {
            arr.unshift(v & 255);
            v = Math.floor(v / 256);
          }
          bytes = new Uint8Array(arr);
        }
        if (bytes[0] & 128) {
          const padded = new Uint8Array(bytes.length + 1);
          padded.set(bytes, 1);
          bytes = padded;
        }
        return this.encode(this.TAG_INTEGER, bytes);
      },
      bitString(data) {
        const content = new Uint8Array(data.length + 1);
        content[0] = 0;
        content.set(data, 1);
        return this.encode(this.TAG_BIT_STRING, content);
      },
      octetString(data) {
        return this.encode(this.TAG_OCTET_STRING, data);
      },
      nullValue() {
        return new Uint8Array([this.TAG_NULL, 0]);
      },
      oid(oidString) {
        const parts = oidString.split(".").map(Number);
        const bytes = [];
        bytes.push(parts[0] * 40 + parts[1]);
        for (let i = 2; i < parts.length; i++) {
          let v = parts[i];
          if (v < 128) {
            bytes.push(v);
          } else {
            const chunks = [];
            chunks.push(v & 127);
            v = v >> 7;
            while (v > 0) {
              chunks.push(v & 127 | 128);
              v = v >> 7;
            }
            bytes.push(...chunks.reverse());
          }
        }
        return this.encode(this.TAG_OID, new Uint8Array(bytes));
      },
      utcTime(date) {
        const pad = n => n.toString().padStart(2, "0");
        const year = date.getUTCFullYear();
        if (year >= 2050) {
          const timeStr = `${year}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
          return this.encode(this.TAG_GENERALIZED_TIME, new TextEncoder().encode(timeStr));
        } else {
          const y = year % 100;
          const timeStr = `${pad(y)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
          return this.encode(this.TAG_UTC_TIME, new TextEncoder().encode(timeStr));
        }
      },
      utf8String(s) {
        return this.encode(this.TAG_UTF8_STRING, new TextEncoder().encode(s));
      },
      contextTag(tagNum, content) {
        const tag = 160 | tagNum;
        const lenBytes = this.encodeLength(content.length);
        const result = new Uint8Array(1 + lenBytes.length + content.length);
        result[0] = tag;
        result.set(lenBytes, 1);
        result.set(content, 1 + lenBytes.length);
        return result;
      },
      sha256WithRsaOid() {
        return this.sequence(this.oid("1.2.840.113549.1.1.11"), this.nullValue());
      },
      rdnSequence(cn) {
        const cnOid = this.oid("2.5.4.3");
        const cnValue = this.utf8String(cn);
        const atv = this.sequence(cnOid, cnValue);
        const rdn = this.set(atv);
        return this.sequence(rdn);
      }
    };
  }
  async _img(src) {
    console.log("Menyelesaikan data gambar...");
    try {
      if (!src) return Buffer.from(this.fallbackIcon, "base64");
      if (Buffer.isBuffer(src)) return src;
      if (typeof src === "string") {
        if (src.startsWith("data:") && src.includes("base64,")) {
          return Buffer.from(src.split("base64,")[1], "base64");
        }
        if (src.startsWith("http://") || src.startsWith("https://")) {
          console.log(`Mengunduh gambar: ${src}`);
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data);
        }
        return Buffer.from(src, "base64");
      }
      return Buffer.from(this.fallbackIcon, "base64");
    } catch (err) {
      console.log(`Gagal mengurai gambar: ${err?.message || err}`);
      return Buffer.from(this.fallbackIcon, "base64");
    }
  }
  _rLE32(buf, offset) {
    return buf[offset] | buf[offset + 1] << 8 | buf[offset + 2] << 16 | buf[offset + 3] << 24;
  }
  _rLE16(buf, offset) {
    return buf[offset] | buf[offset + 1] << 8;
  }
  _wLE32(buf, offset, val) {
    buf[offset] = val & 255;
    buf[offset + 1] = val >> 8 & 255;
    buf[offset + 2] = val >> 16 & 255;
    buf[offset + 3] = val >> 24 & 255;
  }
  _wLE16(buf, offset, val) {
    buf[offset] = val & 255;
    buf[offset + 1] = val >> 8 & 255;
  }
  _parse(buffer) {
    console.log("Membaca dan mengekstrak struktur biner APK...");
    const files = [];
    let eocdOffset = -1;
    for (let i = buffer.length - 22; i >= 0; i--) {
      if (buffer[i] === 80 && buffer[i + 1] === 75 && buffer[i + 2] === 5 && buffer[i + 3] === 6) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) throw new Error("Berkas cetakan APK tidak valid");
    const cdCount = this._rLE16(buffer, eocdOffset + 8);
    const cdOffset = this._rLE32(buffer, eocdOffset + 16);
    let cdPos = cdOffset;
    for (let i = 0; i < cdCount; i++) {
      if (buffer[cdPos] !== 80 || buffer[cdPos + 1] !== 75 || buffer[cdPos + 2] !== 1 || buffer[cdPos + 3] !== 2) {
        break;
      }
      const compressionMethod = this._rLE16(buffer, cdPos + 10);
      const crc = this._rLE32(buffer, cdPos + 16);
      const compressedSize = this._rLE32(buffer, cdPos + 20);
      const uncompressedSize = this._rLE32(buffer, cdPos + 24);
      const fileNameLen = this._rLE16(buffer, cdPos + 28);
      const extraFieldLen = this._rLE16(buffer, cdPos + 30);
      const commentLen = this._rLE16(buffer, cdPos + 32);
      const localHeaderOffset = this._rLE32(buffer, cdPos + 42);
      const path = Buffer.from(buffer.subarray(cdPos + 46, cdPos + 46 + fileNameLen)).toString("utf8");
      const dataOffset = localHeaderOffset + 30 + fileNameLen + this._rLE16(buffer, localHeaderOffset + 28);
      const rawBytes = buffer.subarray(dataOffset, dataOffset + compressedSize);
      let content = rawBytes;
      if (compressionMethod === 8) {
        try {
          content = zlib.inflateRawSync(rawBytes);
        } catch (e) {
          console.log(`Gagal mendekompresi ${path}, menggunakan data mentah terkompresi.`);
        }
      }
      files.push({
        path: path,
        content: Uint8Array.from(content),
        compressionMethod: compressionMethod,
        store: compressionMethod === 0
      });
      cdPos += 46 + fileNameLen + extraFieldLen + commentLen;
    }
    return files;
  }
  _axml(data, searchStr, replaceStr) {
    const poolChunkSize = this._rLE32(data, 12);
    const stringCount = this._rLE32(data, 16);
    const stringsStart = this._rLE32(data, 28);
    const stringOffsets = [];
    for (let i = 0; i < stringCount; i++) {
      stringOffsets.push(this._rLE32(data, 36 + i * 4));
    }
    const baseOffset = 8 + stringsStart;
    let foundIndex = -1;
    let foundOffset = -1;
    for (let i = 0; i < stringCount; i++) {
      const strOffset = baseOffset + stringOffsets[i];
      if (strOffset + 2 >= data.length) continue;
      const len = this._rLE16(data, strOffset);
      if (len === searchStr.length) {
        let currentStr = "";
        for (let j = 0; j < len; j++) {
          currentStr += String.fromCharCode(this._rLE16(data, strOffset + 2 + j * 2));
        }
        if (currentStr === searchStr) {
          foundIndex = i;
          foundOffset = strOffset;
          break;
        }
      }
    }
    if (foundIndex === -1) return data;
    const oldByteSize = 2 + searchStr.length * 2;
    const newByteSize = 2 + replaceStr.length * 2;
    const sizeDiff = newByteSize - oldByteSize;
    const result = new Uint8Array(data.length + sizeDiff);
    result.set(data.subarray(0, foundOffset), 0);
    this._wLE16(result, foundOffset, replaceStr.length);
    for (let i = 0; i < replaceStr.length; i++) {
      this._wLE16(result, foundOffset + 2 + i * 2, replaceStr.charCodeAt(i));
    }
    const oldDataEnd = foundOffset + oldByteSize;
    const newDataEnd = foundOffset + newByteSize;
    result.set(data.subarray(oldDataEnd), newDataEnd);
    const thisStringOffset = stringOffsets[foundIndex];
    for (let i = 0; i < stringCount; i++) {
      const offset = stringOffsets[i];
      if (offset > thisStringOffset) {
        this._wLE32(result, 36 + i * 4, offset + sizeDiff);
      }
    }
    this._wLE32(result, 12, poolChunkSize + sizeDiff);
    this._wLE32(result, 4, result.length);
    return result;
  }
  _crc(data) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      table[i] = c;
    }
    let crc = 4294967295;
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 255] ^ crc >>> 8;
    }
    return (crc ^ 4294967295) >>> 0;
  }
  _align(files) {
    const ALIGNMENT = 4;
    const parts = [];
    const centralDir = [];
    let offset = 0;
    files.sort((a, b) => {
      if (a.path === "resources.arsc") return 1;
      if (b.path === "resources.arsc") return -1;
      return a.path.localeCompare(b.path);
    });
    for (const file of files) {
      const nameBytes = new TextEncoder().encode(file.path);
      let isStore = file.store;
      if (file.path === "resources.arsc") {
        isStore = true;
      }
      let compressedData = file.content;
      let compressionMethod = isStore ? 0 : 8;
      if (compressionMethod === 8) {
        compressedData = zlib.deflateRawSync(file.content, {
          level: 6
        });
      }
      let extraField = new Uint8Array(0);
      if (isStore) {
        const headerSize = 30 + nameBytes.length;
        const dataOffset = offset + headerSize;
        const misalignment = dataOffset % ALIGNMENT;
        if (misalignment !== 0) {
          extraField = new Uint8Array(ALIGNMENT - misalignment);
        }
      }
      const crcVal = this._crc(file.content);
      const header = new Uint8Array(30 + nameBytes.length + extraField.length);
      header.set([80, 75, 3, 4]);
      this._wLE16(header, 4, 20);
      this._wLE16(header, 6, 0);
      this._wLE16(header, 8, compressionMethod);
      this._wLE16(header, 10, 0);
      this._wLE16(header, 12, 0);
      this._wLE32(header, 14, crcVal);
      this._wLE32(header, 18, compressedData.length);
      this._wLE32(header, 22, file.content.length);
      this._wLE16(header, 26, nameBytes.length);
      this._wLE16(header, 28, extraField.length);
      header.set(nameBytes, 30);
      if (extraField.length > 0) {
        header.set(extraField, 30 + nameBytes.length);
      }
      centralDir.push({
        path: file.path,
        nameBytes: nameBytes,
        compressionMethod: compressionMethod,
        crc: crcVal,
        compressedSize: compressedData.length,
        uncompressedSize: file.content.length,
        localHeaderOffset: offset,
        extraFieldLength: extraField.length
      });
      parts.push(header);
      parts.push(compressedData);
      offset += header.length + compressedData.length;
    }
    const cdStart = offset;
    for (const entry of centralDir) {
      const cdEntry = new Uint8Array(46 + entry.nameBytes.length);
      cdEntry.set([80, 75, 1, 2]);
      this._wLE16(cdEntry, 4, 20);
      this._wLE16(cdEntry, 6, 20);
      this._wLE16(cdEntry, 8, 0);
      this._wLE16(cdEntry, 10, entry.compressionMethod);
      this._wLE16(cdEntry, 12, 0);
      this._wLE16(cdEntry, 14, 0);
      this._wLE32(cdEntry, 16, entry.crc);
      this._wLE32(cdEntry, 20, entry.compressedSize);
      this._wLE32(cdEntry, 24, entry.uncompressedSize);
      this._wLE16(cdEntry, 28, entry.nameBytes.length);
      this._wLE16(cdEntry, 30, 0);
      this._wLE16(cdEntry, 32, 0);
      this._wLE16(cdEntry, 34, 0);
      this._wLE16(cdEntry, 36, 0);
      this._wLE32(cdEntry, 38, 0);
      this._wLE32(cdEntry, 42, entry.localHeaderOffset);
      cdEntry.set(entry.nameBytes, 46);
      parts.push(cdEntry);
      offset += cdEntry.length;
    }
    const cdEnd = offset;
    const cdSize = cdEnd - cdStart;
    const eocd = new Uint8Array(22);
    eocd.set([80, 75, 5, 6]);
    this._wLE16(eocd, 4, 0);
    this._wLE16(eocd, 6, 0);
    this._wLE16(eocd, 8, centralDir.length);
    this._wLE16(eocd, 10, centralDir.length);
    this._wLE32(eocd, 12, cdSize);
    this._wLE32(eocd, 16, cdStart);
    this._wLE16(eocd, 20, 0);
    parts.push(eocd);
    const totalSize = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalSize);
    let pos = 0;
    for (const p of parts) {
      result.set(p, pos);
      pos += p.length;
    }
    return result;
  }
  _pkcs7(cert, signature) {
    const signedDataOid = this.ASN1.oid("1.2.840.113549.1.7.2");
    const dataOid = this.ASN1.oid("1.2.840.113549.1.7.1");
    const sha256RsaOid = this.ASN1.oid("1.2.840.113549.1.1.11");
    const sha256Oid = this.ASN1.oid("2.16.840.1.101.3.4.2.1");
    const digestAlgId = this.ASN1.sequence(sha256Oid, this.ASN1.nullValue());
    const digestAlgorithms = this.ASN1.set(digestAlgId);
    const contentInfo = this.ASN1.sequence(dataOid);
    const certificates = this.ASN1.contextTag(0, cert);
    const extractIssuerAndSerial = c => {
      let pos = 0;
      if (c[pos] !== 48) return null;
      pos++;
      if (c[pos] & 128) {
        const lenBytes = c[pos] & 127;
        pos += 1 + lenBytes;
      } else {
        pos++;
      }
      if (c[pos] !== 48) return null;
      pos++;
      if (c[pos] & 128) {
        const lenBytes = c[pos] & 127;
        pos += 1 + lenBytes;
      } else {
        pos++;
      }
      if (c[pos] === 160) {
        pos++;
        const vLen = c[pos++];
        pos += vLen;
      }
      if (c[pos] !== 2) return null;
      const serialStart = pos;
      pos++;
      let serialLen = c[pos++];
      if (serialLen & 128) {
        const lenBytes = serialLen & 127;
        serialLen = 0;
        for (let i = 0; i < lenBytes; i++) {
          serialLen = serialLen << 8 | c[pos++];
        }
      }
      const serialEnd = pos + serialLen;
      const serialNumber = c.slice(serialStart, serialEnd);
      pos = serialEnd;
      if (c[pos] !== 48) return null;
      pos++;
      let sigAlgLen = c[pos++];
      if (sigAlgLen & 128) {
        const lenBytes = sigAlgLen & 127;
        sigAlgLen = 0;
        for (let i = 0; i < lenBytes; i++) {
          sigAlgLen = sigAlgLen << 8 | c[pos++];
        }
      }
      pos += sigAlgLen;
      if (c[pos] !== 48) return null;
      const issuerStart = pos;
      pos++;
      let issuerLen = c[pos++];
      if (issuerLen & 128) {
        const lenBytes = issuerLen & 127;
        issuerLen = 0;
        for (let i = 0; i < lenBytes; i++) {
          issuerLen = issuerLen << 8 | c[pos++];
        }
      }
      const issuer = c.slice(issuerStart, pos + issuerLen);
      return {
        issuer: issuer,
        serialNumber: serialNumber
      };
    };
    const certInfo = extractIssuerAndSerial(cert);
    let issuerAndSerial;
    if (certInfo) {
      const totalLen = certInfo.issuer.length + certInfo.serialNumber.length;
      const combined = new Uint8Array(totalLen);
      combined.set(certInfo.issuer, 0);
      combined.set(certInfo.serialNumber, certInfo.issuer.length);
      issuerAndSerial = this.ASN1.encode(48, combined);
    } else {
      const issuer = this.ASN1.rdnSequence("Web2APK Signing Key");
      const serial = this.ASN1.integer(1);
      issuerAndSerial = this.ASN1.sequence(issuer, serial);
    }
    const signerInfo = this.ASN1.sequence(this.ASN1.integer(1), issuerAndSerial, digestAlgId, this.ASN1.sequence(sha256RsaOid, this.ASN1.nullValue()), this.ASN1.octetString(signature));
    const signerInfos = this.ASN1.set(signerInfo);
    const signedDataContent = this.ASN1.sequence(this.ASN1.integer(1), digestAlgorithms, contentInfo, certificates, signerInfos);
    return this.ASN1.sequence(signedDataOid, this.ASN1.contextTag(0, signedDataContent));
  }
  async _keys() {
    const privateKey = await this.subtle.importKey("jwk", this.FIXED_KEY.privateKey, {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    }, true, ["sign"]);
    const publicKey = await this.subtle.importKey("jwk", this.FIXED_KEY.publicKey, {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    }, true, ["verify"]);
    const spki = new Uint8Array(await this.subtle.exportKey("spki", publicKey));
    const notBefore = new Date("2020-01-01T00:00:00Z");
    const notAfter = new Date("2050-01-01T00:00:00Z");
    const serialBytes = new Uint8Array([1, 87, 107, 58, 242, 200, 29, 78]);
    const subject = this.ASN1.rdnSequence("Web2APK Signing Key");
    const tbsCertificate = this.ASN1.sequence(this.ASN1.contextTag(0, this.ASN1.integer(2)), this.ASN1.integer(serialBytes), this.ASN1.sha256WithRsaOid(), subject, this.ASN1.sequence(this.ASN1.utcTime(notBefore), this.ASN1.utcTime(notAfter)), subject, spki);
    const tbsSignature = await this.subtle.sign({
      name: "RSASSA-PKCS1-v1_5"
    }, privateKey, tbsCertificate);
    const certificate = this.ASN1.sequence(tbsCertificate, this.ASN1.sha256WithRsaOid(), this.ASN1.bitString(new Uint8Array(tbsSignature)));
    return {
      privateKey: privateKey,
      publicKey: publicKey,
      certificate: certificate
    };
  }
  async _v1(files, cert, privKey) {
    let manifestMf = "Manifest-Version: 1.0\r\nCreated-By: 1.0 (Web2APK Generator)\r\n\r\n";
    const entryDigests = [];
    for (const file of files) {
      if (file.path.startsWith("META-INF/")) continue;
      const digest = await this.subtle.digest("SHA-256", file.content);
      const base64Digest = Buffer.from(digest).toString("base64");
      manifestMf += `Name: ${file.path}\r\nSHA-256-Digest: ${base64Digest}\r\n\r\n`;
      entryDigests.push({
        path: file.path,
        digest: base64Digest
      });
    }
    const mfBytes = new TextEncoder().encode(manifestMf);
    const mfDigest = await this.subtle.digest("SHA-256", mfBytes);
    const mfDigestBase64 = Buffer.from(mfDigest).toString("base64");
    let certSf = "Signature-Version: 1.0\r\nSHA-256-Digest-Manifest: " + mfDigestBase64 + "\r\nCreated-By: 1.0 (Web2APK Generator)\r\n\r\n";
    for (const entry of entryDigests) {
      const entryManifest = `Name: ${entry.path}\r\nSHA-256-Digest: ${entry.digest}\r\n\r\n`;
      const entryBytes = new TextEncoder().encode(entryManifest);
      const entryDigest = await this.subtle.digest("SHA-256", entryBytes);
      certSf += `Name: ${entry.path}\r\nSHA-256-Digest: ${Buffer.from(entryDigest).toString("base64")}\r\n\r\n`;
    }
    const sfBytes = new TextEncoder().encode(certSf);
    const signature = await this.subtle.sign({
      name: "RSASSA-PKCS1-v1_5"
    }, privKey, sfBytes);
    const rsaBytes = this._pkcs7(cert, new Uint8Array(signature));
    files.push({
      path: "META-INF/MANIFEST.MF",
      content: mfBytes,
      store: false
    });
    files.push({
      path: "META-INF/CERT.SF",
      content: sfBytes,
      store: false
    });
    files.push({
      path: "META-INF/CERT.RSA",
      content: rsaBytes,
      store: false
    });
  }
  async _digests(s1, s3, s4) {
    const sections = [s1, s3, s4];
    let totalChunks = 0;
    for (const s of sections) {
      if (s.length > 0) totalChunks += Math.ceil(s.length / this.CHUNK_SIZE);
    }
    const chunkDigests = [];
    for (const s of sections) {
      let offset = 0;
      while (offset < s.length) {
        const len = Math.min(s.length - offset, this.CHUNK_SIZE);
        const chunk = s.slice(offset, offset + len);
        const prefix = new Uint8Array(5);
        prefix[0] = 165;
        this._wLE32(prefix, 1, len);
        const chunkData = new Uint8Array(5 + chunk.length);
        chunkData.set(prefix);
        chunkData.set(chunk, 5);
        const digest = await this.subtle.digest("SHA-256", chunkData);
        chunkDigests.push(new Uint8Array(digest));
        offset += len;
      }
    }
    const finalData = new Uint8Array(5 + chunkDigests.length * 32);
    finalData[0] = 90;
    this._wLE32(finalData, 1, totalChunks);
    let pos = 5;
    for (const d of chunkDigests) {
      finalData.set(d, pos);
      pos += d.length;
    }
    return new Uint8Array(await this.subtle.digest("SHA-256", finalData));
  }
  async _v2(apkData, cert, privKey, pubKey) {
    let eocdOffset = -1;
    for (let i = apkData.length - 22; i >= 0; i--) {
      if (apkData[i] === 80 && apkData[i + 1] === 75 && apkData[i + 2] === 5 && apkData[i + 3] === 6) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) throw new Error("EOCD tidak ditemukan");
    const cdOffset = this._rLE32(apkData, eocdOffset + 16);
    const s1 = apkData.slice(0, cdOffset);
    const s3 = apkData.slice(cdOffset, eocdOffset);
    const s4 = apkData.slice(eocdOffset);
    const padSize = (8 - s1.length % 8) % 8;
    let paddedS1 = s1;
    if (padSize > 0) {
      paddedS1 = new Uint8Array(s1.length + padSize);
      paddedS1.set(s1, 0);
    }
    const s4ForDigest = new Uint8Array(s4);
    this._wLE32(s4ForDigest, 16, paddedS1.length);
    const digests = await this._digests(paddedS1, s3, s4ForDigest);
    const singleDigest = new Uint8Array(4 + 4 + digests.length);
    this._wLE32(singleDigest, 0, this.ALGORITHM_ID);
    this._wLE32(singleDigest, 4, digests.length);
    singleDigest.set(digests, 8);
    const digestsSeq = new Uint8Array(4 + singleDigest.length);
    this._wLE32(digestsSeq, 0, singleDigest.length);
    digestsSeq.set(singleDigest, 4);
    const digestsPart = new Uint8Array(4 + digestsSeq.length);
    this._wLE32(digestsPart, 0, digestsSeq.length);
    digestsPart.set(digestsSeq, 4);
    const certsSeq = new Uint8Array(4 + cert.length);
    this._wLE32(certsSeq, 0, cert.length);
    certsSeq.set(cert, 4);
    const certsPart = new Uint8Array(4 + certsSeq.length);
    this._wLE32(certsPart, 0, certsSeq.length);
    certsPart.set(certsSeq, 4);
    const signedData = new Uint8Array(digestsPart.length + certsPart.length + 4);
    signedData.set(digestsPart, 0);
    signedData.set(certsPart, digestsPart.length);
    this._wLE32(signedData, digestsPart.length + certsPart.length, 0);
    const signature = await this.subtle.sign({
      name: "RSASSA-PKCS1-v1_5"
    }, privKey, signedData);
    const sigBytes = new Uint8Array(signature);
    const pubKeyBytes = new Uint8Array(await this.subtle.exportKey("spki", pubKey));
    const signedDataPart = new Uint8Array(4 + signedData.length);
    this._wLE32(signedDataPart, 0, signedData.length);
    signedDataPart.set(signedData, 4);
    const singleSig = new Uint8Array(4 + 4 + sigBytes.length);
    this._wLE32(singleSig, 0, this.ALGORITHM_ID);
    this._wLE32(singleSig, 4, sigBytes.length);
    singleSig.set(sigBytes, 8);
    const sigsSeq = new Uint8Array(4 + singleSig.length);
    this._wLE32(sigsSeq, 0, singleSig.length);
    sigsSeq.set(singleSig, 4);
    const sigsPart = new Uint8Array(4 + sigsSeq.length);
    this._wLE32(sigsPart, 0, sigsSeq.length);
    sigsPart.set(sigsSeq, 4);
    const pubKeyPart = new Uint8Array(4 + pubKeyBytes.length);
    this._wLE32(pubKeyPart, 0, pubKeyBytes.length);
    pubKeyPart.set(pubKeyBytes, 4);
    const signerLen = signedDataPart.length + sigsPart.length + pubKeyPart.length;
    const signer = new Uint8Array(signerLen);
    signer.set(signedDataPart, 0);
    signer.set(sigsPart, signedDataPart.length);
    signer.set(pubKeyPart, signedDataPart.length + sigsPart.length);
    const signersSeq = new Uint8Array(4 + signer.length);
    this._wLE32(signersSeq, 0, signer.length);
    signersSeq.set(signer, 4);
    const signersBlock = new Uint8Array(4 + signersSeq.length);
    this._wLE32(signersBlock, 0, signersSeq.length);
    signersBlock.set(signersSeq, 4);
    const pairId = new Uint8Array([26, 135, 9, 113]);
    const pairSize = new Uint8Array(8);
    this._wLE32(pairSize, 0, pairId.length + signersBlock.length);
    const sigPair = new Uint8Array(8 + pairId.length + signersBlock.length);
    sigPair.set(pairSize, 0);
    sigPair.set(pairId, 8);
    sigPair.set(signersBlock, 12);
    const currentSize = sigPair.length + 32;
    const misalignment = currentSize % 8;
    let finalPair = sigPair;
    if (misalignment !== 0) {
      const p = 16 + (8 - misalignment) % 8;
      const padPair = new Uint8Array(p);
      this._wLE32(padPair, 0, p - 8);
      this._wLE32(padPair, 8, 0);
      finalPair = new Uint8Array(sigPair.length + p);
      finalPair.set(sigPair, 0);
      finalPair.set(padPair, sigPair.length);
    }
    const blockSize = finalPair.length + 24;
    const sizeLe = new Uint8Array(8);
    this._wLE32(sizeLe, 0, blockSize);
    const magic = new TextEncoder().encode("APK Sig Block 42");
    const apkSigBlock = new Uint8Array(8 + finalPair.length + 8 + 16);
    apkSigBlock.set(sizeLe, 0);
    apkSigBlock.set(finalPair, 8);
    apkSigBlock.set(sizeLe, 8 + finalPair.length);
    apkSigBlock.set(magic, 16 + finalPair.length);
    const newCdOffset = paddedS1.length + apkSigBlock.length;
    const s4Final = new Uint8Array(s4);
    this._wLE32(s4Final, 16, newCdOffset);
    const signedApk = new Uint8Array(paddedS1.length + apkSigBlock.length + s3.length + s4Final.length);
    signedApk.set(paddedS1, 0);
    signedApk.set(apkSigBlock, paddedS1.length);
    signedApk.set(s3, paddedS1.length + apkSigBlock.length);
    signedApk.set(s4Final, paddedS1.length + apkSigBlock.length + s3.length);
    return signedApk;
  }
  async _build(taskId, {
    url,
    name,
    icon,
    version,
    pkg_name,
    ...rest
  }) {
    console.log(`[Tugas: ${taskId}] Memulai penyusunan APK...`);
    try {
      this.tasks[taskId].progress = 15;
      const template = await this._loadTemplate();
      this.tasks[taskId].progress = 30;
      const files = this._parse(template);
      this.tasks[taskId].progress = 55;
      const appConfig = {
        websiteUrl: url || "https://example.com",
        appName: name || "WebApp",
        splashBgColor: rest?.splashBgColor || "#3F51B5",
        splashDuration: rest?.splashDuration !== undefined ? Number(rest.splashDuration) : 2e3,
        enableJavaScript: rest?.enableJavaScript !== undefined ? Boolean(rest.enableJavaScript) : true,
        enableFullscreen: rest?.enableFullscreen !== undefined ? Boolean(rest.enableFullscreen) : true,
        enableAds: rest?.enableAds !== undefined ? Boolean(rest.enableAds) : false,
        adPlacement: rest?.adPlacement || "none",
        admobBannerId: rest?.admobBannerId || "ca-app-pub-3940256099942544/6300978111",
        admobPublisherId: rest?.admobPublisherId || "",
        developerWebsite: rest?.developerWebsite || "",
        enableOneSignal: rest?.enableOneSignal !== undefined ? Boolean(rest.enableOneSignal) : false,
        oneSignalAppId: rest?.oneSignalAppId || "",
        generatorOneSignalAppId: rest?.generatorOneSignalAppId || "",
        linkOpenMode: rest?.linkOpenMode || "internal",
        enablePullToRefresh: rest?.enablePullToRefresh !== undefined ? Boolean(rest.enablePullToRefresh) : true,
        screenOrientation: rest?.screenOrientation || "portrait",
        appNamePosition: rest?.appNamePosition || "center",
        appNameColor: rest?.appNameColor || "#FFFFFF",
        isPremium: rest?.isPremium !== undefined ? Boolean(rest.isPremium) : false,
        permCamera: rest?.permCamera !== undefined ? Boolean(rest.permCamera) : false,
        permMicrophone: rest?.permMicrophone !== undefined ? Boolean(rest.permMicrophone) : false,
        permLocationFine: rest?.permLocationFine !== undefined ? Boolean(rest.permLocationFine) : false,
        permLocationCoarse: rest?.permLocationCoarse !== undefined ? Boolean(rest.permLocationCoarse) : false,
        permStorage: rest?.permStorage !== undefined ? Boolean(rest.permStorage) : false,
        permContacts: rest?.permContacts !== undefined ? Boolean(rest.permContacts) : false,
        permPhone: rest?.permPhone !== undefined ? Boolean(rest.permPhone) : false,
        permVibrate: rest?.permVibrate !== undefined ? Boolean(rest.permVibrate) : false,
        permBluetooth: rest?.permBluetooth !== undefined ? Boolean(rest.permBluetooth) : false,
        permNfc: rest?.permNfc !== undefined ? Boolean(rest.permNfc) : false,
        enableSideMenu: rest?.enableSideMenu !== undefined ? Boolean(rest.enableSideMenu) : true,
        sideMenuColor: rest?.sideMenuColor || "#6366F1",
        appBarColor: rest?.appBarColor || "#6366F1",
        aboutUs: rest?.aboutUs || "",
        privacyPolicyHtml: rest?.privacyPolicyHtml || "",
        contactEmail: rest?.contactEmail || "",
        contactPhone: rest?.contactPhone || "",
        enableShareApp: rest?.enableShareApp !== undefined ? Boolean(rest.enableShareApp) : true,
        enableRateApp: rest?.enableRateApp !== undefined ? Boolean(rest.enableRateApp) : true,
        youtubeLink: rest?.youtubeLink || "",
        telegramLink: rest?.telegramLink || "",
        instagramLink: rest?.instagramLink || "",
        twitterLink: rest?.twitterLink || "",
        enableLiveChat: rest?.enableLiveChat !== undefined ? Boolean(rest.enableLiveChat) : false,
        chatWidgetCode: rest?.chatWidgetCode || "",
        chatButtonLabel: rest?.chatButtonLabel || "Live Chat",
        enablePinLock: rest?.enablePinLock !== undefined ? Boolean(rest.enablePinLock) : false,
        pinCode: rest?.pinCode || "",
        enableExitConfirmation: rest?.enableExitConfirmation !== undefined ? Boolean(rest.enableExitConfirmation) : true,
        enableZoom: rest?.enableZoom !== undefined ? Boolean(rest.enableZoom) : true,
        customSplashImage: rest?.customSplashImage || null
      };
      const cfgBytes = new TextEncoder().encode(JSON.stringify(appConfig));
      const cfgIndex = files.findIndex(f => f.path === "assets/config.json");
      if (cfgIndex !== -1) {
        files[cfgIndex].content = cfgBytes;
        files[cfgIndex].store = false;
      } else {
        files.push({
          path: "assets/config.json",
          content: cfgBytes,
          store: false
        });
      }
      const manifestIdx = files.findIndex(f => f.path === "AndroidManifest.xml");
      if (manifestIdx !== -1) {
        let binaryManifest = files[manifestIdx].content;
        binaryManifest = this._axml(binaryManifest, "APPNAME_PLACEHOLDER_50_CHARS_XXXXXXXXXXXXXXXXXXXXX", appConfig.appName);
        binaryManifest = this._axml(binaryManifest, "com.webtoapk.template", pkg_name || "com.local.app");
        files[manifestIdx].content = binaryManifest;
      }
      this.tasks[taskId].progress = 70;
      const iconBuffer = await this._img(icon);
      const densities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
      for (const d of densities) {
        const paths = [`res/mipmap-${d}-v4/ic_launcher.png`, `res/mipmap-${d}-v4/ic_launcher_round.png`];
        for (const p of paths) {
          const idx = files.findIndex(f => f.path === p);
          if (idx !== -1) {
            files[idx].content = iconBuffer;
            files[idx].store = true;
          } else {
            files.push({
              path: p,
              content: iconBuffer,
              store: true
            });
          }
        }
      }
      this.tasks[taskId].progress = 80;
      const keys = await this._keys();
      await this._v1(files, keys.certificate, keys.privateKey);
      this.tasks[taskId].progress = 90;
      const alignedApk = this._align(files);
      const signedApk = await this._v2(alignedApk, keys.certificate, keys.privateKey, keys.publicKey);
      this.tasks[taskId].progress = 100;
      this.tasks[taskId].status = "completed";
      this.tasks[taskId].result = {
        file_data: Buffer.from(signedApk),
        file_size: signedApk.length,
        app_name: appConfig.appName,
        package_name: pkg_name || "com.local.app"
      };
      console.log(`[Tugas: ${taskId}] Proses pembangunan selesai.`);
    } catch (err) {
      console.log(`[Tugas: ${taskId}] Kegagalan pembuatan: ${err?.message || err}`);
      this.tasks[taskId].status = "error";
      this.tasks[taskId].error = err?.message || "Proses pembuatan gagal";
    }
  }
  async _loadTemplate() {
    if (this.templateData) return this.templateData;
    console.log(`Mengunduh file cetakan dari ${this.tmplUrl}...`);
    const res = await axios.get(this.tmplUrl, {
      responseType: "arraybuffer"
    });
    this.templateData = new Uint8Array(res?.data);
    return this.templateData;
  }
  async _poll(taskId) {
    console.log(`Memantau status untuk tugas: ${taskId}`);
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    while (true) {
      const task = this.tasks[taskId];
      if (!task) throw new Error("ID tugas hilang dari status lokal");
      console.log(`Perkembangan Tugas: ${task.status} (${task.progress}%)`);
      if (task.status === "completed") {
        const res = task.result;
        delete this.tasks[taskId];
        return res;
      }
      if (task.status === "error") {
        const errMsg = task.error;
        delete this.tasks[taskId];
        throw new Error(errMsg);
      }
      await sleep(this.pollInterval);
    }
  }
  async generate({
    url,
    name,
    icon,
    version,
    pkg_name,
    ...rest
  }) {
    console.log("Menginisialisasi tugas pembuatan APK mandiri...");
    try {
      const taskId = "task_pure_" + Math.random().toString(36).substring(2, 10);
      this.tasks[taskId] = {
        status: "pending",
        progress: 0,
        result: null,
        error: null
      };
      this._build(taskId, {
        url: url,
        name: name,
        icon: icon,
        version: version,
        pkg_name: pkg_name,
        ...rest
      });
      const buildRes = await this._poll(taskId);
      return {
        status: "success",
        buffer: Buffer.from(buildRes?.file_data),
        contentType: "application/vnd.android.package-archive"
      };
    } catch (error) {
      console.log(`Kesalahan kompilasi internal: ${error?.message || error}`);
      return {
        status: "error",
        buffer: null,
        contentType: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new WebToApp();
  try {
    const result = await api.generate(params);
    if (result.status === "error") {
      return res.status(500).json({
        status: "error",
        message: "Gagal melakukan kompilasi APK"
      });
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", 'attachment; filename="app.apk"');
    res.setHeader("Content-Length", result.buffer.length);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      status: "error",
      message: errorMessage
    });
  }
}