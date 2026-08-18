import { useEffect, useRef, useState } from 'react';

interface Props {
  onCaptured: (blob: Blob) => void;
  captured: boolean;
  onRetake: () => void;
}

export default function CameraCapture({ onCaptured, captured, onRetake }: Props) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (captured) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch {
        setCameraError('Camera access is required to attach photo evidence. Enable camera permission and try again.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [captured]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      setPreviewUrl(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach(t => t.stop());
      onCaptured(blob);
    }, 'image/jpeg', 0.85);
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onRetake();
  }

  return (
    <div className="space-y-2">
      {cameraError && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-xs p-2">{cameraError}</div>}
      {!cameraError && (
        <div className="rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
          {!captured && <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />}
          {captured && previewUrl && <img src={previewUrl} alt="Captured evidence" className="w-full h-full object-cover" />}
        </div>
      )}
      {!captured ? (
        <button type="button" onClick={takePhoto} disabled={!!cameraError} className="w-full bg-brand text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60">
          Capture Photo
        </button>
      ) : (
        <button type="button" onClick={retake} className="w-full bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-lg text-sm">
          Retake
        </button>
      )}
    </div>
  );
}
