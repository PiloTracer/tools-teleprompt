import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

export type ToggleSize = "default" | "compact";

export type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label: ReactNode;
  description?: ReactNode;
  size?: ToggleSize;
};

function joinClasses(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  {
    label,
    description,
    size = "default",
    className,
    id: idProp,
    disabled,
    checked,
    defaultChecked,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <label
      htmlFor={id}
      className={joinClasses("ds-toggle", className)}
      data-size={size === "compact" ? "compact" : undefined}
    >
      <span className="ds-toggle__text">
        <span className="ds-toggle__label">{label}</span>
        {description ? <span className="ds-toggle__description">{description}</span> : null}
      </span>
      <span className="ds-toggle__control">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          role="switch"
          disabled={disabled}
          checked={checked}
          defaultChecked={defaultChecked}
          aria-checked={checked !== undefined ? checked : undefined}
          {...props}
        />
        <span className="ds-toggle__track" aria-hidden="true">
          <span className="ds-toggle__thumb" />
        </span>
      </span>
    </label>
  );
});
