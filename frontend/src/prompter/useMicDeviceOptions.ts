import { useCallback, useEffect, useMemo, useState } from "react";

import {
  enumerateMicDevices,
  ensureMicPermission,
  mergeMicDeviceOptions,
  type MicDeviceOption,
} from "./adaptive/micDevice";

export function useMicDeviceOptions(
  enabled: boolean,
  preferredDeviceId: string,
  preferredDeviceLabel: string,
) {
  const [devices, setDevices] = useState<MicDeviceOption[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setDevices([]);
      return;
    }
    setLoading(true);
    try {
      await ensureMicPermission(preferredDeviceId);
      setDevices(await enumerateMicDevices());
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, preferredDeviceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const options = useMemo(
    () => mergeMicDeviceOptions(devices, preferredDeviceId, preferredDeviceLabel),
    [devices, preferredDeviceId, preferredDeviceLabel],
  );

  return { devices: options, loading, refresh };
}
