import { useState, useCallback, useEffect, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import {
  Copy, Check, ArrowRight, ArrowLeft, Sun, Moon, Languages,
  Upload, Download, X, AlertCircle, Info,
} from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'Base64 Codec',
    subtitle: 'Encode and decode Base64 for text and files. Everything runs client-side.',
    plainText: 'Plain Text',
    plainPlaceholder: 'Type or paste text here, or drop a file...',
    base64Text: 'Base64',
    base64Placeholder: 'Paste Base64 here to decode...',
    encode: 'Encode',
    decode: 'Decode',
    copy: 'Copy',
    copied: 'Copied!',
    clear: 'Clear all',
    urlSafe: 'URL-safe',
    urlSafeTitle: 'Use - and _ instead of + and /',
    autoDetect: 'Looks like Base64',
    autoDetectAction: 'Decode it',
    inputSize: 'Input',
    outputSize: 'Output',
    ratio: 'Ratio',
    bytes: 'B',
    kb: 'KB',
    mb: 'MB',
    dropFile: 'Drop file to encode',
    fileLoaded: 'File loaded',
    downloadFile: 'Download as file',
    imagePreview: 'Image preview',
    errorDecode: 'Invalid Base64 string.',
    errorEmpty: 'Nothing to process.',
    disclaimer: 'No data is sent to any server. All processing happens in your browser.',
    builtBy: 'Built by',
    chars: 'chars',
  },
  pt: {
    title: 'Base64 Codec',
    subtitle: 'Codifique e decodifique Base64 para texto e arquivos. Tudo roda no navegador.',
    plainText: 'Texto Simples',
    plainPlaceholder: 'Digite ou cole texto aqui, ou arraste um arquivo...',
    base64Text: 'Base64',
    base64Placeholder: 'Cole o Base64 aqui para decodificar...',
    encode: 'Codificar',
    decode: 'Decodificar',
    copy: 'Copiar',
    copied: 'Copiado!',
    clear: 'Limpar tudo',
    urlSafe: 'URL-safe',
    urlSafeTitle: 'Usar - e _ no lugar de + e /',
    autoDetect: 'Parece Base64',
    autoDetectAction: 'Decodificar',
    inputSize: 'Entrada',
    outputSize: 'Saida',
    ratio: 'Razao',
    bytes: 'B',
    kb: 'KB',
    mb: 'MB',
    dropFile: 'Solte o arquivo para codificar',
    fileLoaded: 'Arquivo carregado',
    downloadFile: 'Baixar como arquivo',
    imagePreview: 'Previa da imagem',
    errorDecode: 'String Base64 invalida.',
    errorEmpty: 'Nada para processar.',
    disclaimer: 'Nenhum dado e enviado ao servidor. Todo o processamento ocorre no seu navegador.',
    builtBy: 'Criado por',
    chars: 'chars',
  },
} as const

type Lang = keyof typeof translations
type T = (typeof translations)[Lang]

// ── Utilities ─────────────────────────────────────────────────────────────────
function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_')
}

function fromUrlSafe(b64: string): string {
  return b64.replace(/-/g, '+').replace(/_/g, '/')
}

function encodeBase64(input: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(input)
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
  const b64 = btoa(binary)
  return urlSafe ? toUrlSafe(b64) : b64
}

function encodeBase64Bytes(bytes: Uint8Array, urlSafe: boolean): string {
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
  const b64 = btoa(binary)
  return urlSafe ? toUrlSafe(b64) : b64
}

