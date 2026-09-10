import {
  Audio as ThreeAudio,
  AudioListener,
  AudioLoader,
  LoadingManager,
  Matrix4,
  PositionalAudio,
  Vector3,
} from "three";
import {
  soundCues,
  soundLoops,
  type AudioAsset,
  type SoundCue,
  type SoundLoop,
} from "../models/audio-catalog";
import { DEFAULT_AUDIO_PREFERENCES, type AudioMix, type AudioStatus } from "../models/audio-state";

type Position = Readonly<{ x: number; y: number; z: number }>;
type Voice<T extends ThreeAudio<AudioNode> = ThreeAudio<AudioNode>> = {
  sound: T;
  filter: BiquadFilterNode;
  muffled: boolean;
  target: number;
  pauseTimer: ReturnType<typeof setTimeout> | null;
};
type LoopRequest = { gain: number; voice: Voice | null };
type PositionedRequest = {
  loop: SoundLoop;
  position: Position;
  gain: number;
  voice: Voice<PositionalAudio> | null;
};
type CueVoice = { cue: SoundCue; outdoor: boolean; voice: Voice };

const ASSETS = [...Object.values(soundLoops), ...Object.values(soundCues)];
const MAX_CUES = 12;
const MAX_POSITIONED_LOOPS = 24;
const FADE_SECONDS = 0.1;
const PAUSE_DELAY_MS = 600;

/** Owns game audio resources; Three.js owns loading, playback, and spatial sound. */
export class GameAudio {
  private readonly loader = new AudioLoader(new LoadingManager());
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly failures = new Map<string, string>();
  private readonly subscribers = new Set<() => void>();
  private readonly loops = new Map<SoundLoop, LoopRequest>([
    ["menu", { gain: 1, voice: null }],
    ["square", { gain: 1, voice: null }],
    ["guesthouse", { gain: 1, voice: null }],
  ]);
  private readonly positioned = new Map<string, PositionedRequest>();
  private readonly cues = new Set<CueVoice>();
  private readonly orientation = new Matrix4();
  private readonly lookTarget = new Vector3();
  private listener: AudioListener | null = null;
  private preloadTask: Promise<void> | null = null;
  private activated = false;
  private disposed = false;
  private muted = false;
  private hidden = false;
  private mix: AudioMix = {
    screen: "title",
    space: "square",
    conversation: false,
    connected: false,
  };
  private snapshot: AudioStatus = {
    status: "locked",
    message: "Click to enable sound.",
    unlocked: false,
  };

  /** Reports browser playback permission independently of asset loading failures. */
  get unlocked(): boolean {
    return !this.disposed && this.activated && this.listener?.context.state === "running";
  }

  /** React can subscribe without rebinding this callback. */
  readonly subscribe = (subscriber: () => void): (() => void) => {
    if (this.disposed) return () => {};
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  };

  /** Returns the same snapshot object until its visible status changes. */
  readonly getSnapshot = (): AudioStatus => this.snapshot;

