import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import Webcam from 'react-webcam';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type LatestPrediction = {
  rep_index: number;
  predicted_label: string;
  confidence: number;
  probabilities?: Record<string, number>;
  features: Record<string, number | string>;
};

type LiveEvent = {
  event: string;
  frame_id?: number;
  rep_count: number;
  state: string;
  smoothed_elbow_angle?: number | null;
  smoothed_knee_angle?: number | null;
  latest_prediction?: LatestPrediction;
  camera_angle?: string;
  landmarks?: Record<string, [number, number]>;
};

type CoachingResponse = {
  exercise: string;
  predicted_label: string;
  provider: string;
  model: string;
  summary: string;
  priority: string;
  cues: string[];
  safety_note?: string | null;
};

type VideoPredictionResponse = {
  rep_count: number;
  predictions: LatestPrediction[];
  frames: Array<{
    frame_idx: number;
    timestamp_sec: number;
    landmarks: Record<string, [number, number]>;
  }>;
};

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://127.0.0.1:8000';
const PUSHUP_WS_URL =
  import.meta.env.VITE_PUSHUP_WS_URL ?? 'ws://127.0.0.1:8000/ws/live/pushup';
const SQUAT_WS_URL =
  import.meta.env.VITE_SQUAT_WS_URL ?? 'ws://127.0.0.1:8000/ws/live/squat';

const exercises = ['Push-ups', 'Squats', 'Bicep Curl', 'Dumbbell Lat Raise'];
const POSE_CONNECTIONS: Array<[string, string]> = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

function formatTrackerState(state: string) {
  switch (state) {
    case 'waiting_top':
      return 'Waiting for top position';
    case 'descending':
      return 'Tracking current rep';
    default:
      return state;
  }
}

function buildFeedbackMessages(
  exercise: string,
  prediction: LatestPrediction | null,
  quality: number,
  trackerState: string,
  subscription: 'basic' | 'premium' | undefined,
): string[] {
  if (exercise !== 'Push-ups') {
    if (exercise !== 'Squats') {
      return ['Live backend tracking is currently enabled for push-ups and squats only.'];
    }
  }

  if (!prediction) {
    return [`Tracker: ${formatTrackerState(trackerState)}`];
  }

  const messages: string[] = [];
  if (quality >= 85) {
    messages.push('Correct rep detected.');
  } else if (quality >= 65) {
    messages.push('Rep detected with moderate confidence.');
  } else {
    messages.push('Rep detected with low confidence. Check your angle and framing.');
  }

  if (exercise === 'Push-ups') {
    switch (prediction.predicted_label) {
      case 'correct':
        messages.push('Form looks solid. Keep the same tempo and body line.');
        break;
      case 'shallow':
        messages.push('Go lower on the next rep to improve depth.');
        break;
      case 'hips_sagging':
        messages.push('Brace your core and keep your hips from dropping.');
        break;
      case 'fatigue':
        messages.push('Form is deteriorating. Slow down or stop the set soon.');
        break;
      default:
        messages.push(`Prediction: ${prediction.predicted_label}`);
    }
  } else if (exercise === 'Squats') {
    switch (prediction.predicted_label) {
      case 'correct':
        messages.push('Depth and posture look stable. Keep the same rhythm.');
        break;
      case 'shallow':
        messages.push('Sit deeper on the next rep to reach better squat depth.');
        break;
      case 'forward_lean':
        messages.push('Keep your chest up and reduce your forward torso lean.');
        break;
      case 'knees_in':
        messages.push('Drive your knees outward and keep them tracking over your feet.');
        break;
      default:
        messages.push(`Prediction: ${prediction.predicted_label}`);
    }
  }

  if (subscription === 'premium') {
    messages.push(
      exercise === 'Squats'
        ? 'Premium coaching: aim for controlled top-bottom-top cycles with stable knee tracking.'
        : 'Premium coaching: aim for smooth top-bottom-top cycles with stable hip height.',
    );
  }

  return messages;
}

