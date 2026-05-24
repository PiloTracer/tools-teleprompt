import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isSpeechRecognitionSupported,
  useSpeechTracker,
} from "../../src/prompter/adaptive/useSpeechTracker";
import type { ParsedScriptLine } from "../../src/prompter/adaptive/types";

function spoken(index: number, text: string): ParsedScriptLine {
  return { index, text, kind: "spoken" };
}

const SAMPLE_LINES: ParsedScriptLine[] = [
  spoken(0, "Welcome to the show, everyone."),
  spoken(1, "Tonight we have a very special guest."),
  spoken(2, "Please give a warm welcome to our guest."),
  spoken(3, "Thank you for joining us today."),
];

// ---------------------------------------------------------------------------
// isSpeechRecognitionSupported
// ---------------------------------------------------------------------------
describe("isSpeechRecognitionSupported", () => {
  beforeEach(() => {
    // Clean any prior mocks on window
    delete (window as Record<string, unknown>)["SpeechRecognition"];
    delete (window as Record<string, unknown>)["webkitSpeechRecognition"];
  });

  it("returns false when neither SpeechRecognition nor webkitSpeechRecognition exists", () => {
    expect(isSpeechRecognitionSupported()).toBe(false);
  });

  it("returns true when SpeechRecognition is defined", () => {
    (window as Record<string, unknown>)["SpeechRecognition"] = class MockSR {};
    expect(isSpeechRecognitionSupported()).toBe(true);
    delete (window as Record<string, unknown>)["SpeechRecognition"];
  });

  it("returns true when only webkitSpeechRecognition is defined", () => {
    (window as Record<string, unknown>)["webkitSpeechRecognition"] = class MockSR {};
    expect(isSpeechRecognitionSupported()).toBe(true);
    delete (window as Record<string, unknown>)["webkitSpeechRecognition"];
  });
});

// ---------------------------------------------------------------------------
// useSpeechTracker — no recognition support
// ---------------------------------------------------------------------------
describe("useSpeechTracker — unsupported browser", () => {
  beforeEach(() => {
    delete (window as Record<string, unknown>)["SpeechRecognition"];
    delete (window as Record<string, unknown>)["webkitSpeechRecognition"];
  });

  it("reports supported=false when API is absent", () => {
    const { result } = renderHook(() =>
      useSpeechTracker({ enabled: true, listen: true, parsedLines: SAMPLE_LINES }),
    );
    expect(result.current.supported).toBe(false);
  });

  it("readingLineIndex is null when unsupported", () => {
    const { result } = renderHook(() =>
      useSpeechTracker({ enabled: true, listen: true, parsedLines: SAMPLE_LINES }),
    );
    expect(result.current.readingLineIndex).toBeNull();
  });

  it("active is false when unsupported", () => {
    const { result } = renderHook(() =>
      useSpeechTracker({ enabled: false, listen: false, parsedLines: SAMPLE_LINES }),
    );
    expect(result.current.active).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useSpeechTracker — supported browser with mock recognition
// ---------------------------------------------------------------------------
describe("useSpeechTracker — supported browser", () => {
  // Minimal SpeechRecognition mock
  type EventHandlers = {
    onstart?: () => void;
    onresult?: (e: SpeechRecognitionEvent) => void;
    onerror?: (e: SpeechRecognitionErrorEvent) => void;
    onend?: () => void;
  };

  let mockInstance: EventHandlers & { start: () => void; stop: () => void };
  let MockSpeechRecognition: new () => typeof mockInstance;

  beforeEach(() => {
    mockInstance = {
      onstart: undefined,
      onresult: undefined,
      onerror: undefined,
      onend: undefined,
      start: vi.fn(() => {
        mockInstance.onstart?.();
      }),
      stop: vi.fn(),
    };

    MockSpeechRecognition = class {
      continuous = true;
      interimResults = true;
      maxAlternatives = 1;
      onstart = mockInstance.onstart;
      onresult = mockInstance.onresult;
      onerror = mockInstance.onerror;
      onend = mockInstance.onend;

      start() {
        mockInstance.start();
        mockInstance.onstart?.();
      }

      stop() {
        mockInstance.stop();
      }
    };

    // Assign handlers lazily so the hook sets them on the instance
    Object.defineProperty(MockSpeechRecognition.prototype, "onstart", {
      set(v) {
        mockInstance.onstart = v;
      },
      get() {
        return mockInstance.onstart;
      },
      configurable: true,
    });
    Object.defineProperty(MockSpeechRecognition.prototype, "onresult", {
      set(v) {
        mockInstance.onresult = v;
      },
      get() {
        return mockInstance.onresult;
      },
      configurable: true,
    });
    Object.defineProperty(MockSpeechRecognition.prototype, "onerror", {
      set(v) {
        mockInstance.onerror = v;
      },
      get() {
        return mockInstance.onerror;
      },
      configurable: true,
    });
    Object.defineProperty(MockSpeechRecognition.prototype, "onend", {
      set(v) {
        mockInstance.onend = v;
      },
      get() {
        return mockInstance.onend;
      },
      configurable: true,
    });

    (window as Record<string, unknown>)["SpeechRecognition"] = MockSpeechRecognition;
  });

  afterEach(() => {
    delete (window as Record<string, unknown>)["SpeechRecognition"];
    vi.restoreAllMocks();
  });

  it("reports supported=true", () => {
    const { result } = renderHook(() =>
      useSpeechTracker({ enabled: true, listen: true, parsedLines: SAMPLE_LINES }),
    );
    expect(result.current.supported).toBe(true);
  });

  it("does not start recognition when enabled=false", () => {
    renderHook(() =>
      useSpeechTracker({ enabled: false, listen: false, parsedLines: SAMPLE_LINES }),
    );
    expect(mockInstance.start).not.toHaveBeenCalled();
  });

  it("readingLineIndex starts as null before any speech result", () => {
    const { result } = renderHook(() =>
      useSpeechTracker({ enabled: true, listen: true, parsedLines: SAMPLE_LINES }),
    );
    expect(result.current.readingLineIndex).toBeNull();
  });
});
