'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, SwitchCamera, RotateCcw, Check } from 'lucide-react';
import {
  CAPTURE_JPEG_QUALITY,
  describeCameraError,
  fitWithin,
  isCameraSupported,
  nextFacing,
  type CameraFacing,
} from '@/lib/camera';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  /** Dipanggil dengan data URL JPEG saat pengguna menekan "Pakai foto". */
  onCapture: (dataUrl: string) => void;
  title?: string;
}

type Phase = 'starting' | 'live' | 'captured' | 'error';

/**
 * Jendela kamera selalu hitam-putih, apa pun temanya. Mode gelap memetakan ulang
 * --color-white dan skala neutral, jadi nilainya dikunci di sini.
 */
const FIXED_PALETTE = {
  '--color-white': '#ffffff',
  '--color-neutral-200': '#e5e5e5',
  '--color-neutral-300': '#d4d4d4',
  '--color-neutral-900': '#171717',
  colorScheme: 'dark',
} as React.CSSProperties;

/**
 * Kamera layar penuh berbasis getUserMedia. Berjalan di browser PC (webcam)
 * maupun HP (kamera belakang secara default, bisa ditukar ke depan).
 */
export function CameraCapture({
  isOpen,
  onClose,
  onCapture,
  title = 'Ambil foto bukti',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  const [facing, setFacing] = useState<CameraFacing>('environment');
  const [phase, setPhase] = useState<Phase>('starting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Buka / tutup kamera mengikuti isOpen dan arah kamera.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function start() {
      setPhase('starting');
      setErrorMsg(null);
      setSnapshot(null);
      stopStream();

      if (!isCameraSupported()) {
        setErrorMsg(describeCameraError({ name: 'NotSupportedError' }));
        setPhase('error');
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (err) {
          // Beberapa webcam PC menolak constraint resolusi — coba yang paling dasar.
          const name = (err as { name?: string })?.name;
          if (name !== 'OverconstrainedError' && name !== 'NotFoundError') throw err;
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }

        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (cancelled) return;
        setCanSwitch(devices.filter((d) => d.kind === 'videoinput').length > 1);
        setPhase('live');
        shutterRef.current?.focus();
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(describeCameraError(err));
        setPhase('error');
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, facing, stopStream]);

  // Esc menutup kamera; kunci scroll halaman selama terbuka.
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        onCloseRef.current();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  function handleShutter() {
    const video = videoRef.current;
    if (!video || phase !== 'live') return;

    const { width, height } = fitWithin(video.videoWidth, video.videoHeight);
    if (!width || !height) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    setSnapshot(canvas.toDataURL('image/jpeg', CAPTURE_JPEG_QUALITY));
    video.pause();
    setPhase('captured');
  }

  function handleRetake() {
    setSnapshot(null);
    setPhase('live');
    void videoRef.current?.play().catch(() => undefined);
  }

  function handleUse() {
    if (!snapshot) return;
    onCapture(snapshot);
    onCloseRef.current();
  }

  if (!isOpen) return null;

  const mirrored = facing === 'user';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={FIXED_PALETTE}
      className="fixed inset-0 z-[70] flex flex-col bg-black text-white"
    >
      {/* Bar atas */}
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <button
          type="button"
          onClick={() => onCloseRef.current()}
          aria-label="Tutup kamera"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium">{title}</p>
        {canSwitch && phase === 'live' ? (
          <button
            type="button"
            onClick={() => setFacing((f) => nextFacing(f))}
            aria-label={facing === 'environment' ? 'Pakai kamera depan' : 'Pakai kamera belakang'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        ) : (
          <span className="h-10 w-10" aria-hidden="true" />
        )}
      </div>

      {/* Area kamera */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-contain ${mirrored ? '-scale-x-100' : ''} ${
            phase === 'captured' || phase === 'error' ? 'invisible' : ''
          }`}
        />

        {snapshot && phase === 'captured' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={snapshot}
            alt="Pratinjau foto bukti"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}

        {phase === 'starting' && (
          <p role="status" className="absolute text-sm text-white/70">
            Membuka kamera...
          </p>
        )}

        {phase === 'error' && (
          <div role="alert" className="absolute inset-x-6 max-w-sm mx-auto text-center">
            <p className="text-sm leading-relaxed text-white/90">{errorMsg}</p>
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              className="mt-5 inline-flex items-center justify-center rounded-card border border-white/40 px-4 py-2 text-sm font-medium hover:border-white transition-colors"
            >
              Kembali
            </button>
          </div>
        )}
      </div>

      {/* Kontrol bawah */}
      <div className="flex items-center justify-center gap-6 px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] min-h-[7.5rem]">
        {phase === 'captured' ? (
          <>
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-2 rounded-card border border-white/40 px-5 py-2.5 text-sm font-medium hover:border-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Ulangi
            </button>
            <button
              type="button"
              onClick={handleUse}
              autoFocus
              className="inline-flex items-center gap-2 rounded-card bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200 transition-colors"
            >
              <Check className="h-4 w-4" />
              Pakai foto
            </button>
          </>
        ) : phase === 'error' ? null : (
          <button
            ref={shutterRef}
            type="button"
            onClick={handleShutter}
            disabled={phase !== 'live'}
            aria-label="Jepret foto"
            className="h-[4.5rem] w-[4.5rem] rounded-full border-4 border-white p-1 disabled:opacity-40 transition-opacity focus-visible:outline-white"
          >
            <span className="block h-full w-full rounded-full bg-white active:bg-neutral-300 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}
