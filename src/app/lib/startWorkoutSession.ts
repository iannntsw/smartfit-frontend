export type StartWorkoutExercise = {
  name: string;
  sets: number;
};

export type StartWorkoutDraft = {
  workoutExercises: StartWorkoutExercise[];
  workoutName: string;
  isWorkoutActive: boolean;
  completedSetKeys: string[];
  setResults: Record<string, StartWorkoutSetResult>;
};

export type StartWorkoutSetResult = {
  exercise: string;
  setNumber: number;
  source: 'upload' | 'webcam';
  repCount: number;
  currentQuality: number;
  pendingSession?: {
    exercise: string;
    date: string;
    reps: number;
    quality: number;
    drift: number;
  } | null;
  sessionSummarySaved?: boolean;
  coachResponse?: {
    exercise: string;
    predicted_label: string;
    provider: string;
    model: string;
    summary: string;
    priority: string;
    cues: string[];
    safety_note?: string | null;
  } | null;
};

export const START_WORKOUT_STORAGE_KEY = 'smartfit_start_workout_draft';
export const START_WORKOUT_UPDATED_EVENT = 'smartfit:start-workout-updated';
const WORKOUT_VIDEO_DB = 'smartfit-workout-videos';
const WORKOUT_VIDEO_STORE = 'set-videos';

export function buildWorkoutSetKey(exerciseName: string, setNumber: number) {
  return `${exerciseName}::${setNumber}`;
}

function notifyDraftUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(START_WORKOUT_UPDATED_EVENT));
  }
}

function openWorkoutVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(WORKOUT_VIDEO_DB, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(WORKOUT_VIDEO_STORE)) {
        database.createObjectStore(WORKOUT_VIDEO_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveWorkoutSetVideo(setKey: string, file: File) {
  if (typeof window === 'undefined') {
    return;
  }

  const database = await openWorkoutVideoDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(WORKOUT_VIDEO_STORE, 'readwrite');
    transaction.objectStore(WORKOUT_VIDEO_STORE).put(file, setKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function getWorkoutSetVideo(setKey: string): Promise<File | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const database = await openWorkoutVideoDb();
  const result = await new Promise<File | null>((resolve, reject) => {
    const transaction = database.transaction(WORKOUT_VIDEO_STORE, 'readonly');
    const request = transaction.objectStore(WORKOUT_VIDEO_STORE).get(setKey);
    request.onsuccess = () => resolve((request.result as File | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

async function clearWorkoutSetVideos() {
  if (typeof window === 'undefined') {
    return;
  }

  const database = await openWorkoutVideoDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(WORKOUT_VIDEO_STORE, 'readwrite');
    transaction.objectStore(WORKOUT_VIDEO_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function deleteWorkoutSetVideo(setKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const database = await openWorkoutVideoDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(WORKOUT_VIDEO_STORE, 'readwrite');
    transaction.objectStore(WORKOUT_VIDEO_STORE).delete(setKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export function readStartWorkoutDraft(): StartWorkoutDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawDraft = window.sessionStorage.getItem(START_WORKOUT_STORAGE_KEY);
  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft) as StartWorkoutDraft;
  } catch {
    window.sessionStorage.removeItem(START_WORKOUT_STORAGE_KEY);
    notifyDraftUpdated();
    return null;
  }
}

export function saveStartWorkoutDraft(draft: StartWorkoutDraft) {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(START_WORKOUT_STORAGE_KEY, JSON.stringify(draft));
  notifyDraftUpdated();
}

export function clearStartWorkoutDraft() {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(START_WORKOUT_STORAGE_KEY);
  void clearWorkoutSetVideos();
  notifyDraftUpdated();
}

export function markCompletedWorkoutSet(exerciseName: string, setNumber: number) {
  const draft = readStartWorkoutDraft();
  if (!draft) {
    return;
  }

  const completedKey = buildWorkoutSetKey(exerciseName, setNumber);
  if (draft.completedSetKeys.includes(completedKey)) {
    return;
  }

  saveStartWorkoutDraft({
    ...draft,
    completedSetKeys: [...draft.completedSetKeys, completedKey],
  });
}

export function hasActiveWorkoutSession() {
  const draft = readStartWorkoutDraft();
  return Boolean(draft?.isWorkoutActive);
}

export function saveWorkoutSetResult(
  exerciseName: string,
  setNumber: number,
  result: StartWorkoutSetResult,
  file?: File,
) {
  const draft = readStartWorkoutDraft();
  if (!draft) {
    return;
  }

  const setKey = buildWorkoutSetKey(exerciseName, setNumber);
  if (file) {
    void saveWorkoutSetVideo(setKey, file);
  }

  saveStartWorkoutDraft({
    ...draft,
    completedSetKeys: draft.completedSetKeys.includes(setKey)
      ? draft.completedSetKeys
      : [...draft.completedSetKeys, setKey],
    setResults: {
      ...(draft.setResults ?? {}),
      [setKey]: result,
    },
  });
}

export async function getWorkoutSetResult(exerciseName: string, setNumber: number) {
  const draft = readStartWorkoutDraft();
  if (!draft) {
    return null;
  }
  const setKey = buildWorkoutSetKey(exerciseName, setNumber);
  return {
    result: draft.setResults?.[setKey] ?? null,
    file: await getWorkoutSetVideo(setKey),
  };
}

export function clearWorkoutSetResult(exerciseName: string, setNumber: number) {
  const draft = readStartWorkoutDraft();
  if (!draft) {
    return;
  }

  const setKey = buildWorkoutSetKey(exerciseName, setNumber);
  const nextSetResults = { ...(draft.setResults ?? {}) };
  delete nextSetResults[setKey];

  saveStartWorkoutDraft({
    ...draft,
    completedSetKeys: draft.completedSetKeys.filter((key) => key !== setKey),
    setResults: nextSetResults,
  });
  void deleteWorkoutSetVideo(setKey);
}
