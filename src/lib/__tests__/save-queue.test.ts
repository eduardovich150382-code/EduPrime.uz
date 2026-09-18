import { describe, expect, it, vi } from "vitest";
import { createSaveQueue, SaveQueueClosedError } from "@/lib/save-queue";

/** Qo'lda boshqariladigan promise — bajarilish tartibini aniq tekshirish uchun. */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createSaveQueue", () => {
  it("ikkinchi ishni birinchisi tugagandan KEYIN boshlaydi", async () => {
    const queue = createSaveQueue();
    const events: string[] = [];
    const first = deferred();

    const a = queue.enqueue(async () => {
      events.push("a:start");
      await first.promise;
      events.push("a:end");
    });
    const b = queue.enqueue(async () => {
      events.push("b:start");
    });

    // `b` navbatga qo'shildi, lekin `a` hali tugamagan — boshlanmasligi kerak
    await Promise.resolve();
    expect(events).toEqual(["a:start"]);

    first.resolve();
    await Promise.all([a, b]);
    expect(events).toEqual(["a:start", "a:end", "b:start"]);
  });

  it("busy — ketayotgan ish davomida true, tugagach false", async () => {
    const queue = createSaveQueue();
    const gate = deferred();

    expect(queue.busy).toBe(false);
    const run = queue.enqueue(() => gate.promise);
    expect(queue.busy).toBe(true);

    gate.resolve();
    await run;
    expect(queue.busy).toBe(false);
  });

  it("avtosaqlash busy holatda o'zini o'tkazib yuboradi (sahifadagi shart)", async () => {
    const queue = createSaveQueue();
    const gate = deferred();
    const autosave = vi.fn();

    const manual = queue.enqueue(() => gate.promise);
    // Sahifadagi mantiq: busy bo'lsa umuman navbatga qo'shilmaydi
    if (!queue.busy && !queue.closed) queue.enqueue(async () => autosave());
    expect(autosave).not.toHaveBeenCalled();

    gate.resolve();
    await manual;
  });

  it("close() dan keyin yangi ish ishga tushmaydi", async () => {
    const queue = createSaveQueue();
    const task = vi.fn(async () => {});

    queue.close();
    expect(queue.closed).toBe(true);
    await expect(queue.enqueue(task)).rejects.toBeInstanceOf(SaveQueueClosedError);
    expect(task).not.toHaveBeenCalled();
  });

  it("bitta ish yiqilsa keyingisi baribir ishlaydi, xato esa chaqiruvchiga yetadi", async () => {
    const queue = createSaveQueue();
    const second = vi.fn(async () => "ok");

    const failing = queue.enqueue(async () => {
      throw new Error("tarmoq uzildi");
    });
    const next = queue.enqueue(second);

    await expect(failing).rejects.toThrow("tarmoq uzildi");
    await expect(next).resolves.toBe("ok");
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("navbat bo'shagach busy qaytadan false bo'ladi (avtosaqlash davom etadi)", async () => {
    const queue = createSaveQueue();
    await queue.enqueue(async () => {});
    expect(queue.busy).toBe(false);
    expect(queue.closed).toBe(false);
  });
});
