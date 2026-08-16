import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { uploadPhoto } from '@/features/documents/documentService';

interface Props {
  actionLabel: string;
  permitId: string;
  onConfirmed: () => void;
  onCancel: () => void;
}

type Step = 'password' | 'camera';

export default function ReAuthModal({ actionLabel, permitId, onConfirmed, onCancel }: Props) {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (step !== 'camera' || captured) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch {
        setCameraError('Camera access is required to verify your identity for this action. Enable camera permission and try again.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [step, captured]);

  async function confirmPassword() {
    if (!profile || !password) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password });
    setBusy(false);
    if (error) {
      setError('Incorrect password.');
      return;
    }
    setStep('camera');
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      setCaptured(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.85);
  }

  function retake() {
    setCaptured(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function submitWithSelfie() {
    if (!profile || !captured) return;
    setBusy(true);
    setError(null);
    try {
      const file = new File([captured], `identity-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadPhoto({
        permit_id: permitId, file, caption: `Identity verification photo — ${actionLabel}`,
        related_table: 'identity_verification', taken_by: profile.id
      });
      onConfirmed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the verification photo.');
    } finally {
      setBusy(false);
    }
  }

  function cancelAll() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onCancel();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4 space-y-3">
        {step === 'password' && (
          <>
            <h2 className="text-sm font-semibold text-slate-700">Confirm your password to {actionLabel}</h2>
            <p className="text-xs text-slate-500">For accountability, this action requires your password and a live photo. Never share your login with anyone else.</p>
            <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmPassword()}
              placeholder="Password" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
            {error && <div className="text-danger text-xs">{error}</div>}
            <div className="flex gap-2">
              <button onClick={cancelAll} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmPassword} disabled={busy || !password} className="flex-1 bg-brand text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60">
                {busy ? 'Checking…' : 'Next'}
              </button>
            </div>
          </>
        )}

        {step === 'camera' && (
          <>
            <h2 className="text-sm font-semibold text-slate-700">Take a live photo to confirm it's you</h2>
            {cameraError && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-xs p-2">{cameraError}</div>}
            {!cameraError && (
              <div className="rounded-lg overflow-hidden bg-black aspect-square flex items-center justify-center">
                {!captured && <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />}
                {captured && previewUrl && <img src={previewUrl} alt="Captured" className="w-full h-full object-cover" />}
              </div>
            )}
            {error && <div className="text-danger text-xs">{error}</div>}
            <div className="flex gap-2">
              <button onClick={cancelAll} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-lg text-sm">Cancel</button>
              {!captured ? (
                <button onClick={takePhoto} disabled={!!cameraError} className="flex-1 bg-brand text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60">
                  Capture
                </button>
              ) : (
                <>
                  <button onClick={retake} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-lg text-sm">Retake</button>
                  <button onClick={submitWithSelfie} disabled={busy} className="flex-1 bg-success text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60">
                    {busy ? 'Saving…' : 'Confirm'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

