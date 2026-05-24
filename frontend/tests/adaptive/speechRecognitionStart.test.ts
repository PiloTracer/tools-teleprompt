import { describe, expect, it, vi } from "vitest";

import { startSpeechRecognition } from "../../src/prompter/adaptive/speechRecognitionStart";

describe("startSpeechRecognition", () => {
  it("starts with a live audio track when supported", () => {
    const rec = {
      start: vi.fn(),
    } as unknown as SpeechRecognition;
    const track = {
      kind: "audio",
      readyState: "live",
    } as MediaStreamTrack;

    const result = startSpeechRecognition(rec, track);

    expect(result).toEqual({ ok: true, mode: "track" });
    expect(rec.start).toHaveBeenCalledWith(track);
  });

  it("reports track start failure without auto-falling back", () => {
    const rec = {
      start: vi.fn(function (this: SpeechRecognition, track?: MediaStreamTrack) {
        if (track) {
          throw new Error("track start unsupported");
        }
      }),
    } as unknown as SpeechRecognition;
    const track = {
      kind: "audio",
      readyState: "live",
    } as MediaStreamTrack;

    const result = startSpeechRecognition(rec, track);

    expect(result).toEqual({
      ok: false,
      error: expect.any(Error),
      trackStartFailed: true,
    });
    expect(rec.start).toHaveBeenCalledTimes(1);
  });

  it("uses default start when no track is provided", () => {
    const rec = {
      start: vi.fn(),
    } as unknown as SpeechRecognition;

    const result = startSpeechRecognition(rec, null);

    expect(result).toEqual({ ok: true, mode: "default" });
    expect(rec.start).toHaveBeenCalledWith();
  });
});
