import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTimer } from "./useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("isRunning=false, elapsedTime=0, getElapsedSeconds()=0, getStartDate()=null", () => {
      const { result } = renderHook(() => useTimer("act-1"));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.getElapsedSeconds()).toBe(0);
      expect(result.current.getStartDate()).toBeNull();
    });
  });

  describe("start()", () => {
    it("sets isRunning=true, saves to localStorage, returns true", () => {
      const { result } = renderHook(() => useTimer("act-1"));

      let started: boolean | undefined;
      act(() => {
        started = result.current.start();
      });

      expect(started).toBe(true);
      expect(result.current.isRunning).toBe(true);

      const stored = localStorage.getItem("timer_act-1");
      expect(stored).not.toBeNull();
      const data = JSON.parse(stored!);
      expect(data.activityId).toBe("act-1");
      expect(data.isRunning).toBe(true);
      expect(typeof data.startTime).toBe("number");
    });
  });

  describe("stop()", () => {
    it("sets isRunning=false and removes from localStorage", () => {
      const { result } = renderHook(() => useTimer("act-1"));

      act(() => {
        result.current.start();
      });
      expect(result.current.isRunning).toBe(true);
      expect(localStorage.getItem("timer_act-1")).not.toBeNull();

      act(() => {
        result.current.stop();
      });

      expect(result.current.isRunning).toBe(false);
      expect(localStorage.getItem("timer_act-1")).toBeNull();
    });
  });

  describe("reset()", () => {
    it("resets all state and removes from localStorage", () => {
      const { result } = renderHook(() => useTimer("act-1"));

      act(() => {
        result.current.start();
      });

      // Advance time so elapsedTime > 0
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.elapsedTime).toBeGreaterThan(0);

      act(() => {
        result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.getElapsedSeconds()).toBe(0);
      expect(result.current.getStartDate()).toBeNull();
      expect(localStorage.getItem("timer_act-1")).toBeNull();
    });
  });

  describe("start() with another timer running", () => {
    it("returns false and does not start", () => {
      // Set up another running timer in localStorage
      localStorage.setItem(
        "timer_other-act",
        JSON.stringify({
          activityId: "other-act",
          startTime: Date.now() - 1000,
          isRunning: true,
        }),
      );

      const { result } = renderHook(() => useTimer("act-1"));

      let started: boolean | undefined;
      act(() => {
        started = result.current.start();
      });

      expect(started).toBe(false);
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe("localStorage restore", () => {
    it("restores running timer from localStorage", () => {
      const storedStartTime = Date.now() - 10000; // 10 seconds ago
      localStorage.setItem(
        "timer_act-1",
        JSON.stringify({
          activityId: "act-1",
          startTime: storedStartTime,
          isRunning: true,
        }),
      );

      const { result } = renderHook(() => useTimer("act-1"));

      expect(result.current.isRunning).toBe(true);
      expect(result.current.elapsedTime).toBe(10000);
      expect(result.current.getStartDate()?.getTime()).toBe(storedStartTime);
    });

    it("removes invalid JSON from localStorage", () => {
      localStorage.setItem("timer_act-1", "not-valid-json{{{");

      renderHook(() => useTimer("act-1"));

      expect(localStorage.getItem("timer_act-1")).toBeNull();
    });
  });

  describe("getElapsedSeconds", () => {
    it("calculates floor of elapsedTime / 1000", () => {
      const storedStartTime = Date.now() - 5500; // 5.5 seconds ago
      localStorage.setItem(
        "timer_act-1",
        JSON.stringify({
          activityId: "act-1",
          startTime: storedStartTime,
          isRunning: true,
        }),
      );

      const { result } = renderHook(() => useTimer("act-1"));

      expect(result.current.getElapsedSeconds()).toBe(5);
    });
  });

  describe("getStartDate", () => {
    it("returns Date object from startTime when timer is started", () => {
      const { result } = renderHook(() => useTimer("act-1"));

      act(() => {
        result.current.start();
      });

      const startDate = result.current.getStartDate();
      expect(startDate).toBeInstanceOf(Date);
      expect(startDate?.getTime()).toBe(Date.now());
    });

    it("returns null when timer has not been started", () => {
      const { result } = renderHook(() => useTimer("act-1"));

      expect(result.current.getStartDate()).toBeNull();
    });
  });

  describe("interval updates elapsedTime", () => {
    it("updates elapsedTime every 100ms while running", () => {
      const { result } = renderHook(() => useTimer("act-1"));

      act(() => {
        result.current.start();
      });

      const initialElapsed = result.current.elapsedTime;

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.elapsedTime).toBeGreaterThan(initialElapsed);
    });
  });
});
