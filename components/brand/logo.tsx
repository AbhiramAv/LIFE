import Image from "next/image";

type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
};

export function Logo({ size = 28, showWordmark = true, subtitle = "lifetime dashboard" }: LogoProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="shrink-0 overflow-hidden rounded-lg"
        style={{ width: size, height: size }}
      >
        <Image
          src="/brand/life-signal-logo.png"
          alt="LIFE"
          width={size}
          height={size}
          className="object-cover w-full h-full"
          priority
        />
      </div>
      {showWordmark && (
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight leading-none">LIFE</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}
