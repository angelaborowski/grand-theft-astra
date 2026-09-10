import { gameLogo } from "./game-artwork";

/** Shared title artwork keeps every screen on the same approved identity. */
export function GameBrand({ size = "title" }: { size?: "title" | "loading" | "compact" }) {
  return (
    <div className={`astra-brand astra-brand-${size}`}>
      <img src={gameLogo} alt="Grand Theft Astra" width={1536} height={1024} />
      <span className="astra-brand-city">Moscow</span>
    </div>
  );
}