function aggregateSessionPredictions(predictions: LatestPrediction[]) {
  if (predictions.length === 0) {
    return null;
  }

  const labelCounts: Record<string, number> = {};
  const numericSums: Record<string, number> = {};
  const numericCounts: Record<string, number> = {};
  let confidenceTotal = 0;

  for (const prediction of predictions) {
    labelCounts[prediction.predicted_label] = (labelCounts[prediction.predicted_label] ?? 0) + 1;
    confidenceTotal += prediction.confidence;

    Object.entries(prediction.features).forEach(([key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        numericSums[key] = (numericSums[key] ?? 0) + value;
        numericCounts[key] = (numericCounts[key] ?? 0) + 1;
      }
    });
  }

  const dominantLabel = Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? predictions[predictions.length - 1].predicted_label;
  const meanFeatures: Record<string, number | string> = {};
  Object.entries(numericSums).forEach(([key, sum]) => {
    const count = numericCounts[key] ?? 1;
    meanFeatures[key] = sum / count;
  });

  meanFeatures.rep_count = predictions.length;
  meanFeatures.dominant_issue_count = labelCounts[dominantLabel] ?? 0;

  return {
    rep_index: predictions[predictions.length - 1].rep_index,
    predicted_label: dominantLabel,
    confidence: confidenceTotal / predictions.length,
    features: meanFeatures,
    sensor_context: {
      session_rep_count: predictions.length,
      label_distribution: JSON.stringify(labelCounts),
      session_mean_confidence: confidenceTotal / predictions.length,
    },
  };
}

