export type OtpDisplayProps = {
  otp: string;
  label: string;
};

export function OtpDisplay({ otp, label }: OtpDisplayProps) {
  const digits = otp.replace(/\D/g, "").slice(0, 6).padEnd(6, " ");

  return (
    <div className="ds-otp-display">
      <span className="ds-otp-display__label">{label}</span>
      <p className="ds-otp-display__value" aria-label={`${label}: ${digits.trim()}`}>
        {digits.split("").map((digit, index) => (
          <span key={index} className="ds-otp-display__digit" aria-hidden="true">
            {digit.trim() || "·"}
          </span>
        ))}
      </p>
    </div>
  );
}