  /** Starts the menu request first; one failed asset does not reject the load. */
  preload(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.preloadTask !== null) return this.preloadTask;
    this.preloadTask = this.loadAll();
    this.updateStatus();
    return this.preloadTask;
  }

  /** Requests playback from a user gesture; failures update the public status. */
  async unlock(): Promise<void> {
    const listener = this.ensureListener();
    if (listener === null) return;
    try {
      const resumed = listener.context.resume();
      void this.preload();
      await resumed;
      if (this.disposed) return;
      this.activated = true;
      this.failures.delete("resume");
      this.refresh();
      this.updateStatus();
    } catch (cause) {
      this.reportFailure("resume", "The browser could not enable sound.", cause);
    }
  }

  /** Applies screen, conversation, interior, and connection levels with short fades. */
  setMix(mix: AudioMix): void {
    if (this.disposed) return;
    this.mix = mix;
    this.refresh();
  }

  /** Pauses owned loops and discards action sounds instead of queuing them. */
  setMuted(muted: boolean): void {
    if (this.disposed || this.muted === muted) return;
    this.muted = muted;
    if (muted) this.clearCues();
    this.refresh();
  }

  /** Plays current feedback only; overlap is limited to twelve action sounds. */
  play(cue: SoundCue): void {
    if (!this.canPlay() || this.listener === null) return;
    const asset = soundCues[cue];
    const buffer = this.buffers.get(asset.path);
    if (buffer === undefined || this.level(asset, false) === 0) return;
    if (this.cues.size >= MAX_CUES) {
      const oldest = this.cues.values().next().value;
      if (oldest !== undefined) this.removeCue(oldest);
    }
    const entry: CueVoice = {
      cue,
      outdoor: asset.channel === "world" && this.mix.space === "square",
      voice: this.createVoice(new ThreeAudio(this.listener), buffer, false),
    };
    this.cues.add(entry);
    this.updateVoice(entry.voice, this.level(asset, entry.outdoor), entry.outdoor);
    entry.voice.sound.source?.addEventListener("ended", () => this.removeCue(entry), {
      once: true,
    });
  }

  /** Sets an ambient layer multiplier; zero fades the layer to a paused state. */
  setLoop(loop: SoundLoop, gain: number): void {
    if (this.disposed) return;
    const request = this.loops.get(loop);
    if (request === undefined) this.loops.set(loop, { gain: boundedGain(gain), voice: null });
    else request.gain = boundedGain(gain);
    this.refresh();
  }

  /** Updates one emitter; at most twenty-four emitter IDs can remain active. */
  setPositionedLoop(id: string, loop: SoundLoop, position: Position, gain: number): void {
    if (this.disposed) return;
    const volume = boundedGain(gain);
    if (volume === 0) {
      this.removePositionedLoop(id);
      return;
    }
    const request = this.positioned.get(id);
    if (request !== undefined && request.loop === loop) {
      request.position = { ...position };
      request.gain = volume;
      this.refreshPositioned(request);
      return;
    }
    if (request !== undefined) this.removePositionedLoop(id);
    if (this.positioned.size >= MAX_POSITIONED_LOOPS) return;
    const next: PositionedRequest = { loop, position: { ...position }, gain: volume, voice: null };
    this.positioned.set(id, next);
    this.refreshPositioned(next);
  }

  /** Stops and disconnects an emitter when its scene entity disappears. */
  removePositionedLoop(id: string): void {
    const request = this.positioned.get(id);
    if (request === undefined) return;
    this.positioned.delete(id);
    if (request.voice !== null) this.releaseVoice(request.voice);
  }

  /** Updates the listener from the camera; forward points toward the visible scene. */
  setListener(position: Position, forward: Position): void {
    if (this.disposed || this.listener === null) return;
    this.listener.position.set(position.x, position.y, position.z);
    this.lookTarget.set(position.x + forward.x, position.y + forward.y, position.z + forward.z);
    this.orientation.lookAt(this.listener.position, this.lookTarget, this.listener.up);
    this.listener.quaternion.setFromRotationMatrix(this.orientation);
    this.listener.updateMatrixWorld(true);
  }

  /** Hidden pages pause loops and discard cues; the shared context stays intact. */
  setHidden(hidden: boolean): void {
    if (this.disposed || this.hidden === hidden) return;
    this.hidden = hidden;
    if (hidden) this.clearCues();
    this.refresh();
    if (!hidden && this.activated && !this.unlocked) void this.unlock();
  }

  /** Stops owned resources without closing Three.js's shared AudioContext. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearCues();
    for (const request of this.loops.values())
      if (request.voice !== null) this.releaseVoice(request.voice);
    for (const request of this.positioned.values())
      if (request.voice !== null) this.releaseVoice(request.voice);
    this.loops.clear();
    this.positioned.clear();
    this.buffers.clear();
    if (this.listener !== null) {
      this.listener.context.removeEventListener("statechange", this.contextChanged);
      this.listener.gain.disconnect();
      this.listener = null;
    }
    // Three shares active file requests, so late buffers are ignored without aborting another runtime's request.
    this.subscribers.clear();
    this.snapshot = { status: "unavailable", message: "Sound stopped.", unlocked: false };
  }

  private ensureListener(): AudioListener | null {
    if (this.disposed) return null;
    if (this.listener !== null) return this.listener;
    if (this.failures.has("initialize")) return null;
    try {
      this.listener = new AudioListener();
      this.listener.gain.gain.value = 0;
      this.listener.context.addEventListener("statechange", this.contextChanged);
      return this.listener;
    } catch (cause) {
      this.reportFailure("initialize", "Sound is unavailable in this browser.", cause);
      return null;
    }
  }

  private async loadAll(): Promise<void> {
    if (this.ensureListener() === null) return;
    await Promise.all(ASSETS.map((asset) => this.loadAsset(asset)));
    if (!this.disposed) this.updateStatus();
  }

  private async loadAsset(asset: AudioAsset): Promise<void> {
    try {
      const buffer = await this.loader.loadAsync(asset.path);
      if (this.disposed) return;
      this.buffers.set(asset.path, buffer);
      this.refresh();
      this.updateStatus();
    } catch (cause) {
      this.reportFailure(
        asset.path,
        "Some sounds could not load. Other sounds remain available.",
        cause,
      );
    }
  }

  private readonly contextChanged = (): void => {
    if (this.disposed) return;
    this.refresh();
    this.updateStatus();
  };

  private canPlay(): boolean {
    return this.unlocked && !this.muted && !this.hidden;
  }

  private refresh(): void {
    if (this.disposed || this.listener === null) return;
    this.listener.setMasterVolume(this.canPlay() ? 1 : 0);
    for (const [loop, request] of this.loops) {
      const buffer = this.buffers.get(soundLoops[loop].path);
      if (request.voice === null && buffer !== undefined && request.gain > 0) {
        request.voice = this.createVoice(new ThreeAudio(this.listener), buffer, true);
      }
      if (request.voice !== null) this.updateLoop(loop, request.gain, request.voice);
    }
    for (const request of this.positioned.values()) this.refreshPositioned(request);
    for (const cue of this.cues)
      this.updateVoice(cue.voice, this.level(soundCues[cue.cue], cue.outdoor), cue.outdoor);
  }

  private refreshPositioned(request: PositionedRequest): void {
    if (this.disposed || this.listener === null) return;
    const buffer = this.buffers.get(soundLoops[request.loop].path);
    if (request.voice === null && buffer !== undefined) {
      const sound = new PositionalAudio(this.listener);
      sound.setDistanceModel("inverse").setRefDistance(8).setRolloffFactor(1.2).setMaxDistance(180);
      request.voice = this.createVoice(sound, buffer, true);
    }
    if (request.voice === null) return;
    const { x, y, z } = request.position;
    request.voice.sound.position.set(x, y, z);
    this.updateLoop(request.loop, request.gain, request.voice);
    request.voice.sound.updateMatrixWorld(true);
  }

  private updateLoop(loop: SoundLoop, gain: number, voice: Voice): void {
    const outdoor = loop !== "menu" && loop !== "guesthouse";
    const active = loop !== "guesthouse" || this.mix.space === "guesthouse";
    this.updateVoice(voice, active ? gain * this.level(soundLoops[loop], outdoor) : 0, outdoor);
  }

  private level(asset: AudioAsset, outdoor: boolean): number {
    if (asset.channel === "interface") return asset.gain * DEFAULT_AUDIO_PREFERENCES.effects;
    if (asset.channel === "music") {
      if (this.mix.screen === "playing") return 0;
      const screenGain = this.mix.screen === "paused" ? 0.4 : 1;
      return asset.gain * DEFAULT_AUDIO_PREFERENCES.music * screenGain;
    }
    if (!this.mix.connected || this.mix.screen === "title" || this.mix.screen === "loading")
      return 0;
    const pause = this.mix.screen === "paused" ? 0.25 : 1;
    const conversation = this.mix.conversation ? 0.5 : 1;
    const interior = outdoor && this.mix.space === "guesthouse" ? 0.12 : 1;
    return asset.gain * DEFAULT_AUDIO_PREFERENCES.effects * pause * conversation * interior;
  }

  private createVoice<T extends ThreeAudio<AudioNode>>(
    sound: T,
    buffer: AudioBuffer,
    loop: boolean,
  ): Voice<T> {
    sound.setBuffer(buffer);
    sound.setLoop(loop);
    sound.gain.gain.value = 0;
    const filter = sound.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 20_000;
    sound.setFilter(filter);
    return { sound, filter, muffled: false, target: 0, pauseTimer: null };
  }

  private updateVoice(voice: Voice, target: number, outdoor: boolean): void {
    const sound = voice.sound;
    const now = sound.context.currentTime;
    if (!this.canPlay()) {
      this.cancelPause(voice);
      if (sound.isPlaying) sound.pause();
      sound.gain.gain.cancelScheduledValues(now);
      sound.gain.gain.setValueAtTime(0, now);
      voice.target = 0;
      return;
    }
    const muffled = outdoor && this.mix.space === "guesthouse";
    if (voice.muffled !== muffled) {
      voice.muffled = muffled;
      voice.filter.frequency.setTargetAtTime(muffled ? 900 : 20_000, now, FADE_SECONDS);
    }
    if (target > 0) {
      this.cancelPause(voice);
      if (!sound.isPlaying) {
        sound.gain.gain.setValueAtTime(sound.loop ? 0 : target, now);
        sound.play();
      }
    }
    if (voice.target === target) return;
    voice.target = target;
    sound.gain.gain.cancelScheduledValues(now);
    sound.gain.gain.setTargetAtTime(target, now, FADE_SECONDS);
    if (target === 0 && sound.isPlaying && voice.pauseTimer === null) {
      voice.pauseTimer = setTimeout(() => {
        voice.pauseTimer = null;
        if (this.disposed || voice.target !== 0) return;
        sound.pause();
      }, PAUSE_DELAY_MS);
    }
  }

  private cancelPause(voice: Voice): void {
    if (voice.pauseTimer === null) return;
    clearTimeout(voice.pauseTimer);
    voice.pauseTimer = null;
  }

  private releaseVoice(voice: Voice): void {
    this.cancelPause(voice);
    if (voice.sound.isPlaying) voice.sound.stop();
    voice.sound.disconnect();
    voice.sound.gain.disconnect();
    voice.filter.disconnect();
  }

  private removeCue(cue: CueVoice): void {
    if (!this.cues.delete(cue)) return;
    this.releaseVoice(cue.voice);
  }

  private clearCues(): void {
    for (const cue of this.cues) this.removeCue(cue);
  }

  private reportFailure(operation: string, message: string, cause: unknown): void {
    if (this.disposed || this.failures.has(operation)) return;
    this.failures.set(operation, message);
    console.error("Game audio failed", { operation, cause });
    this.updateStatus();
  }

  private updateStatus(): void {
    if (this.disposed) return;
    const failure = this.failures.values().next().value;
    if (failure !== undefined) {
      this.publish({ status: "unavailable", message: failure, unlocked: this.unlocked });
      return;
    }
    if (this.preloadTask !== null && this.buffers.size < ASSETS.length) {
      this.publish({ status: "loading", message: "Loading sound.", unlocked: this.unlocked });
      return;
    }
    if (!this.unlocked) {
      this.publish({ status: "locked", message: "Click to enable sound.", unlocked: false });
      return;
    }
    this.publish({ status: "ready", message: "Sound ready.", unlocked: true });
  }

  private publish(snapshot: AudioStatus): void {
    if (
      snapshot.status === this.snapshot.status &&
      snapshot.message === this.snapshot.message &&
      snapshot.unlocked === this.snapshot.unlocked
    )
      return;
    this.snapshot = snapshot;
    for (const subscriber of this.subscribers) subscriber();
  }
}

function boundedGain(gain: number): number {
  return Number.isFinite(gain) ? Math.min(1, Math.max(0, gain)) : 0;
}
