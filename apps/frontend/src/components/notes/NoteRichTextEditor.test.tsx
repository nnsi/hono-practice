import { NOTE_RICH_TEXT_EDITOR_SOURCE } from "@packages/frontend-shared/utils/noteRichText";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { NoteRichTextEditor } from "./NoteRichTextEditor";

vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

it("古い入力の親からの反映を無視し、最新入力の反映後は外部更新を受け取る", () => {
  const onChange = vi.fn();
  const view = render(
    <NoteRichTextEditor value="" onChange={onChange} placeholder="note" />,
  );
  const frame = view.container.querySelector("iframe")!;
  const hostMessage = vi.spyOn(frame.contentWindow!, "postMessage");
  const receive = (payload: object) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: frame.contentWindow,
        data: { source: NOTE_RICH_TEXT_EDITOR_SOURCE, ...payload },
      }),
    );
  };
  act(() => receive({ type: "ready" }));
  hostMessage.mockClear();

  // iframe が二つの変更を送った後、親が古い方を先に commit する。
  act(() => {
    receive({ type: "change", html: "<p>af</p>" });
    receive({ type: "change", html: "<p>after</p>" });
  });
  expect(onChange.mock.calls.map(([value]) => value)).toEqual(["af", "after"]);
  view.rerender(
    <NoteRichTextEditor value="af" onChange={onChange} placeholder="note" />,
  );
  expect(hostMessage).not.toHaveBeenCalled();

  view.rerender(
    <NoteRichTextEditor value="after" onChange={onChange} placeholder="note" />,
  );
  expect(hostMessage).not.toHaveBeenCalled();

  // 過去に入力した値でも、入力の反映が完了した後の変更は外部更新。
  view.rerender(
    <NoteRichTextEditor value="af" onChange={onChange} placeholder="note" />,
  );
  expect(hostMessage).toHaveBeenCalledWith(
    JSON.stringify({ type: "set-html", html: "<p>af</p>" }),
    "*",
  );
});

it("親の反映前に元の値へ戻す入力も通知する", () => {
  const onChange = vi.fn();
  const view = render(
    <NoteRichTextEditor value="" onChange={onChange} placeholder="note" />,
  );
  const frame = view.container.querySelector("iframe")!;
  const receive = (type: string, html?: string) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: frame.contentWindow,
        data: { source: NOTE_RICH_TEXT_EDITOR_SOURCE, type, html },
      }),
    );
  };
  act(() => receive("ready"));
  act(() => {
    receive("change", "<p>after</p>");
    receive("change", "<p><br></p>");
  });
  expect(onChange.mock.calls.map(([value]) => value)).toEqual(["after", ""]);
});
