import { dbEvents } from "./dbEvents";

describe("dbEvents", () => {
  let unsub: () => void;

  afterEach(() => {
    unsub?.();
  });

  it("emit fires registered listener", () => {
    const fn = vi.fn();
    unsub = dbEvents.subscribe("activities", fn);

    dbEvents.emit("activities");

    expect(fn).toHaveBeenCalledOnce();
  });

  it("emit does not fire listener for different table", () => {
    const fn = vi.fn();
    unsub = dbEvents.subscribe("activities", fn);

    dbEvents.emit("goals");

    expect(fn).not.toHaveBeenCalled();
  });

  it("subscribe to multiple tables", () => {
    const fn = vi.fn();
    unsub = dbEvents.subscribe(["activities", "goals"], fn);

    dbEvents.emit("activities");
    dbEvents.emit("goals");

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe removes listener", () => {
    const fn = vi.fn();
    unsub = dbEvents.subscribe("activities", fn);

    unsub();
    dbEvents.emit("activities");

    expect(fn).not.toHaveBeenCalled();
  });

  it("emit on unregistered table does not throw", () => {
    unsub = () => {};
    expect(() => dbEvents.emit("nonexistent")).not.toThrow();
  });

  it("multiple listeners on same table", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const unsub1 = dbEvents.subscribe("activities", fn1);
    const unsub2 = dbEvents.subscribe("activities", fn2);
    unsub = () => {
      unsub1();
      unsub2();
    };

    dbEvents.emit("activities");

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("subscribe with single string works same as array", () => {
    const fn = vi.fn();
    unsub = dbEvents.subscribe("activities", fn);

    dbEvents.emit("activities");

    expect(fn).toHaveBeenCalledOnce();
  });
});
