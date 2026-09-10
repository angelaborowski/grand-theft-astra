/** Reserve credit for both the in-flight sample and the next sample. */
export function boundedDrivingSpeed(
  speed: number,
  distanceSinceSample: number,
  delta: number,
): number {
  const remaining = Math.max(0, 3.5 - distanceSinceSample);
  const maximum = remaining / Math.max(delta, 1 / 30);
  return Math.sign(speed) * Math.min(Math.abs(speed), maximum);
}
