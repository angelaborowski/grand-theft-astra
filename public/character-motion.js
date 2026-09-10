// Visual movement stays within 0.8 m of each authoritative interaction anchor.
export function npcPose(time, index, anchor, viewer) {
  const phase = ((time + index * 4.1) % 24 + 24) % 24;
  const angle = Math.min(phase, 8) / 8 * Math.PI * 2;
  const x = anchor.x + .4 * Math.sin(angle);
  const z = anchor.z + .4 * (1 - Math.cos(angle));
  const nearby = viewer && Math.hypot(viewer.x - x, viewer.z - z) < 4;
  return {x, z, yaw: nearby ? Math.atan2(viewer.x-x, viewer.z-z) : Math.PI/2-angle,
    clip: phase < 8 ? 'Walk' : nearby ? 'Greet' : 'Idle', speed: phase < 8 ? .42 : 1};
}
