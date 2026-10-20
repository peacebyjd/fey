import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { VehiclePhoto } from '../../types';

interface CameraCaptureProps {
  photos: VehiclePhoto[];
  onPhotosChange: (photos: VehiclePhoto[]) => void;
  maxPhotos?: number;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 6,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [captionInput, setCaptionInput] = useState('');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access unavailable:', err);
      setCameraError(
        'Tablet camera could not be accessed directly. You can use the photo upload button below to attach vehicle images.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPreview(dataUrl);
      stopCamera();
    }
  };

  const confirmCapturedPhoto = () => {
    if (!capturedPreview) return;
    const newPhoto: VehiclePhoto = {
      id: `photo-${Date.now()}`,
      url: capturedPreview,
      caption: captionInput.trim() || 'Vehicle intake inspection photo',
      capturedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    onPhotosChange([...photos, newPhoto]);
    setCapturedPreview(null);
    setCaptionInput('');
  };

  const retakePhoto = () => {
    setCapturedPreview(null);
    startCamera(facingMode);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          const newPhoto: VehiclePhoto = {
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            url: event.target.result,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            capturedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
          onPhotosChange([...photos, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (id: string) => {
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-ink">
            Vehicle Inspection Photos ({photos.length}/{maxPhotos})
          </label>
          <p className="text-xs text-ink-muted">Capture damage, odometer, and engine bay on arrival</p>
        </div>
        <div className="flex items-center gap-2">
          {!isCameraActive && !capturedPreview && photos.length < maxPhotos && (
            <>
              <button
                type="button"
                onClick={() => startCamera()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] hover:bg-[#600018] rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Camera className="w-4 h-4" />
                <span>Open Tablet Camera</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-line hover:bg-sand/40 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="p-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
          {cameraError}
        </div>
      )}

      {/* Active Camera Viewfinder */}
      {isCameraActive && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-80 flex flex-col items-center justify-center border border-line">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Camera Controls Overlay */}
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-4 px-4 bg-gradient-to-t from-black/70 to-transparent py-2">
            <button
              type="button"
              onClick={toggleFacingMode}
              title="Flip camera"
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={takeSnapshot}
              className="px-6 py-2.5 rounded-full bg-[#800020] hover:bg-[#600018] text-white font-semibold text-sm flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>Capture Photo</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="p-2.5 rounded-full bg-ink/80 hover:bg-ink text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Captured Snapshot Confirmation */}
      {capturedPreview && (
        <div className="p-4 border border-line rounded-xl bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Confirm Captured Photo</span>
            <span className="text-xs text-ink-muted/70">Step 2 of 2</span>
          </div>
          <div className="aspect-video max-h-64 rounded-lg overflow-hidden bg-sand/50 border border-line">
            <img
              src={capturedPreview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              placeholder="Photo description (e.g., Front bumper scratch, Odometer 142k km)"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              className="flex-1 w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020]"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={retakePhoto}
                className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium text-ink bg-sand/50 hover:bg-sand rounded-lg cursor-pointer"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={confirmCapturedPhoto}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#600018] rounded-lg cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save to Job</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Gallery of Attached Photos */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative border border-line rounded-lg overflow-hidden bg-sand/40 shadow-xs"
            >
              <div className="aspect-4/3 overflow-hidden bg-sand">
                <img
                  src={photo.url}
                  alt={photo.caption || 'Vehicle photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              <div className="p-2">
                <p className="text-[11px] font-medium text-ink truncate" title={photo.caption}>
                  {photo.caption || 'Inspection photo'}
                </p>
                <p className="text-[10px] text-ink-muted/70 tabular-nums">{photo.capturedAt}</p>
              </div>
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                title="Remove photo"
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-ink/80 hover:bg-coral text-white transition-colors cursor-pointer shadow-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !isCameraActive &&
        !capturedPreview && (
          <div className="p-6 border border-dashed border-line rounded-xl flex flex-col items-center justify-center text-center bg-white/60">
            <ImageIcon className="w-8 h-8 text-ink-muted/70 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-ink">No vehicle photos captured yet</p>
            <p className="text-[11px] text-ink-muted/70 mt-0.5">
              Use the tablet camera or upload to record initial vehicle condition on arrival
            </p>
          </div>
        )
      )}
    </div>
  );
};