function decodeBase64(input: string): Uint8Array {
  const normalized = fromUrlSafe(input.trim())
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function looksLikeBase64(s: string): boolean {
  const trimmed = s.trim()
  if (trimmed.length < 8) return false
  // standard or url-safe base64, with optional padding
  const re = /^[A-Za-z0-9+/\-_]+=*$/
  return re.test(trimmed) && trimmed.length % 4 === 0
}

function fmtSize(n: number, t: T): string {
  if (n < 1024) return `${n} ${t.bytes}`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ${t.kb}`
  return `${(n / 1024 / 1024).toFixed(2)} ${t.mb}`
}

function tryDetectMime(bytes: Uint8Array): string | null {
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif'
  // WEBP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57) return 'image/webp'
  // SVG
  if (bytes[0] === 0x3c) {
    const head = new TextDecoder().decode(bytes.slice(0, 64))
    if (head.includes('<svg') || head.includes('<?xml')) return 'image/svg+xml'
  }
  // PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50) return 'application/pdf'
  return null
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CopyButton({ value, label, copied: copiedLabel }: { value: string; label: string; copied: string }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      disabled={!value}
      title={label}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {done ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {done ? copiedLabel : label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Base64Codec() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [urlSafe, setUrlSafe] = useState(false)
  const [plain, setPlain] = useState('')
  const [b64, setB64] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  // File encode side
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null)
  // Decoded binary side
  const [decodedBytes, setDecodedBytes] = useState<Uint8Array | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const t = translations[lang]

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  // Re-encode when urlSafe changes and there is already a result
  useEffect(() => {
    if (!b64) return
    try {
      // Normalize existing b64 then re-apply urlSafe flag
      const normalized = fromUrlSafe(b64.trim())
      setB64(urlSafe ? toUrlSafe(normalized) : normalized)
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSafe])

  const clearAll = () => {
    setPlain('')
    setB64('')
    setError('')
    setFileName(null)
    setFileBytes(null)
    setDecodedBytes(null)
    if (imagePreviewUrl) { URL.revokeObjectURL(imagePreviewUrl); setImagePreviewUrl(null) }
  }

  const handleEncode = useCallback(() => {
    setError('')
    setDecodedBytes(null)
    if (imagePreviewUrl) { URL.revokeObjectURL(imagePreviewUrl); setImagePreviewUrl(null) }

    if (fileBytes) {
      setB64(encodeBase64Bytes(fileBytes, urlSafe))
      return
    }
    if (!plain.trim()) { setError(t.errorEmpty); return }
    setB64(encodeBase64(plain, urlSafe))
  }, [fileBytes, plain, urlSafe, t, imagePreviewUrl])

  const handleDecode = useCallback(() => {
    setError('')
    setDecodedBytes(null)
    if (imagePreviewUrl) { URL.revokeObjectURL(imagePreviewUrl); setImagePreviewUrl(null) }

    if (!b64.trim()) { setError(t.errorEmpty); return }
    try {
      const bytes = decodeBase64(b64)
      // Try to decode as UTF-8 text first
      let decoded: string
      try {
        decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        setPlain(decoded)
        setFileName(null)
        setFileBytes(null)
      } catch {
        // Binary content — keep as bytes
        decoded = ''
        setPlain('')
        setDecodedBytes(bytes)
        const mime = tryDetectMime(bytes)
        if (mime && mime.startsWith('image/')) {
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime })
          setImagePreviewUrl(URL.createObjectURL(blob))
        }
      }
    } catch {
      setError(t.errorDecode)
    }
  }, [b64, t, imagePreviewUrl])

  const loadFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const buf = e.target?.result as ArrayBuffer
      const bytes = new Uint8Array(buf)
      setFileBytes(bytes)
      setFileName(file.name)
      setPlain('')
      setB64('')
      setError('')
      setDecodedBytes(null)
      if (imagePreviewUrl) { URL.revokeObjectURL(imagePreviewUrl); setImagePreviewUrl(null) }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  const handleDownload = () => {
    if (!decodedBytes) return
    const mime = tryDetectMime(decodedBytes) ?? 'application/octet-stream'
    const blob = new Blob([decodedBytes.buffer as ArrayBuffer], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'decoded-file'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Stats
  const inputLen = fileBytes?.length ?? new TextEncoder().encode(plain).length
  const outputLen = new TextEncoder().encode(b64).length
  const ratio = inputLen > 0 && outputLen > 0 ? (outputLen / inputLen).toFixed(2) : null

  // Auto-detect
  const showAutoDetect = plain && !fileBytes && looksLikeBase64(plain)

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="12" font-family="monospace" font-size="11" font-weight="700" fill="white">B6</text>
              </svg>
            </div>
            <span className="font-semibold">Base64 Codec</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle language"
            >
              <Languages size={14} />
              {lang.toUpperCase()}
            </button>
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle theme"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="https://github.com/gmowses/base64-codec"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-1.5 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* URL-safe toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none" title={t.urlSafeTitle}>
              <div
                role="switch"
                aria-checked={urlSafe}
                onClick={() => setUrlSafe(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${urlSafe ? 'bg-pink-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${urlSafe ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm font-medium">{t.urlSafe}</span>
              <span className="text-xs text-zinc-400 hidden sm:inline">(- _ instead of + /)</span>
            </label>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
              >
                <X size={12} />
                {t.clear}
              </button>
            </div>
          </div>

          {/* Auto-detect banner */}
          {showAutoDetect && (
            <div className="flex items-center gap-3 rounded-lg border border-pink-300 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/20 px-4 py-2.5 text-sm text-pink-700 dark:text-pink-300">
              <Info size={15} className="shrink-0" />
              <span>{t.autoDetect}.</span>
              <button
                onClick={() => { setB64(plain); setPlain(''); setTimeout(handleDecode, 0) }}
                className="underline underline-offset-2 font-medium hover:text-pink-900 dark:hover:text-pink-100 transition-colors"
              >
                {t.autoDetectAction}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Two-panel layout */}
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
            {/* Left panel: Plain text */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-semibold">{t.plainText}</span>
                <div className="flex items-center gap-2">
                  {/* File picker */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title={t.dropFile}
                  >
                    <Upload size={12} />
                    {t.dropFile.split(' ')[0]}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} />
                  <CopyButton value={plain} label={t.copy} copied={t.copied} />
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={`relative flex-1 min-h-[260px] transition-colors ${dragging ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                {fileName ? (
                  <div className="flex flex-col h-full items-center justify-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
                      <Upload size={22} className="text-pink-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.fileLoaded}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 break-all">{fileName}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{fileBytes ? fmtSize(fileBytes.length, t) : ''}</p>
                    </div>
                    <button
                      onClick={() => { setFileName(null); setFileBytes(null) }}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={plain}
                      onChange={e => { setPlain(e.target.value); setError('') }}
                      placeholder={t.plainPlaceholder}
                      spellCheck={false}
                      className="w-full h-full min-h-[260px] resize-none bg-transparent px-4 py-3 text-sm font-mono outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                    />
                    {dragging && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-sm font-medium text-pink-500">{t.dropFile}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Center controls */}
            <div className="flex lg:flex-col items-center justify-center gap-2 py-2">
              <button
                onClick={handleEncode}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition-colors shadow-sm"
                title={t.encode}
              >
                {t.encode}
                <ArrowRight size={15} className="hidden lg:block" />
                <ArrowRight size={15} className="block lg:hidden rotate-90" />
              </button>
              <button
                onClick={handleDecode}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={t.decode}
              >
                <ArrowLeft size={15} className="hidden lg:block" />
                <ArrowLeft size={15} className="block lg:hidden rotate-90" />
                {t.decode}
              </button>
            </div>

            {/* Right panel: Base64 */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-semibold">{t.base64Text}</span>
                <CopyButton value={b64} label={t.copy} copied={t.copied} />
              </div>
              <textarea
                value={b64}
                onChange={e => { setB64(e.target.value); setError('') }}
                placeholder={t.base64Placeholder}
                spellCheck={false}
                className="flex-1 min-h-[260px] resize-none bg-transparent px-4 py-3 text-sm font-mono outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 break-all"
              />
            </div>
          </div>

          {/* Stats bar */}
          {(inputLen > 0 || outputLen > 0) && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-3 text-xs">
              <div>
                <span className="text-zinc-400 uppercase tracking-wide mr-1.5">{t.inputSize}</span>
                <span className="font-semibold tabular-nums">{fmtSize(inputLen, t)}</span>
              </div>
              <div>
                <span className="text-zinc-400 uppercase tracking-wide mr-1.5">{t.outputSize}</span>
                <span className="font-semibold tabular-nums">{fmtSize(outputLen, t)}</span>
              </div>
              {ratio && (
                <div>
                  <span className="text-zinc-400 uppercase tracking-wide mr-1.5">{t.ratio}</span>
                  <span className="font-semibold tabular-nums">{ratio}x</span>
                </div>
              )}
              {plain && !fileBytes && (
                <div>
                  <span className="text-zinc-400 uppercase tracking-wide mr-1.5">{t.plainText}</span>
                  <span className="font-semibold tabular-nums">{plain.length} {t.chars}</span>
                </div>
              )}
              {b64 && (
                <div>
                  <span className="text-zinc-400 uppercase tracking-wide mr-1.5">Base64</span>
                  <span className="font-semibold tabular-nums">{b64.length} {t.chars}</span>
                </div>
              )}
            </div>
          )}

          {/* Decoded binary download / image preview */}
          {decodedBytes && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {imagePreviewUrl ? t.imagePreview : t.downloadFile}
                </span>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-medium hover:bg-pink-600 transition-colors"
                >
                  <Download size={13} />
                  {t.downloadFile}
                </button>
              </div>

              {imagePreviewUrl && (
                <div className="flex justify-center rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 max-h-96">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="max-w-full max-h-96 object-contain"
                  />
                </div>
              )}

              <p className="text-xs text-zinc-400">
                {fmtSize(decodedBytes.length, t)} &bull; {tryDetectMime(decodedBytes) ?? 'application/octet-stream'}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-zinc-400 text-center">{t.disclaimer}</p>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>
            {t.builtBy}{' '}
            <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-pink-500 transition-colors">
              Gabriel Mowses
            </a>
          </span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
