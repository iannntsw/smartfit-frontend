import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import Webcam from 'react-webcam';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Copy,
  Pause,
  Play,
  RotateCcw,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { clearWorkoutSetResult, getWorkoutSetResult, markCompletedWorkoutSet, saveWorkoutSetResult } from '../lib/startWorkoutSession';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';


type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type LatestPrediction = {
  rep_index: number;
  predicted_label: string;
  confidence: number;
  probabilities?: Record<string, number>;
  features: Record<string, number | string>;
};

type SensorTracePoint = {
  timestamp_sec: number;
  accel_magnitude: number;
  signal_energy?: number;
  jerk_magnitude?: number;
};

type AngleTracePoint = {
  timestamp_sec: number;
  value: number;
};

type LiveEvent = {
  event: string;
  session_id?: string;
  frame_id?: number;
  timestamp_sec?: number;
  rep_count: number;
  state: string;
  smoothed_elbow_angle?: number | null;
  smoothed_knee_angle?: number | null;
  smoothed_wrist_height?: number | null;
  latest_prediction?: LatestPrediction;
  camera_angle?: string;
  landmarks?: Record<string, [number, number]>;
  active_arm?: string;
  sensor_status?: string;
  sensor_sample_count?: number;
  sensor_trace?: SensorTracePoint[];
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

type PendingSession = {
  exercise: string;
  date: Date;
  reps: number;
  quality: number;
  drift: number;
};

type LiveTrainingLocationState = {
  exercise?: string;
  routineName?: string;
  setNumber?: number;
  totalSets?: number;
  returnToWorkout?: boolean;
};

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://127.0.0.1:8000';
const PUSHUP_WS_URL =
  import.meta.env.VITE_PUSHUP_WS_URL ?? 'ws://127.0.0.1:8000/ws/live/pushup';
const SQUAT_WS_URL =
  import.meta.env.VITE_SQUAT_WS_URL ?? 'ws://127.0.0.1:8000/ws/live/squat';
const CURL_WS_URL =
  import.meta.env.VITE_CURL_WS_URL ?? 'ws://127.0.0.1:8000/ws/live/curl';
const SHOULDER_PRESS_WS_URL =
  import.meta.env.VITE_SHOULDER_PRESS_WS_URL ?? 'ws://127.0.0.1:8000/ws/live/shoulder-press';

const exercises = ['Push-ups', 'Squats', 'Bicep Curl', 'Shoulder Press'];
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
    case 'waiting_bottom':
      return 'Waiting for bottom position';
    case 'waiting_top':
      return 'Waiting for top position';
    case 'curling_up':
      return 'Curling up';
    case 'lowering_down':
      return 'Lowering down';
    case 'ascending':
      return 'Tracking current rep';
    case 'descending':
      return 'Tracking current rep';
    default:
      return state;
  }
}

function getExerciseSlug(exercise: string) {
  if (exercise === 'Squats') {
    return 'squat';
  }
  if (exercise === 'Bicep Curl') {
    return 'curl';
  }
  if (exercise === 'Shoulder Press') {
    return 'shoulder-press';
  }
  return 'pushup';
}

function getInitialTrackerState(exercise: string) {
  return exercise === 'Bicep Curl' || exercise === 'Shoulder Press' ? 'waiting_bottom' : 'waiting_top';
}

function buildPolylinePoints(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return '';
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
}

