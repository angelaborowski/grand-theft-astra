import { EntityIdSchema, type EntityId } from "@gpta/core/world";
import { useKeyboardControls, type CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { Raycaster, Vector3, type Object3D } from "three";
import { DIRECTION_KEYS, PLAYER_KEYBOARD_MAP, type PlayerKey } from "../models/player-controls";

type InputActions = {
  jump: () => void;
  crouch: () => void;
  primary: (yaw: number, pitch: number) => void;
  reload: () => void;
  interact: (targetId: EntityId | null) => void;
  vehicle: (targetId: EntityId | null) => void;
  target: (targetId: EntityId | null) => void;
  aim?: (aiming: boolean) => void;
  stop: () => void;
};

/** Keys move whenever play is active; pointer capture only gates mouse look, aim, and fire. */
export function useCharacterInput({
  enabled,
  camera,
  actions,
}: {
  enabled: boolean;
  camera: RefObject<CameraControls | null>;
  actions: InputActions;
}) {
  const { gl, camera: view, scene } = useThree();
  const [, getKeys] = useKeyboardControls<PlayerKey>();
  const aiming = useRef(false);
  const publishedAim = useRef(false);
  const needsDirection = useRef(false);
  const blockedKeys = useRef(new Set<PlayerKey>());
  const direction = useRef(new Vector3());
  const ray = useRef(new Raycaster());
  const lastTarget = useRef<EntityId | null>(null);
  const targetCheckedAt = useRef(0);
  const active = () => enabled && !document.hidden && document.hasFocus() && !textEntryIsFocused();
  const captured = () => pointerCaptured(gl.domElement);
  const readAim = () => {
    view.getWorldDirection(direction.current);
    return {
      yaw: Math.atan2(direction.current.x, -direction.current.z),
      pitch: Math.asin(direction.current.y),
    };
  };
  const clear = useCallback(() => {
    aiming.current = false;
    needsDirection.current = true;
    const keys = getKeys();
    for (const entry of PLAYER_KEYBOARD_MAP) {
      if (keys[entry.name]) blockedKeys.current.add(entry.name);
    }
  }, [getKeys]);
  const release = useCallback(() => {
    clear();
    if (pointerCaptured(gl.domElement)) camera.current?.unlockPointer();
  }, [camera, clear, gl]);
  const stop = useEffectEvent(() => {
    release();
    if (lastTarget.current !== null) {
      lastTarget.current = null;
      actions.target(null);
    }
    actions.stop();
  });
  const target = () => {
    view.getWorldDirection(direction.current);
    ray.current.far = 12;
    ray.current.set(view.position, direction.current);
    for (const hit of ray.current.intersectObjects(scene.children, true)) {
      if (hasLocalCharacter(hit.object)) continue;
      let object: Object3D | null = hit.object;
      while (object) {
        const id = EntityIdSchema.safeParse(object.userData.entityId);
        if (id.success) return id.data;
        object = object.parent;
      }
      if (hit.object.visible) return null;
    }
    return null;
  };
  const keydown = useEffectEvent((event: KeyboardEvent) => {
    if (!active() || event.repeat || event.metaKey || event.altKey) return;
    const key = PLAYER_KEYBOARD_MAP.find((entry) => entry.keys.includes(event.code))?.name;
    if (key) {
      blockedKeys.current.delete(key);
      if (DIRECTION_KEYS.some((directionKey) => directionKey === key))
        needsDirection.current = false;
    }
    if (event.code === "Space") {
      event.preventDefault();
      actions.jump();
    } else if (event.code === "ControlLeft" || event.code === "ControlRight") {
      event.preventDefault();
      actions.crouch();
    } else if (!event.ctrlKey && event.code === "KeyR") actions.reload();
    else if (!event.ctrlKey && event.code === "KeyE") actions.interact(target());
    else if (!event.ctrlKey && event.code === "KeyF") actions.vehicle(target());
  });
  const pointerdown = useEffectEvent((event: PointerEvent) => {
    if (!active()) return;
    if (!captured()) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      camera.current?.lockPointer();
      return;
    }
    if (event.button === 0) {
      const aim = readAim();
      actions.primary(aim.yaw, aim.pitch);
    } else if (event.button === 2) aiming.current = true;
  });
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled]);
  useEffect(() => {
    const onDown = (event: PointerEvent) => pointerdown(event);
    const onUp = (event: PointerEvent) => {
      if (event.button === 2) aiming.current = false;
    };
    const onKey = (event: KeyboardEvent) => keydown(event);
    const onBlur = () => stop();
    const onLock = () => {
      if (!pointerCaptured(gl.domElement)) stop();
    };
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    const consumeClick = (event: MouseEvent) => {
      if (enabled) event.stopPropagation();
    };
    const consumeContext = (event: MouseEvent) => {
      if (enabled && pointerCaptured(gl.domElement)) event.preventDefault();
    };
    gl.domElement.addEventListener("pointerdown", onDown, true);
    gl.domElement.addEventListener("click", consumeClick, true);
    gl.domElement.addEventListener("contextmenu", consumeContext);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      gl.domElement.removeEventListener("pointerdown", onDown, true);
      gl.domElement.removeEventListener("click", consumeClick, true);
      gl.domElement.removeEventListener("contextmenu", consumeContext);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerlockchange", onLock);
      release();
    };
  }, [enabled, gl, release]);
  useFrame(({ clock }) => {
    const nextAim = active() && captured() && aiming.current;
    if (nextAim !== publishedAim.current) {
      publishedAim.current = nextAim;
      actions.aim?.(nextAim);
    }
    if (clock.elapsedTime - targetCheckedAt.current < 0.1) return;
    targetCheckedAt.current = clock.elapsedTime;
    const next = active() ? target() : null;
    if (next === lastTarget.current) return;
    lastTarget.current = next;
    actions.target(next);
  });
  return {
    release,
    read: () => {
      const keys = getKeys();
      for (const key of blockedKeys.current) {
        if (!keys[key]) blockedKeys.current.delete(key);
      }
      const available = active();
      const key = (name: PlayerKey) =>
        available && !needsDirection.current && keys[name] && !blockedKeys.current.has(name);
      return {
        active: available,
        forward: Number(key("forward")) - Number(key("backward")),
        right: Number(key("rightward")) - Number(key("leftward")),
        run: key("run"),
        aim: available && captured() && aiming.current,
        ...readAim(),
      };
    },
  };
}

/** CameraControls locks the Fiber event root, which wraps the canvas rather than being it. */
export function pointerCaptured(canvas: HTMLElement): boolean {
  return document.pointerLockElement?.contains(canvas) === true;
}

function textEntryIsFocused(): boolean {
  const element = document.activeElement;
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable || element.matches("input, textarea, select"))
  );
}

function hasLocalCharacter(object: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    if (current.userData.localCharacter === true) return true;
    current = current.parent;
  }
  return false;
}
