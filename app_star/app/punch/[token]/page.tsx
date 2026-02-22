"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AttendanceZoneStatus } from "@prisma/client";
import { buildRawPayload, resolveZone, type PunchConfig } from "@/lib/attendance/punchLogic";

type PunchConfigResponse = {
  siteId: string;
  employeeId?: string | null;
  rules: {
    lat: number;
    lng: number;
    radiusMeters: number;
    allowOutOfZone: boolean;
    requirePhoto: boolean;
    requireLiveness: "OFF" | "BASIC" | "PROVIDER";
    windowBeforeMinutes: number;
    windowAfterMinutes: number;
    antiPassback: boolean;
    allowedSources: string[];
  };
};

type LocationState = { lat: number; lng: number; accuracy?: number; zone: AttendanceZoneStatus; distance: number } | null;

const statusTone: Record<AttendanceZoneStatus, { label: string; color: string }> = {
  IN_ZONE: { label: "En zona", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  OUT_OF_ZONE: { label: "Fuera de zona", color: "text-rose-700 bg-rose-50 border-rose-200" },
  UNKNOWN: { label: "Sin ubicación", color: "text-amber-700 bg-amber-50 border-amber-200" }
};

export default function PunchPage() {
  const params = useParams();
  const token = params?.token as string;
  const [config, setConfig] = useState<PunchConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<LocationState>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ status: "success" | "warning" | "error"; message: string } | null>(null);
  const [selectedType, setSelectedType] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchConfig = useCallback(async () => {
    setConfigError(null);
    try {
      const res = await fetch(`/api/attendance/punch-config/${token}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Link inválido o expirado");
      const json = await res.json();
      const data = json.data as PunchConfigResponse;
      if (!data?.siteId || !data?.rules) throw new Error("Link inválido o expirado");
      setConfig({
        siteId: data.siteId,
        lat: data.rules.lat,
        lng: data.rules.lng,
        radiusMeters: data.rules.radiusMeters,
        allowOutOfZone: data.rules.allowOutOfZone,
        requirePhoto: data.rules.requirePhoto,
        requireLiveness: data.rules.requireLiveness,
        windowBeforeMinutes: data.rules.windowBeforeMinutes,
        windowAfterMinutes: data.rules.windowAfterMinutes,
        antiPassback: data.rules.antiPassback,
        allowedSources: data.rules.allowedSources || []
      });
    } catch (err: any) {
      setConfigError(err?.message || "Link inválido o expirado");
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [fetchConfig]);

  useEffect(() => {
    if (!config) return;
    if (!navigator.geolocation) {
      setGeoError("GPS no disponible");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const { zone, distance } = resolveZone(
          { lat: config.lat, lng: config.lng, radiusMeters: config.radiusMeters },
          { lat: latitude, lng: longitude }
        );
        setLocationState({ lat: latitude, lng: longitude, accuracy: accuracy || undefined, zone, distance });
        setGeoError(null);
      },
      () => setGeoError("No pudimos obtener tu ubicación"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [config]);

  const initCamera = useCallback(async () => {
    setCameraError(null);
    if (!config?.requirePhoto) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Cámara no disponible");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError(err?.message || "No se pudo abrir la cámara");
    }
  }, [config?.requirePhoto]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.8);
    setPhotoData(data);
  };

  useEffect(() => {
    if (config?.requirePhoto) {
      initCamera();
    }
  }, [config?.requirePhoto, initCamera]);

  const handlePunch = async () => {
    if (sending) return;
    if (!config) return;
    setSending(true);
    setResult(null);
    if (configError) return;
    if (!locationState) {
      setResult({ status: "error", message: geoError || "GPS requerido" });
      setSending(false);
      return;
    }
    const employeeId = (employeeIdInput || "").trim();
    const resolvedEmployeeId = config.employeeId || employeeId;
    if (!resolvedEmployeeId) {
      setResult({ status: "error", message: "Empleado requerido" });
      setSending(false);
      return;
    }
    try {
      const payload = buildRawPayload({
        config,
        employeeId: resolvedEmployeeId,
        location: locationState,
        zone: locationState.zone,
        type: selectedType,
        photoBase64: photoData,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
      });

      const res = await fetch("/api/hr/attendance/raw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-INGEST-KEY": token
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "No se pudo registrar marcaje");
      }
      setResult({
        status: locationState.zone === "OUT_OF_ZONE" ? "warning" : "success",
        message: locationState.zone === "OUT_OF_ZONE" ? "Marcaje registrado fuera de zona" : "Marcaje registrado"
      });
    } catch (err: any) {
      setResult({ status: "error", message: err?.message || "No se pudo registrar" });
    } finally {
      setSending(false);
    }
  };

  const ready = useMemo(() => {
    if (!config || !locationState) return false;
    if (config.requirePhoto && (!photoData || cameraError)) return false;
    if (!config.employeeId && !employeeIdInput.trim()) return false;
    return true;
  }, [config, locationState, photoData, cameraError, employeeIdInput]);

  const badge = (zone: AttendanceZoneStatus) => (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${statusTone[zone].color}`}>{statusTone[zone].label}</span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center font-semibold shadow">SM</div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">StarMedical</p>
            <h1 className="text-xl font-semibold text-white">Marcaje</h1>
          </div>
        </div>

        {configError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50/80 px-4 py-3 text-rose-800">
            <p className="font-semibold">Link inválido o expirado</p>
            <p className="text-sm">{configError}</p>
          </div>
        )}

        {!configError && (
          <div className="space-y-4 rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Site</p>
                <p className="text-base font-semibold text-white">{config?.siteId || "Cargando..."}</p>
              </div>
              {locationState && badge(locationState.zone)}
            </div>

            <div className="space-y-2 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <p className="text-sm font-semibold text-white">Estado</p>
              <p className="text-xs text-white/70">
                GPS: {geoError ? <span className="text-amber-300">{geoError}</span> : locationState ? `${locationState.distance}m del punto` : "Solicitando ubicación..."}
              </p>
              <p className="text-xs text-white/70">
                Cámara:{" "}
                {config?.requirePhoto
                  ? cameraError
                    ? <span className="text-amber-300">{cameraError}</span>
                    : photoData
                      ? "Captura lista"
                      : "Abriendo cámara..."
                  : "No requerida"}
              </p>
            </div>

            {config?.requirePhoto && (
              <div className="space-y-3 rounded-xl bg-black/40 p-3 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-white">Selfie</p>
                <video ref={videoRef} className="w-full rounded-lg border border-white/10 bg-black/30" playsInline autoPlay muted />
                <div className="flex items-center gap-2">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100"
                    disabled={!!cameraError}
                  >
                    Capturar
                  </button>
                  {photoData && <span className="text-xs text-emerald-200">Selfie lista</span>}
                </div>
              </div>
            )}

            {!config?.employeeId && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Empleado</p>
                <input
                  type="text"
                  value={employeeIdInput}
                  onChange={(e) => setEmployeeIdInput(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50"
                  placeholder="ID de empleado"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {["CHECK_IN", "CHECK_OUT"].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type as any)}
                  className={`rounded-lg px-4 py-3 text-sm font-semibold shadow ${
                    selectedType === type ? "bg-emerald-400 text-emerald-900" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {type === "CHECK_IN" ? "Marcar entrada" : "Marcar salida"}
                </button>
              ))}
            </div>

            <button
              onClick={handlePunch}
              disabled={!ready || sending}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 disabled:opacity-60"
            >
              {sending ? "Enviando..." : "Registrar marcaje"}
            </button>

            {result && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  result.status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : result.status === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {result.message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