function buildFeedbackMessages(
  exercise: string,
  prediction: LatestPrediction | null,
  quality: number,
  trackerState: string,
  subscription: 'basic' | 'premium' | undefined,
): string[] {
  if (exercise !== 'Push-ups' && exercise !== 'Squats' && exercise !== 'Bicep Curl' && exercise !== 'Shoulder Press') {
    return ['Live backend tracking is currently enabled for push-ups, squats, bicep curls, and shoulder press only.'];
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
  } else if (exercise === 'Bicep Curl') {
    switch (prediction.predicted_label) {
      case 'correct':
        messages.push('Curl tempo and elbow control look stable.');
        break;
      case 'swinging':
        messages.push('Reduce torso swing and keep the elbow pinned closer to your side.');
        break;
      case 'partial_rom':
        messages.push('Lower further before starting the next curl to use full range.');
        break;
      case 'too_fast':
        messages.push('Slow the curl down and control the lowering phase.');
        break;
      default:
        messages.push(`Prediction: ${prediction.predicted_label}`);
    }
  } else if (exercise === 'Shoulder Press') {
    switch (prediction.predicted_label) {
      case 'correct':
        messages.push('Press path and lockout look stable.');
        break;
      case 'incomplete_lockout':
        messages.push('Finish the press fully overhead before lowering.');
        break;
      case 'leaning_back':
        messages.push('Brace your core and avoid leaning back to finish the press.');
        break;
      case 'too_fast':
        messages.push('Slow the press down and control the return to shoulder level.');
        break;
      default:
        messages.push(`Prediction: ${prediction.predicted_label}`);
    }
  }

  if (subscription === 'premium') {
    messages.push(
      exercise === 'Squats'
        ? 'Premium coaching: aim for controlled top-bottom-top cycles with stable knee tracking.'
        : exercise === 'Bicep Curl'
          ? 'Premium coaching: keep the elbow quiet, use full range, and avoid using torso momentum.'
          : exercise === 'Shoulder Press'
            ? 'Premium coaching: drive the weights overhead with full lockout and a steady torso.'
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
  const locationState = (location.state ?? {}) as LiveTrainingLocationState;
  const { user, addExerciseSession } = useAuth();
  const isPremium = user?.subscription === 'premium';

  const webcamRef = useRef<Webcam>(null);
  const uploadedVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const poseStaleTimeoutRef = useRef<number | null>(null);
  const frameIdRef = useRef(0);
  const sessionStartRef = useRef<number>(0);
  const isTrackingRef = useRef(false);
  const predictionHistoryRef = useRef<LatestPrediction[]>([]);

  const [selectedExercise, setSelectedExercise] = useState(locationState.exercise || 'Push-ups');
  const [useWebcam, setUseWebcam] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedVideoAspectRatio, setUploadedVideoAspectRatio] = useState<number>(16 / 9);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [currentQuality, setCurrentQuality] = useState(0);
  const [feedbackMessages, setFeedbackMessages] = useState<string[]>([]);
  const [trackerState, setTrackerState] = useState(getInitialTrackerState(selectedExercise));
  const [latestPrediction, setLatestPrediction] = useState<LatestPrediction | null>(null);
  const [liveLandmarks, setLiveLandmarks] = useState<Record<string, [number, number]>>({});
  const [uploadedFrames, setUploadedFrames] = useState<VideoPredictionResponse['frames']>([]);
  const [uploadedLandmarks, setUploadedLandmarks] = useState<Record<string, [number, number]>>({});
  const [smoothedPrimaryAngle, setSmoothedPrimaryAngle] = useState<number | null>(null);
  const [sensorSessionId, setSensorSessionId] = useState<string | null>(null);
  const [sensorStatus, setSensorStatus] = useState<'waiting' | 'connected' | 'not_applicable'>('not_applicable');
  const [sensorSampleCount, setSensorSampleCount] = useState(0);
  const [sensorTrace, setSensorTrace] = useState<SensorTracePoint[]>([]);
  const [angleTrace, setAngleTrace] = useState<AngleTracePoint[]>([]);
  const [coachResponse, setCoachResponse] = useState<CoachingResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState('');
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [saveSessionLoading, setSaveSessionLoading] = useState(false);
  const [saveSessionError, setSaveSessionError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [backendError, setBackendError] = useState<string>('');
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [workoutSetRecorded, setWorkoutSetRecorded] = useState(false);
  const [poseLost, setPoseLost] = useState(false);

  const stopFrameLoop = () => {
    if (frameIntervalRef.current !== null) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  };

  const clearPoseStaleTimeout = () => {
    if (poseStaleTimeoutRef.current !== null) {
      window.clearTimeout(poseStaleTimeoutRef.current);
      poseStaleTimeoutRef.current = null;
    }
  };

  const schedulePoseStaleTimeout = () => {
    clearPoseStaleTimeout();
    poseStaleTimeoutRef.current = window.setTimeout(() => {
      setPoseLost(true);
    }, 1200);
  };

  const closeSocket = () => {
    stopFrameLoop();
    clearPoseStaleTimeout();
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

  useEffect(() => {
    if (!locationState.returnToWorkout || !sessionComplete || !locationState.exercise || !locationState.setNumber) {
      return;
    }

    markCompletedWorkoutSet(locationState.exercise, locationState.setNumber);
    setWorkoutSetRecorded(true);
  }, [locationState.exercise, locationState.returnToWorkout, locationState.setNumber, sessionComplete]);

  useEffect(() => {
    if (!locationState.returnToWorkout || !locationState.exercise || !locationState.setNumber || !coachResponse) {
      return;
    }

    saveWorkoutSetResult(
      locationState.exercise,
      locationState.setNumber,
      {
        exercise: locationState.exercise,
        setNumber: locationState.setNumber,
        source: useWebcam ? 'webcam' : 'upload',
        repCount,
        currentQuality,
        coachResponse,
      },
      !useWebcam ? uploadedFile ?? undefined : undefined,
    );
  }, [
    coachResponse,
    currentQuality,
    locationState.exercise,
    locationState.returnToWorkout,
    locationState.setNumber,
    repCount,
    uploadedFile,
    useWebcam,
  ]);

  useEffect(() => {
    if (!locationState.returnToWorkout || !locationState.exercise || !locationState.setNumber) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const storedSet = await getWorkoutSetResult(locationState.exercise!, locationState.setNumber!);
      if (cancelled || !storedSet?.result) {
        return;
      }

      setRepCount(storedSet.result.repCount);
      setCurrentQuality(storedSet.result.currentQuality);
      setSessionComplete(true);
      setWorkoutSetRecorded(true);
      setSessionSaved(Boolean(storedSet.result.sessionSummarySaved));
      setTrackerState(storedSet.result.source === 'upload' ? 'upload_complete' : getInitialTrackerState(selectedExercise));
      setCoachResponse(storedSet.result.coachResponse ?? null);
      setCoachError('');
      setCoachLoading(false);
      setPendingSession(
        storedSet.result.pendingSession
          ? {
              ...storedSet.result.pendingSession,
              date: new Date(storedSet.result.pendingSession.date),
            }
          : null,
      );

      if (storedSet.result.source === 'upload' && storedSet.file) {
        setUseWebcam(false);
        setUploadedFile(storedSet.file);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locationState.exercise, locationState.returnToWorkout, locationState.setNumber, selectedExercise]);

  const handleBackNavigation = () => {
    if (locationState.returnToWorkout && sessionComplete && locationState.exercise && locationState.setNumber) {
      markCompletedWorkoutSet(locationState.exercise, locationState.setNumber);
      saveWorkoutSetResult(
        locationState.exercise,
        locationState.setNumber,
        {
          exercise: locationState.exercise,
          setNumber: locationState.setNumber,
          source: useWebcam ? 'webcam' : 'upload',
          repCount,
          currentQuality,
          pendingSession: pendingSession
            ? {
                ...pendingSession,
                date: pendingSession.date.toISOString(),
              }
            : null,
          sessionSummarySaved: sessionSaved,
          coachResponse,
        },
        !useWebcam ? uploadedFile ?? undefined : undefined,
      );
    }
    navigate(locationState.returnToWorkout ? '/start-workout' : '/dashboard');
  };

  const requestCoaching = async (
    prediction: LatestPrediction,
    sensorContext: Record<string, number | string> | null = null,
  ) => {
    if (!isPremium) {
      setCoachLoading(false);
      setCoachError('');
      setCoachResponse(null);
      return;
    }

    const exerciseSlug = getExerciseSlug(selectedExercise);
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

  const buildPendingSession = (
    reps: number,
    sessionSummary: ReturnType<typeof aggregateSessionPredictions>,
    lastPrediction: LatestPrediction | null,
  ): PendingSession => ({
    exercise: selectedExercise,
    date: new Date(),
    reps,
    quality: sessionSummary ? Math.round(sessionSummary.confidence * 100) : currentQuality,
    drift: Number(
      selectedExercise === 'Squats'
        ? (sessionSummary?.features?.mean_torso_angle ?? lastPrediction?.features?.mean_torso_angle ?? 0)
        : selectedExercise === 'Bicep Curl'
          ? (sessionSummary?.features?.mean_shoulder_drift ?? lastPrediction?.features?.mean_shoulder_drift ?? 0)
          : selectedExercise === 'Shoulder Press'
            ? (sessionSummary?.features?.mean_torso_drift ?? lastPrediction?.features?.mean_torso_drift ?? 0)
          : (sessionSummary?.features?.mean_body_alignment_error ?? lastPrediction?.features?.mean_body_alignment_error ?? 0),
    ),
  });

  const handleSaveSession = async () => {
    if (!pendingSession || sessionSaved) {
      return;
    }

    setSaveSessionLoading(true);
    setSaveSessionError('');
    try {
      await addExerciseSession(pendingSession);
      setSessionSaved(true);
      if (locationState.returnToWorkout && locationState.exercise && locationState.setNumber) {
        saveWorkoutSetResult(
          locationState.exercise,
          locationState.setNumber,
          {
            exercise: locationState.exercise,
            setNumber: locationState.setNumber,
            source: useWebcam ? 'webcam' : 'upload',
            repCount,
            currentQuality,
            pendingSession: {
              ...pendingSession,
              date: pendingSession.date.toISOString(),
            },
            sessionSummarySaved: true,
            coachResponse,
          },
          !useWebcam ? uploadedFile ?? undefined : undefined,
        );
      }
    } catch (error) {
      setSaveSessionError(error instanceof Error ? error.message : 'Unable to save the session.');
    } finally {
      setSaveSessionLoading(false);
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

    if (selectedExercise !== 'Push-ups' && selectedExercise !== 'Squats' && selectedExercise !== 'Bicep Curl' && selectedExercise !== 'Shoulder Press') {
      setBackendError('Video analysis is currently enabled for push-ups, squats, bicep curls, and shoulder press only.');
      return;
    }

    const exerciseSlug = getExerciseSlug(selectedExercise);
    const formData = new FormData();
    formData.append('file', uploadedFile);

    setUploadProcessing(true);
    setBackendError('');
    setCoachError('');
    setCoachResponse(null);
    setPendingSession(null);
    setSessionSaved(false);
    setWorkoutSetRecorded(false);
    setSaveSessionLoading(false);
    setSaveSessionError('');
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
        setPendingSession(buildPendingSession(payload.rep_count ?? predictions.length, sessionSummary, lastPrediction));
        await requestCoaching(sessionSummary, sessionSummary.sensor_context);
      } else {
        setCurrentQuality(0);
        setPendingSession(null);
      }

      setTrackerState('upload_complete');
      setSessionComplete(true);
      if (locationState.returnToWorkout && locationState.exercise && locationState.setNumber && uploadedFile) {
        saveWorkoutSetResult(locationState.exercise, locationState.setNumber, {
          exercise: locationState.exercise,
          setNumber: locationState.setNumber,
          source: 'upload',
          repCount: payload.rep_count ?? predictions.length,
          currentQuality: sessionSummary ? Math.round(sessionSummary.confidence * 100) : 0,
          pendingSession: sessionSummary
            ? {
                ...buildPendingSession(payload.rep_count ?? predictions.length, sessionSummary, lastPrediction),
                date: buildPendingSession(payload.rep_count ?? predictions.length, sessionSummary, lastPrediction).date.toISOString(),
              }
            : null,
          sessionSummarySaved: false,
          coachResponse: null,
        }, uploadedFile);
      }
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
    if (payload.landmarks && Object.keys(payload.landmarks).length > 0) {
      setLiveLandmarks(payload.landmarks);
      setPoseLost(false);
      schedulePoseStaleTimeout();
    } else {
      setLiveLandmarks({});
      setPoseLost(true);
    }
    if (payload.session_id) {
      setSensorSessionId(payload.session_id);
    }
    if (selectedExercise === 'Bicep Curl' || selectedExercise === 'Shoulder Press') {
      setSensorStatus((payload.sensor_status as 'waiting' | 'connected' | undefined) ?? 'waiting');
      setSensorSampleCount(payload.sensor_sample_count ?? 0);
      setSensorTrace(payload.sensor_trace ?? []);
    }
    const nextPrimaryAngle =
      selectedExercise === 'Squats'
        ? (payload.smoothed_knee_angle ?? null)
        : selectedExercise === 'Shoulder Press'
          ? (payload.smoothed_wrist_height ?? null)
          : (payload.smoothed_elbow_angle ?? null);
    setSmoothedPrimaryAngle(nextPrimaryAngle);
    if (payload.timestamp_sec !== undefined && nextPrimaryAngle !== null && Number.isFinite(nextPrimaryAngle)) {
      setAngleTrace((previous) => [...previous, { timestamp_sec: payload.timestamp_sec!, value: nextPrimaryAngle }].slice(-120));
    }

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
      selectedExercise === 'Squats'
        ? SQUAT_WS_URL
        : selectedExercise === 'Bicep Curl'
          ? CURL_WS_URL
          : selectedExercise === 'Shoulder Press'
            ? SHOULDER_PRESS_WS_URL
          : PUSHUP_WS_URL,
    );
    socketRef.current = websocket;

    websocket.onopen = () => {
      setConnectionStatus('connected');
      setPoseLost(true);
      sessionStartRef.current = performance.now();
      frameIdRef.current = 0;
      stopFrameLoop();
      frameIntervalRef.current = window.setInterval(sendCurrentFrame, 180);
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
    if (selectedExercise !== 'Push-ups' && selectedExercise !== 'Squats' && selectedExercise !== 'Bicep Curl' && selectedExercise !== 'Shoulder Press') {
      setBackendError('Video analysis is currently enabled for push-ups, squats, bicep curls, and shoulder press only.');
      return;
    }

    setRepCount(0);
    setCurrentQuality(0);
    setLatestPrediction(null);
    setLiveLandmarks({});
    setPoseLost(false);
    setUploadedFrames([]);
    setUploadedLandmarks({});
    predictionHistoryRef.current = [];
    setSmoothedPrimaryAngle(null);
    setCoachResponse(null);
    setCoachError('');
    setCoachLoading(false);
    setPendingSession(null);
    setSessionSaved(false);
    setWorkoutSetRecorded(false);
    setSaveSessionLoading(false);
    setSaveSessionError('');
    setTrackerState(getInitialTrackerState(selectedExercise));
    setSensorSessionId(null);
    setSensorStatus(selectedExercise === 'Bicep Curl' || selectedExercise === 'Shoulder Press' ? 'waiting' : 'not_applicable');
    setSensorSampleCount(0);
    setSensorTrace([]);
    setAngleTrace([]);
    setSessionComplete(false);
    if (!useWebcam) {
      void runUploadedVideoAnalysis();
      return;
    }

    setIsTracking(true);
    isTrackingRef.current = true;
    openSocket();
  };

  const handleStopTracking = async () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    closeSocket();
    setPoseLost(false);
      if (repCount > 0) {
        const sessionSummary = aggregateSessionPredictions(predictionHistoryRef.current);
        const nextPendingSession = buildPendingSession(repCount, sessionSummary, latestPrediction);
        setPendingSession(nextPendingSession);
        setSessionComplete(true);
        if (locationState.returnToWorkout && locationState.exercise && locationState.setNumber) {
          saveWorkoutSetResult(locationState.exercise, locationState.setNumber, {
            exercise: locationState.exercise,
            setNumber: locationState.setNumber,
            source: 'webcam',
            repCount,
            currentQuality: sessionSummary ? Math.round(sessionSummary.confidence * 100) : currentQuality,
            pendingSession: {
              ...nextPendingSession,
              date: nextPendingSession.date.toISOString(),
            },
            sessionSummarySaved: false,
            coachResponse: null,
          });
        }
      if (sessionSummary) {
        void requestCoaching(sessionSummary, sessionSummary.sensor_context);
      }
    }
  };

  const handleCopyLoggerCommand = async () => {
    if (!loggerCommand) {
      return;
    }
    try {
      await navigator.clipboard.writeText(loggerCommand);
      toast.success('Logger command copied.');
    } catch {
      toast.error('Unable to copy logger command.');
    }
  };

  const handleReset = () => {
    if (locationState.returnToWorkout && locationState.exercise && locationState.setNumber) {
      clearWorkoutSetResult(locationState.exercise, locationState.setNumber);
    }
    setIsTracking(false);
    isTrackingRef.current = false;
    closeSocket();
    setRepCount(0);
    setCurrentQuality(0);
    setFeedbackMessages([]);
    setLatestPrediction(null);
    setLiveLandmarks({});
    setPoseLost(false);
    predictionHistoryRef.current = [];
    setSmoothedPrimaryAngle(null);
    setCoachResponse(null);
    setCoachError('');
    setCoachLoading(false);
    setPendingSession(null);
    setSessionSaved(false);
    setWorkoutSetRecorded(false);
    setSaveSessionLoading(false);
    setSaveSessionError('');
    setTrackerState(getInitialTrackerState(selectedExercise));
    setSensorSessionId(null);
    setSensorStatus('not_applicable');
    setSensorSampleCount(0);
    setSensorTrace([]);
    setAngleTrace([]);
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

  const angleMetricLabel =
    selectedExercise === 'Squats'
      ? 'Knee Angle'
      : selectedExercise === 'Shoulder Press'
        ? 'Wrist Height'
      : 'Elbow Angle';
  const angleMetricUnit = selectedExercise === 'Shoulder Press' ? '' : '°';
  const cameraCardDescription =
    selectedExercise === 'Squats'
      ? 'Side-view squat tracking through the FastAPI backend'
      : selectedExercise === 'Bicep Curl'
        ? 'Side-view bicep-curl tracking through the FastAPI backend'
        : selectedExercise === 'Shoulder Press'
          ? 'Side-view shoulder-press tracking through the FastAPI backend'
        : 'Side-view push-up tracking through the FastAPI backend';
  const latestPredictionEmptyText =
    selectedExercise === 'Squats'
      ? 'No completed squat prediction yet.'
      : selectedExercise === 'Bicep Curl'
        ? 'No completed curl prediction yet.'
        : selectedExercise === 'Shoulder Press'
          ? 'No completed shoulder-press prediction yet.'
      : 'No completed rep prediction yet.';
  const poseStatusLabel =
    !useWebcam
      ? 'Pose overlay unavailable in upload mode'
      : !isTracking
        ? 'Pose tracking idle'
        : poseLost
          ? 'Searching for pose'
          : 'Pose locked';
  const savedBleAddress = user?.sensorSetup?.bleAddress?.trim() ?? '';
  const loggerCommand = sensorSessionId
    ? `python logger.py --address ${savedBleAddress || '<MICROBIT_ADDRESS>'} --prefix ${selectedExercise === 'Bicep Curl' ? 'ian_curl_live' : 'ian_shoulder_press_live'} --out ${selectedExercise === 'Bicep Curl' ? 'data/curl' : 'data/shoulder_press'} --backend-ws ws://192.168.88.16:8000/ws/live/${selectedExercise === 'Bicep Curl' ? 'curl' : 'shoulder-press'}/sensor --session-id ${sensorSessionId}`
    : '';
  const recentSensorWindowSec =
    sensorTrace.length > 1 ? Math.max(sensorTrace[sensorTrace.length - 1]!.timestamp_sec - sensorTrace[0]!.timestamp_sec, 0) : 0;
  const latestSensorMagnitude = sensorTrace.length > 0 ? sensorTrace[sensorTrace.length - 1]!.accel_magnitude : null;
  const sensorMagnitudePoints = buildPolylinePoints(
    sensorTrace.map((sample) => sample.accel_magnitude),
    320,
    96,
  );
  const angleTracePoints = buildPolylinePoints(
    angleTrace.map((sample) => sample.value),
    320,
    96,
  );
  const routineContextLabel =
    locationState.routineName && locationState.setNumber && locationState.totalSets
      ? `${locationState.routineName} • ${selectedExercise} • Set ${locationState.setNumber} of ${locationState.totalSets}`
      : locationState.routineName
        ? `${locationState.routineName} • ${selectedExercise}`
        : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {locationState.returnToWorkout ? 'Back To Workout' : 'Back'}
            </Button>
            <div>
              <h1 className="text-xl">Live Training</h1>
              {routineContextLabel ? <p className="text-sm text-gray-500">{routineContextLabel}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {locationState.returnToWorkout ? (
              <Button
                variant="outline"
                size="sm"
                className="border-orange-200 bg-orange-50 text-orange-700 shadow-[0_0_18px_rgba(251,146,60,0.35)] hover:bg-orange-100"
                onClick={handleBackNavigation}
              >
                Session In Progress
              </Button>
            ) : null}
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
              <div
                className="relative overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_rgba(15,23,42,0.96)_58%)]"
                style={{
                  aspectRatio: useWebcam ? '16 / 9' : `${uploadedVideoAspectRatio}`,
                }}
              >
                {useWebcam ? (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      mirrored
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.85}
                      className="h-full w-full object-contain"
                      videoConstraints={{
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                      }}
                    />
                    {Object.keys(liveLandmarks).length > 0 ? (
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="xMidYMid meet"
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

                {useWebcam && isTracking && poseLost ? (
                  <div className="absolute inset-x-4 top-16 rounded-lg bg-amber-500/90 px-4 py-3 text-sm text-white shadow-lg">
                    No pose detected. Keep moving into frame and the tracker will resume automatically once your pose is visible again.
                  </div>
                ) : null}

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
                        <span>Pose: {poseStatusLabel}</span>
                        <span>
                          {angleMetricLabel}:{' '}
                          {smoothedPrimaryAngle !== null ? `${Math.round(smoothedPrimaryAngle * (selectedExercise === 'Shoulder Press' ? 100 : 1))}${angleMetricUnit}` : 'N/A'}
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
                    <span>Pose: {poseStatusLabel}</span>
                    <span>
                      {angleMetricLabel}:{' '}
                      {smoothedPrimaryAngle !== null ? `${Math.round(smoothedPrimaryAngle * (selectedExercise === 'Shoulder Press' ? 100 : 1))}${angleMetricUnit}` : 'N/A'}
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
            <Card className={sessionSaved ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`h-6 w-6 ${sessionSaved ? 'text-green-600' : 'text-amber-600'}`} />
                    <div>
                      <h3 className={`font-medium ${sessionSaved ? 'text-green-900' : 'text-amber-900'}`}>
                        {sessionSaved
                          ? 'Session Added To Profile'
                          : workoutSetRecorded
                            ? 'Set Recorded In Current Workout'
                            : 'Session Ready To Add'}
                      </h3>
                      <p className={`text-sm ${sessionSaved ? 'text-green-700' : 'text-amber-700'}`}>
                        {workoutSetRecorded
                          ? 'This set is already counted in the current workout. Use session summary only if you also want it saved to profile history.'
                          : `${repCount} reps recorded with ${currentQuality}% latest confidence.`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Button
                      onClick={() => void handleSaveSession()}
                      disabled={!pendingSession || sessionSaved || saveSessionLoading}
                    >
                      {sessionSaved ? 'Added' : saveSessionLoading ? 'Adding...' : 'Add To Session Summary'}
                    </Button>
                  </div>
                </div>
                {saveSessionError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {saveSessionError}
                  </div>
                ) : null}
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
                Live tracking and uploaded-video analysis are currently implemented for push-ups, squats, bicep curls, and shoulder press.
              </p>
              {selectedExercise === 'Bicep Curl' || selectedExercise === 'Shoulder Press' ? (
                <div className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                  Start a live session first, then point your micro:bit logger at the live session ID shown below so the backend can fuse accelerometer data with the tracker.
                </div>
              ) : null}
            </CardContent>
          </Card>

          {selectedExercise === 'Bicep Curl' || selectedExercise === 'Shoulder Press' ? (
            <Card>
              <CardHeader>
                <CardTitle>Micro:bit Sensor</CardTitle>
                <CardDescription>
                  Live accelerometer fusion for {selectedExercise === 'Bicep Curl' ? 'curl' : 'shoulder-press'} sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Sensor status</span>
                  <Badge variant={sensorStatus === 'connected' ? 'default' : 'secondary'}>
                    {sensorStatus === 'connected' ? 'Connected' : 'Waiting'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Samples received</span>
                  <span>{sensorSampleCount}</span>
                </div>
                <div>
                  <div className="mb-1 text-gray-500">Live session ID</div>
                  <div className="break-all rounded-md bg-gray-100 p-2 font-mono text-xs">
                    {sensorSessionId ?? 'Start curl tracking to generate a session ID'}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Saved BLE address</span>
                  <span className="font-mono text-xs">{savedBleAddress || 'Set this in Profile first'}</span>
                </div>
                {sensorSessionId ? (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-gray-500">
                      <span>Logger command</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyLoggerCommand()}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <div className="break-all rounded-md bg-gray-100 p-2 font-mono text-xs">
                      {loggerCommand}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {selectedExercise === 'Bicep Curl' || selectedExercise === 'Shoulder Press' ? (
            <Card>
              <CardHeader>
                <CardTitle>Live Motion Graph</CardTitle>
                <CardDescription>
                  Rolling view of sensor movement and {selectedExercise === 'Shoulder Press' ? 'press path' : 'curl path'} over the latest {recentSensorWindowSec > 0 ? `${recentSensorWindowSec.toFixed(1)}s` : 'few seconds'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Sensor acceleration magnitude</span>
                    <span>{latestSensorMagnitude !== null ? latestSensorMagnitude.toFixed(1) : 'Waiting for sensor data'}</span>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    {sensorTrace.length > 1 ? (
                      <svg viewBox="0 0 320 96" className="h-28 w-full">
                        <polyline
                          fill="none"
                          stroke="rgb(249 115 22)"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={sensorMagnitudePoints}
                        />
                      </svg>
                    ) : (
                      <div className="flex h-28 items-center justify-center text-sm text-gray-400">
                        Start the micro:bit logger to see incoming sensor motion.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{angleMetricLabel}</span>
                    <span>
                      {smoothedPrimaryAngle !== null ? `${Math.round(smoothedPrimaryAngle * (selectedExercise === 'Shoulder Press' ? 100 : 1))}${angleMetricUnit}` : 'Waiting for pose'}
                    </span>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    {angleTrace.length > 1 ? (
                      <svg viewBox="0 0 320 96" className="h-28 w-full">
                        <polyline
                          fill="none"
                          stroke="rgb(59 130 246)"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={angleTracePoints}
                        />
                      </svg>
                    ) : (
                      <div className="flex h-28 items-center justify-center text-sm text-gray-400">
                        Start tracking to compare camera motion against the sensor trace.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

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
              <CardDescription>
                {isPremium
                  ? 'LLM guidance generated from CV features and form predictions'
                  : 'Premium feature for AI-suggested improvements and coaching'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isPremium ? (
                <div className="space-y-3 text-sm">
                  <p className="text-gray-600">
                    Upgrade to Premium to unlock AI-suggested improvements, personalized cues, and safety notes after each set.
                  </p>
                  <Button onClick={() => navigate('/subscription')}>Upgrade to Premium</Button>
                </div>
              ) : coachLoading ? (
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
                            : selectedExercise === 'Shoulder Press'
                              ? (latestPrediction.features.min_elbow_angle ?? 0)
                            : (latestPrediction.features.min_elbow_angle ?? 0),
                        ),
                      )}
                      °
                    </div>
                    <div className="rounded-md bg-gray-100 p-2">
                      {selectedExercise === 'Shoulder Press'
                        ? `Height rise: ${Number(latestPrediction.features.height_rise ?? 0).toFixed(2)}`
                        : `Angle drop: ${Math.round(Number(latestPrediction.features.angle_drop ?? 0))}°`}
                    </div>
                    <div className="rounded-md bg-gray-100 p-2">
                      Duration: {Number(latestPrediction.features.rep_duration_sec ?? 0).toFixed(2)}s
                    </div>
                    <div className="rounded-md bg-gray-100 p-2">
                      {selectedExercise === 'Squats'
                        ? `Torso angle: ${Number(latestPrediction.features.mean_torso_angle ?? 0).toFixed(1)}`
                        : selectedExercise === 'Bicep Curl'
                          ? `Shoulder drift: ${Number(latestPrediction.features.mean_shoulder_drift ?? 0).toFixed(2)}`
                          : selectedExercise === 'Shoulder Press'
                            ? `Torso drift: ${Number(latestPrediction.features.mean_torso_drift ?? 0).toFixed(2)}`
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
              <CardTitle>
                {selectedExercise === 'Squats'
                  ? 'Squat Guide'
                  : selectedExercise === 'Bicep Curl'
                    ? 'Bicep Curl Guide'
                    : selectedExercise === 'Shoulder Press'
                      ? 'Shoulder Press Guide'
                    : 'Push-up Guide'}
              </CardTitle>
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
                ) : selectedExercise === 'Bicep Curl' ? (
                  <>
                    <p>1. Place the camera at your side so your shoulder, elbow, and wrist stay visible.</p>
                    <p>2. Start with the arm lowered before the first curl.</p>
                    <p>3. Keep the upper arm quiet and avoid using torso momentum.</p>
                    <p>4. Lower the weight fully and control the descent before the next rep.</p>
                  </>
                ) : selectedExercise === 'Shoulder Press' ? (
                  <>
                    <p>1. Place the camera at your side so your shoulder, elbow, wrist, and torso stay visible.</p>
                    <p>2. Start with the weight near shoulder level before the first rep.</p>
                    <p>3. Press overhead to full lockout without leaning your torso back.</p>
                    <p>4. Lower under control and keep the motion symmetrical side to side.</p>
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
