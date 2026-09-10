import {
  AirplaneTiltIcon,
  CarIcon,
  CrosshairIcon,
  DoorOpenIcon,
  MapPinIcon,
  PackageIcon,
  PersonIcon,
  ShieldIcon,
  StorefrontIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import type { MapMarkerKind } from "../models/map-markers";

const markerIcons = {
  person: PersonIcon,
  police: ShieldIcon,
  vehicle: CarIcon,
  helicopter: AirplaneTiltIcon,
  business: StorefrontIcon,
  entrance: DoorOpenIcon,
  landmark: MapPinIcon,
  pickup: PackageIcon,
  target: TargetIcon,
  destination: CrosshairIcon,
};

export function MapSymbol({ kind }: { kind: MapMarkerKind }) {
  const Icon = markerIcons[kind];
  return <Icon weight="fill" size={kind === "destination" ? 16 : 14} aria-hidden="true" />;
}

export function PlayerMapSymbol({ heading }: { heading: number }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="-8 -8 16 16"
      className="astra-map-player"
      aria-hidden="true"
      style={{ transform: `rotate(${heading}rad)` }}
    >
      <path d="M0 -7 6 6 0 3 -6 6Z" />
    </svg>
  );
}
