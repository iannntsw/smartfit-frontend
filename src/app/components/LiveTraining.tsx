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
} | null;

type LiveEvent = {
  event: string;
  frame_id?: number;
  rep_count: number;
  state: string;
  smoothed_elbow_angle?: number | null;
  smoothed_knee_angle?: number | null;
  latest_prediction?: LatestPrediction;
  camera_angle?: string;
};

const PUSHUP_WS_URL =
  import.meta.env.VITE_PUSHUP_WS_URL ?? 'ws://127.0.0.1:8000/ws/live/pushup';
const SQUAT_WS_URL =
  import.meta.env.VITE_SQUAT_WS_URL ?? 'ws://127.0.0.1:8000/ws/live/squat';

const exercises = ['Push-ups', 'Squats', 'Bicep Curl', 'Dumbbell Lat Raise'];

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
  prediction: LatestPrediction,
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

export function LiveTraining() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, addExerciseSession } = useAuth();

  const webcamRef = useRef<Webcam>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const frameIdRef = useRef(0);
  const sessionStartRef = useRef<number>(0);
  const isTrackingRef = useRef(false);

  const [selectedExercise, setSelectedExercise] = useState(location.state?.exercise || 'Push-ups');
  const [useWebcam, setUseWebcam] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [currentQuality, setCurrentQuality] = useState(0);
  const [feedbackMessages, setFeedbackMessages] = useState<string[]>([]);
  const [trackerState, setTrackerState] = useState('waiting_top');
  const [latestPrediction, setLatestPrediction] = useState<LatestPrediction>(null);
  const [smoothedPrimaryAngle, setSmoothedPrimaryAngle] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [backendError, setBackendError] = useState<string>('');

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

  const handleSocketMessage = (raw: MessageEvent<string>) => {
    const payload = JSON.parse(raw.data) as LiveEvent;
    setRepCount(payload.rep_count);
    setTrackerState(payload.state);
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
      setBackendError('Live backend tracking is currently enabled for push-ups and squats only.');
      return;
    }

    setRepCount(0);
    setCurrentQuality(0);
    setLatestPrediction(null);
    setSmoothedPrimaryAngle(null);
    setTrackerState('waiting_top');
    setSessionComplete(false);
    setIsTracking(true);
    isTrackingRef.current = true;
    openSocket();
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    closeSocket();
    if (repCount > 0) {
      addExerciseSession({
        exercise: selectedExercise,
        date: new Date(),
        reps: repCount,
        quality: currentQuality,
        drift: Number(
          selectedExercise === 'Squats'
            ? (latestPrediction?.features?.mean_torso_angle ?? 0)
            : (latestPrediction?.features?.mean_body_alignment_error ?? 0),
        ),
      });
      setSessionComplete(true);
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
    setSmoothedPrimaryAngle(null);
    setTrackerState('waiting_top');
    setBackendError('');
    setSessionComplete(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUseWebcam(false);
      setBackendError('Video upload UI is still placeholder. Use webcam tracking first.');
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
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white">
                    <div className="text-center">
                      <Upload className="mx-auto mb-2 h-12 w-12 opacity-50" />
                      <p>Upload flow not wired yet.</p>
                    </div>
                  </div>
                )}

                {isTracking && (
                  <div className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-sm text-white">
                    Live Tracking
                  </div>
                )}

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
              </div>

              {backendError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {backendError}
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                {!isTracking ? (
                  <Button onClick={handleStartTracking} className="flex-1">
                    <Play className="mr-2 h-4 w-4" />
                    Start Tracking
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
                Live backend tracking is currently implemented for push-ups and squats.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-time Feedback</CardTitle>
              <CardDescription>Direct backend predictions from live webcam frames</CardDescription>
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
