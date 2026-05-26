import type { ReactNode } from "react";

export type QrFrameProps = {
  src: string;
  alt: string;
  hint?: ReactNode;
  children?: ReactNode;
  imageTestId?: string;
};

export function QrFrame({ src, alt, hint, children, imageTestId }: QrFrameProps) {
  return (
    <figure className="ds-qr-frame">
      {hint ? <figcaption className="ds-qr-frame__hint">{hint}</figcaption> : null}
      <div className="ds-qr-frame__surface">
        <img
          className="ds-qr-frame__image"
          src={src}
          alt={alt}
          decoding="sync"
          data-testid={imageTestId}
        />
      </div>
      {children ? <div className="ds-qr-frame__footer">{children}</div> : null}
    </figure>
  );
}
