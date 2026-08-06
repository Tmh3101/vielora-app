import { useState, useRef, useEffect } from "react";
import { VOICE_RECORDING_DURATION } from "@/config/voice-chat";

export function useAudioRecorder(maxDurationSeconds = VOICE_RECORDING_DURATION) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(maxDurationSeconds);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    chunksRef.current = [];
    setRecordingSeconds(maxDurationSeconds);
    setAudioBlob(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported("audio/ogg") ? "audio/ogg" : "audio/wav";
      }

      const recorder = new MediaRecorder(stream, { mimeType });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const handleTrackMuteOrEnd = () => {
          console.warn("Microphone bị ngắt kết nối hoặc mute do xung đột thiết bị.");
          setError("Microphone đã bị ngắt (do xung đột với quay màn hình hoặc ứng dụng khác).");
          stopRecording();
        };
        track.onmute = handleTrackMuteOrEnd;
        track.onended = handleTrackMuteOrEnd;
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = (e) => {
        console.error("Lỗi MediaRecorder:", e);
        setError("Lỗi thiết bị ghi âm trong quá trình thu.");
        stopRecording();
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 100) {
          setError(
            "Không thể ghi nhận âm thanh (Microphone không truyền dữ liệu hoặc đang bị dùng bởi ứng dụng khác)."
          );
          setAudioBlob(null);
        } else {
          setAudioBlob(blob);
        }
        stream.getTracks().forEach((track) => track.stop()); // Tắt phần cứng Micro
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);

      let elapsedSeconds = 0;
      setRecordingSeconds(maxDurationSeconds);
      timerRef.current = setInterval(() => {
        elapsedSeconds += 1;
        const remaining = Math.max(0, maxDurationSeconds - elapsedSeconds);
        setRecordingSeconds(remaining);
        if (elapsedSeconds >= maxDurationSeconds) {
          stopRecording(); // Tự động ngắt khi chạm ngưỡng 30 giây
        }
      }, 1000);
    } catch (err: unknown) {
      console.error("Không thể truy cập Microphone:", err);
      const errorName = err instanceof DOMException ? err.name : "";
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setError(
          "Vui lòng cấp quyền truy cập Microphone trong cài đặt trình duyệt để sử dụng tính năng này."
        );
      } else if (
        errorName === "NotReadableError" ||
        errorName === "TrackStartError" ||
        errorName === "AbortError"
      ) {
        setError(
          "Microphone đang được sử dụng bởi tính năng khác (như quay màn hình, cuộc gọi). Vui lòng dừng ứng dụng đang chiếm mic và thử lại."
        );
      } else {
        setError("Không thể khởi động thiết bị ghi âm. Vui lòng kiểm tra Microphone.");
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    isRecording,
    audioBlob,
    recordingSeconds,
    error,
    startRecording,
    stopRecording,
  };
}
