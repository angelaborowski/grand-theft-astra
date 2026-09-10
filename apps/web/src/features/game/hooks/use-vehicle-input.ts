import { useKeyboardControls, type CameraControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { PLAYER_KEYBOARD_MAP, type PlayerKey } from "../models/player-controls";

/** One vehicle owns pointer capture; Drei retains the shared keyboard mapping. */
export function useVehicleInput(
  enabled: boolean,
  camera: RefObject<CameraControls | null>,
  actions: { exit: () => void; stop: () => void },
) {
  const { gl } = useThree();
  const [, getKeys] = useKeyboardControls<PlayerKey>();
  const blockedKeys = useRef(new Set<PlayerKey>());
  const release = useCallback(() => {
    const keys = getKeys();
    for (const entry of PLAYER_KEYBOARD_MAP)
      if (keys[entry.name]) blockedKeys.current.add(entry.name);
    if (document.pointerLockElement === gl.domElement) camera.current?.unlockPointer();
  }, [camera, getKeys, gl]);
  const active = () =>
    enabled &&
    !document.hidden &&
    document.hasFocus() &&
    !typing() &&
    document.pointerLockElement === gl.domElement;
  const stop = useEffectEvent(() => {
    release();
    actions.stop();
  });
  const keydown = useEffectEvent((event: KeyboardEvent) => {
    if (!active() || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = PLAYER_KEYBOARD_MAP.find((entry) => entry.keys.includes(event.code))?.name;
    if (key) blockedKeys.current.delete(key);
    if (event.code === "Space") event.preventDefault();
    if (event.code === "KeyF") {
      event.preventDefault();
      actions.exit();
    }
  });
  const capture = useEffectEvent((event: PointerEvent) => {
    if (!enabled || typing() || document.hidden || !document.hasFocus() || event.button !== 0)
      return;
    if (document.pointerLockElement === gl.domElement) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    camera.current?.lockPointer();
  });
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keydown(event);
    const onPointer = (event: PointerEvent) => capture(event);
    const onBlur = () => stop();
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    const onLock = () => {
      if (document.pointerLockElement !== gl.domElement) stop();
    };
    const onClick = (event: MouseEvent) => {
      if (enabled) event.stopPropagation();
    };
    const onContext = (event: MouseEvent) => {
      if (enabled && document.pointerLockElement === gl.domElement) event.preventDefault();
    };
    gl.domElement.addEventListener("pointerdown", onPointer, true);
    gl.domElement.addEventListener("click", onClick, true);
    gl.domElement.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      gl.domElement.removeEventListener("pointerdown", onPointer, true);
      gl.domElement.removeEventListener("click", onClick, true);
      gl.domElement.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerlockchange", onLock);
      release();
    };
  }, [enabled, gl, release]);
  return {
    release,
    read: () => {
      const keys = getKeys();
      for (const key of blockedKeys.current) if (!keys[key]) blockedKeys.current.delete(key);
      const available = active();
      const key = (name: PlayerKey) => available && keys[name] && !blockedKeys.current.has(name);
      return {
        active: available,
        forward: Number(key("forward")) - Number(key("backward")),
        right: Number(key("rightward")) - Number(key("leftward")),
        ascend: Number(key("brake")) - Number(key("run")),
        turn: Number(key("turnRight")) - Number(key("turnLeft")),
        brake: key("brake"),
      };
    },
  };
}

function typing(): boolean {
  const target = document.activeElement;
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input,textarea,select"))
  );
}