export function LiveTraining() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, addExerciseSession } = useAuth();

  const webcamRef = useRef<Webcam>(null);
  const uploadedVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const frameIdRef = useRef(0);
  const sessionStartRef = useRef<number>(0);
  const isTrackingRef = useRef(false);
  const predictionHistoryRef = useRef<LatestPrediction[]>([]);

  const [selectedExercise, setSelectedExercise] = useState(location.state?.exercise || 'Push-ups');
  const [useWebcam, setUseWebcam] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedVideoAspectRatio, setUploadedVideoAspectRatio] = useState<number>(16 / 9);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [currentQuality, setCurrentQuality] = useState(0);
  const [feedbackMessages, setFeedbackMessages] = useState<string[]>([]);
  const [trackerState, setTrackerState] = useState('waiting_top');
  const [latestPrediction, setLatestPrediction] = useState<LatestPrediction | null>(null);
  const [liveLandmarks, setLiveLandmarks] = useState<Record<string, [number, number]>>({});
  const [uploadedFrames, setUploadedFrames] = useState<VideoPredictionResponse['frames']>([]);
  const [uploadedLandmarks, setUploadedLandmarks] = useState<Record<string, [number, number]>>({});
  const [smoothedPrimaryAngle, setSmoothedPrimaryAngle] = useState<number | null>(null);
  const [coachResponse, setCoachResponse] = useState<CoachingResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [backendError, setBackendError] = useState<string>('');
  const [uploadProcessing, setUploadProcessing] = useState(false);

  const stopFrameLoop = () => {
    if (frameIntervalRef.current !== null) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  };

  const closeSocket = () => {
    stopFrameLoop();
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnectionStatus('disconnected');
  };

  useEffect(() => {
    return () => {
      closeSocket();
    };
  }, []);

  useEffect(() => {
    if (!uploadedFile) {
      setUploadedVideoUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
      return;
    }

    const nextUrl = URL.createObjectURL(uploadedFile);
    setUploadedVideoUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return nextUrl;
    });

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [uploadedFile]);

  useEffect(() => {
    const quality = latestPrediction ? Math.round(latestPrediction.confidence * 100) : 0;
    setCurrentQuality(quality);
    setFeedbackMessages(
      buildFeedbackMessages(
        selectedExercise,
        latestPrediction,
        quality,
        trackerState,
        user?.subscription,
      ),
    );
  }, [latestPrediction, selectedExercise, trackerState, user?.subscription]);

  const requestCoaching = async (
    prediction: LatestPrediction,
    sensorContext: Record<string, number | string> | null = null,
  ) => {
    const exerciseSlug = selectedExercise === 'Squats' ? 'squat' : 'pushup';
    setCoachLoading(true);
    setCoachError('');
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/coach/guidance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            exercise: exerciseSlug,
            rep_index: prediction.rep_index,
            predicted_label: prediction.predicted_label,
            confidence: prediction.confidence,
            features: prediction.features,
            sensor_context: sensorContext,
          }),
        });

      if (!response.ok) {
        throw new Error(`Coaching request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as CoachingResponse;
      setCoachResponse(payload);
    } catch (error) {
      setCoachError(error instanceof Error ? error.message : 'Unable to load coaching guidance.');
    } finally {
      setCoachLoading(false);
    }
  };

  const syncUploadedOverlay = () => {
    const video = uploadedVideoRef.current;
    if (!video || uploadedFrames.length === 0) {
      setUploadedLandmarks({});
      return;
    }

    const currentTime = video.currentTime;
    let bestFrame = uploadedFrames[0];
    let bestDistance = Math.abs(bestFrame.timestamp_sec - currentTime);

    for (let index = 1; index < uploadedFrames.length; index += 1) {
      const candidate = uploadedFrames[index];
      const distance = Math.abs(candidate.timestamp_sec - currentTime);
      if (distance < bestDistance) {
        bestFrame = candidate;
        bestDistance = distance;
      }
    }

    setUploadedLandmarks(bestFrame?.landmarks ?? {});
  };

  const handleUploadedVideoMetadata = () => {
    const video = uploadedVideoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      setUploadedVideoAspectRatio(video.videoWidth / video.videoHeight);
    }
    syncUploadedOverlay();
  };

  const runUploadedVideoAnalysis = async () => {
    if (!uploadedFile) {
      setBackendError('Choose a video file before starting upload analysis.');
      return;
    }

    if (selectedExercise !== 'Push-ups' && selectedExercise !== 'Squats') {
      setBackendError('Video analysis is currently enabled for push-ups and squats only.');
      return;
    }

    const exerciseSlug = selectedExercise === 'Squats' ? 'squat' : 'pushup';
    const formData = new FormData();
    formData.append('file', uploadedFile);

    setUploadProcessing(true);
    setBackendError('');
    setCoachError('');
    setCoachResponse(null);
    setSessionComplete(false);
    setRepCount(0);
    setLatestPrediction(null);
    setCurrentQuality(0);
    predictionHistoryRef.current = [];
    setUploadedFrames([]);
    setUploadedLandmarks({});

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/predict/${exerciseSlug}/video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Video analysis failed with status ${response.status}`);
      }

      const payload = (await response.json()) as VideoPredictionResponse;
      const predictions = payload.predictions ?? [];
      const frames = payload.frames ?? [];
      predictionHistoryRef.current = predictions;
      setRepCount(payload.rep_count ?? predictions.length);
      setUploadedFrames(frames);

      const lastPrediction = predictions[predictions.length - 1] ?? null;
      setLatestPrediction(lastPrediction);

      const sessionSummary = aggregateSessionPredictions(predictions);
      if (sessionSummary) {
        setCurrentQuality(Math.round(sessionSummary.confidence * 100));
        await requestCoaching(sessionSummary, sessionSummary.sensor_context);
      } else {
        setCurrentQuality(0);
      }

      setTrackerState('upload_complete');
      setSessionComplete(true);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'Unable to analyze uploaded video.');
    } finally {
      setUploadProcessing(false);
    }
  };

  const handleSocketMessage = (raw: MessageEvent<string>) => {
    const payload = JSON.parse(raw.data) as LiveEvent;
    setRepCount(payload.rep_count);
    setTrackerState(payload.state);
    setLiveLandmarks(payload.landmarks ?? {});
    setSmoothedPrimaryAngle(
      selectedExercise === 'Squats'
        ? (payload.smoothed_knee_angle ?? null)
        : (payload.smoothed_elbow_angle ?? null),
    );

    if (
      payload.latest_prediction &&
      payload.latest_prediction.rep_index !== latestPrediction?.rep_index
    ) {
      setLatestPrediction(payload.latest_prediction);
      predictionHistoryRef.current = [
        ...predictionHistoryRef.current.filter(
          (prediction) => prediction.rep_index !== payload.latest_prediction!.rep_index,
        ),
        payload.latest_prediction,
      ].sort((left, right) => left.rep_index - right.rep_index);
    }
  };

  const sendCurrentFrame = () => {
    const websocket = socketRef.current;
    const webcam = webcamRef.current;
    if (!websocket || websocket.readyState !== WebSocket.OPEN || !webcam) {
      return;
    }

    const imageBase64 = webcam.getScreenshot();
    if (!imageBase64) {
      return;
    }

    websocket.send(
      JSON.stringify({
        frame_id: frameIdRef.current,
        timestamp_sec: (performance.now() - sessionStartRef.current) / 1000,
        image_base64: imageBase64,
        camera_angle: 'side',
      }),
    );
    frameIdRef.current += 1;
  };

  const openSocket = () => {
    setBackendError('');
    setConnectionStatus('connecting');

    const websocket = new WebSocket(
      selectedExercise === 'Squats' ? SQUAT_WS_URL : PUSHUP_WS_URL,
    );
    socketRef.current = websocket;

    websocket.onopen = () => {
      setConnectionStatus('connected');
      sessionStartRef.current = performance.now();
      frameIdRef.current = 0;
      stopFrameLoop();
      frameIntervalRef.current = window.setInterval(sendCurrentFrame, 300);
    };

    websocket.onmessage = handleSocketMessage;

    websocket.onerror = () => {
      setConnectionStatus('error');
      setBackendError('Unable to stream to the backend websocket.');
    };

    websocket.onclose = () => {
      stopFrameLoop();
      if (isTrackingRef.current) {
        setConnectionStatus('error');
        setBackendError('The live websocket connection was closed.');
      } else {
        setConnectionStatus('disconnected');
      }
    };
  };

  const handleStartTracking = () => {
    if (selectedExercise !== 'Push-ups' && selectedExercise !== 'Squats') {
      setBackendError('Video analysis is currently enabled for push-ups and squats only.');
      return;
    }

    setRepCount(0);
    setCurrentQuality(0);
    setLatestPrediction(null);
    setLiveLandmarks({});
    setUploadedFrames([]);
    setUploadedLandmarks({});
    predictionHistoryRef.current = [];
    setSmoothedPrimaryAngle(null);
    setCoachResponse(null);
    setCoachError('');
    setCoachLoading(false);
    setTrackerState('waiting_top');
    setSessionComplete(false);
    if (!useWebcam) {
      void runUploadedVideoAnalysis();
      return;
    }

    setIsTracking(true);
    isTrackingRef.current = true;
    openSocket();
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    closeSocket();
    if (repCount > 0) {
      const sessionSummary = aggregateSessionPredictions(predictionHistoryRef.current);
      addExerciseSession({
        exercise: selectedExercise,
        date: new Date(),
        reps: repCount,
        quality: sessionSummary ? Math.round(sessionSummary.confidence * 100) : currentQuality,
        drift: Number(
          selectedExercise === 'Squats'
            ? (sessionSummary?.features?.mean_torso_angle ?? latestPrediction?.features?.mean_torso_angle ?? 0)
            : (sessionSummary?.features?.mean_body_alignment_error ?? latestPrediction?.features?.mean_body_alignment_error ?? 0),
        ),
      });
      setSessionComplete(true);
      if (sessionSummary) {
        void requestCoaching(sessionSummary, sessionSummary.sensor_context);
      }
    }
  };

  const handleReset = () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    closeSocket();
    setRepCount(0);
    setCurrentQuality(0);
    setFeedbackMessages([]);
    setLatestPrediction(null);
    setLiveLandmarks({});
    predictionHistoryRef.current = [];
    setSmoothedPrimaryAngle(null);
    setCoachResponse(null);
    setCoachError('');
    setCoachLoading(false);
    setTrackerState('waiting_top');
    setBackendError('');
    setSessionComplete(false);
    setUploadedFile(null);
    setUploadedVideoUrl(null);
    setUploadedVideoAspectRatio(16 / 9);
    setUploadProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUseWebcam(false);
      setUploadedFile(file);
      setBackendError('');
    }
  };

  const connectionBadge =
    connectionStatus === 'connected' ? (
      <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
        <Wifi className="h-3.5 w-3.5" />
        Backend Connected
      </Badge>
    ) : connectionStatus === 'connecting' ? (
      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
        <Wifi className="h-3.5 w-3.5" />
        Connecting
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <WifiOff className="h-3.5 w-3.5" />
        Backend Offline
      </Badge>
    );

  const angleMetricLabel = selectedExercise === 'Squats' ? 'Knee Angle' : 'Elbow Angle';
  const cameraCardDescription =
    selectedExercise === 'Squats'
      ? 'Side-view squat tracking through the FastAPI backend'
      : 'Side-view push-up tracking through the FastAPI backend';
  const latestPredictionEmptyText =
    selectedExercise === 'Squats'
      ? 'No completed squat prediction yet.'
      : 'No completed rep prediction yet.';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl">Live Training</h1>
          </div>
          <div className="flex items-center gap-3">
            {connectionBadge}
            <Badge variant={user?.subscription === 'premium' ? 'default' : 'secondary'}>
              {user?.subscription === 'premium' ? 'AI Coaching Active' : 'Basic Mode'}
            </Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Camera Feed</CardTitle>
                  <CardDescription>{cameraCardDescription}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={useWebcam ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseWebcam(true)}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Webcam
                  </Button>
                  <label>
                    <Button variant={!useWebcam ? 'default' : 'outline'} size="sm" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                {useWebcam ? (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      mirrored
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.7}
                      className="h-full w-full object-cover"
                      videoConstraints={{
                        facingMode: 'user',
                      }}
                    />
                    {Object.keys(liveLandmarks).length > 0 ? (
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{ transform: 'scaleX(-1)' }}
                      >
                        {POSE_CONNECTIONS.map(([startKey, endKey]) => {
                          const startPoint = liveLandmarks[startKey];
                          const endPoint = liveLandmarks[endKey];
                          if (!startPoint || !endPoint) {
                            return null;
                          }
                          return (
                            <line
                              key={`${startKey}-${endKey}`}
                              x1={startPoint[0] * 100}
                              y1={startPoint[1] * 100}
                              x2={endPoint[0] * 100}
                              y2={endPoint[1] * 100}
                              stroke="rgba(34,197,94,0.9)"
                              strokeWidth="0.8"
                            />
                          );
                        })}
                        {Object.entries(liveLandmarks).map(([landmarkName, [x, y]]) => (
                          <circle
                            key={landmarkName}
                            cx={x * 100}
                            cy={y * 100}
                            r="1"
                            fill="rgba(59,130,246,0.95)"
                            stroke="white"
                            strokeWidth="0.25"
                          />
                        ))}
                      </svg>
                    ) : null}
                  </>
                ) : (
                  uploadedVideoUrl ? (
                    <>
                      <video
                        ref={uploadedVideoRef}
                        src={uploadedVideoUrl}
                        controls
                        onTimeUpdate={syncUploadedOverlay}
                        onSeeked={syncUploadedOverlay}
                        onLoadedMetadata={handleUploadedVideoMetadata}
                        className="h-full w-full object-contain"
                      />
                      {Object.keys(uploadedLandmarks).length > 0 ? (
                        <svg
                          className="pointer-events-none absolute inset-0 h-full w-full"
                          viewBox={`0 0 ${uploadedVideoAspectRatio} 1`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {POSE_CONNECTIONS.map(([startKey, endKey]) => {
                            const startPoint = uploadedLandmarks[startKey];
                            const endPoint = uploadedLandmarks[endKey];
                            if (!startPoint || !endPoint) {
                              return null;
                            }
                            return (
                              <line
                                key={`${startKey}-${endKey}`}
                                x1={startPoint[0] * uploadedVideoAspectRatio}
                                y1={startPoint[1]}
                                x2={endPoint[0] * uploadedVideoAspectRatio}
                                y2={endPoint[1]}
                                stroke="rgba(34,197,94,0.9)"
                                strokeWidth="0.008"
                              />
                            );
                          })}
                          {Object.entries(uploadedLandmarks).map(([landmarkName, [x, y]]) => (
                            <circle
                              key={landmarkName}
                              cx={x * uploadedVideoAspectRatio}
                              cy={y}
                              r="0.01"
                              fill="rgba(59,130,246,0.95)"
                              stroke="white"
                              strokeWidth="0.0025"
                            />
                          ))}
                        </svg>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white">
                      <div className="text-center">
                        <Upload className="mx-auto mb-2 h-12 w-12 opacity-50" />
                        <p>Choose a video to analyze.</p>
                      </div>
                    </div>
                  )
                )}

                {isTracking && (
                  <div className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-sm text-white">
                    Live Tracking
                  </div>
                )}

                {useWebcam ? (
                  <>
                    <div className="absolute right-4 top-4 rounded-lg bg-black/70 px-5 py-3 text-white">
                      <div className="text-sm opacity-70">Reps</div>
                      <div className="text-4xl">{repCount}</div>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/70 p-4 text-white">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>Prediction Confidence</span>
                        <span>{currentQuality}%</span>
                      </div>
                      <Progress value={currentQuality} className="h-2" />
                      <div className="mt-3 flex flex-wrap gap-4 text-xs opacity-80">
                        <span>State: {formatTrackerState(trackerState)}</span>
                        <span>
                          {angleMetricLabel}:{' '}
                          {smoothedPrimaryAngle !== null ? `${Math.round(smoothedPrimaryAngle)}°` : 'N/A'}
                        </span>
                        <span>
                          Latest Label: {latestPrediction?.predicted_label ?? 'No completed rep yet'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {backendError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {backendError}
                </div>
              ) : null}

              {!useWebcam ? (
                <div className="mt-4 rounded-lg border bg-white p-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-gray-700">
                    <span>Prediction Confidence</span>
                    <span>{currentQuality}%</span>
                  </div>
                  <Progress value={currentQuality} className="h-2" />
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                    <span>State: {formatTrackerState(trackerState)}</span>
                    <span>
                      {angleMetricLabel}:{' '}
                      {smoothedPrimaryAngle !== null ? `${Math.round(smoothedPrimaryAngle)}°` : 'N/A'}
                    </span>
                    <span>
                      Latest Label: {latestPrediction?.predicted_label ?? 'No completed rep yet'}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                {!isTracking ? (
                  <Button onClick={handleStartTracking} className="flex-1">
                    <Play className="mr-2 h-4 w-4" />
                    {useWebcam ? 'Start Tracking' : uploadProcessing ? 'Analyzing Video...' : 'Analyze Video'}
                  </Button>
                ) : (
                  <Button onClick={handleStopTracking} variant="destructive" className="flex-1">
                    <Pause className="mr-2 h-4 w-4" />
                    Stop Tracking
                  </Button>
                )}
                <Button onClick={handleReset} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {sessionComplete ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-900">Session Saved</h3>
                    <p className="text-sm text-green-700">
                      {repCount} reps recorded with {currentQuality}% latest confidence.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Exercise</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((exercise) => (
                    <SelectItem key={exercise} value={exercise}>
                      {exercise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-3 text-xs text-gray-500">
                Live tracking and uploaded-video analysis are currently implemented for push-ups and squats.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-time Feedback</CardTitle>
              <CardDescription>Rule-based live feedback from backend predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {feedbackMessages.length > 0 ? (
                  feedbackMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`rounded-lg p-3 text-sm ${
                        message.toLowerCase().includes('correct') || message.toLowerCase().includes('solid')
                          ? 'bg-green-100 text-green-800'
                          : message.toLowerCase().includes('low confidence') ||
                              message.toLowerCase().includes('placeholder')
                            ? 'bg-yellow-100 text-yellow-800'
                            : message.toLowerCase().includes('dropping') ||
                                message.toLowerCase().includes('lower') ||
                                message.toLowerCase().includes('deteriorating')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {message}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-400">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p className="text-sm">Start tracking to receive backend feedback.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Coaching</CardTitle>
              <CardDescription>LLM guidance generated from CV features and form predictions</CardDescription>
            </CardHeader>
            <CardContent>
              {coachLoading ? (
                <p className="text-sm text-gray-500">Generating coaching guidance...</p>
              ) : coachError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {coachError}
                </div>
              ) : coachResponse ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{coachResponse.summary}</p>
                    <p className="mt-1 text-gray-600">{coachResponse.priority}</p>
                  </div>
                  <div className="space-y-2">
                    {coachResponse.cues.map((cue, index) => (
                      <div key={index} className="rounded-lg bg-blue-50 px-3 py-2 text-blue-900">
                        {cue}
                      </div>
                    ))}
                  </div>
                  {coachResponse.safety_note ? (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                      {coachResponse.safety_note}
                    </div>
                  ) : null}
                  <div className="text-xs text-gray-500">
                    Source: {coachResponse.provider === 'openai' ? coachResponse.model : 'Fallback coaching'}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">End the session to generate coaching guidance.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest Prediction</CardTitle>
            </CardHeader>
            <CardContent>
              {latestPrediction ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Rep</span>
                    <span>{latestPrediction.rep_index}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Label</span>
                    <Badge>{latestPrediction.predicted_label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Confidence</span>
                    <span>{Math.round(latestPrediction.confidence * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-600">
                    <div className="rounded-md bg-gray-100 p-2">
                      Min angle:{' '}
                      {Math.round(
                        Number(
                          selectedExercise === 'Squats'
                            ? (latestPrediction.features.min_knee_angle ?? 0)
                            : (latestPrediction.features.min_elbow_angle ?? 0),
                        ),
                      )}
                      °
                    </div>
                    <div className="rounded-md bg-gray-100 p-2">
                      Angle drop: {Math.round(Number(latestPrediction.features.angle_drop ?? 0))}°
                    </div>
                    <div className="rounded-md bg-gray-100 p-2">
                      Duration: {Number(latestPrediction.features.rep_duration_sec ?? 0).toFixed(2)}s
                    </div>
                    <div className="rounded-md bg-gray-100 p-2">
                      {selectedExercise === 'Squats'
                        ? `Torso angle: ${Number(latestPrediction.features.mean_torso_angle ?? 0).toFixed(1)}`
                        : `Alignment err: ${Number(latestPrediction.features.mean_body_alignment_error ?? 0).toFixed(1)}`}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{latestPredictionEmptyText}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedExercise === 'Squats' ? 'Squat Guide' : 'Push-up Guide'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {selectedExercise === 'Squats' ? (
                  <>
                    <p>1. Place the camera at your side so your hips, knees, and ankles stay visible.</p>
                    <p>2. Start in a full standing position before the first rep.</p>
                    <p>3. Sit down and stand up with controlled tempo on each rep.</p>
                    <p>4. Keep your knees tracking over your feet and avoid excessive forward lean.</p>
                  </>
                ) : (
                  <>
                    <p>1. Place the camera at your side so your full body is visible.</p>
                    <p>2. Start in a clear top plank position before the first rep.</p>
                    <p>3. Keep your body in one line as you lower and press back up.</p>
                    <p>4. Pause after each set so the app can save the session cleanly.</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
