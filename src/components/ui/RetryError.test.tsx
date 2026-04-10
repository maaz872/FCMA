import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RetryError from "./RetryError";

describe("RetryError", () => {
  const reloadMock = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reloadMock.mockClear();
    // Stub window.location.reload via Object.defineProperty since it's not writable
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        pathname: "/test-page",
        reload: reloadMock,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-reloads on first mount and sets sessionStorage flag", () => {
    render(<RetryError />);
    expect(sessionStorage.getItem("_retry_/test-page")).toBe("1");
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT auto-reload on second mount (flag already set)", () => {
    sessionStorage.setItem("_retry_/test-page", "1");
    render(<RetryError />);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("shows the error UI only after auto-retry flag is set", () => {
    sessionStorage.setItem("_retry_/test-page", "1");
    render(<RetryError message="Connection failed" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders the default message when none is provided", () => {
    sessionStorage.setItem("_retry_/test-page", "1");
    render(<RetryError />);
    expect(screen.getByText(/please try again/i)).toBeInTheDocument();
  });

  it("clicking 'Try Again' clears the flag and reloads", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("_retry_/test-page", "1");
    render(<RetryError />);
    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });

    await user.click(tryAgainBtn);

    expect(sessionStorage.getItem("_retry_/test-page")).toBeNull();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("returns null (renders nothing visible) on first mount while auto-retrying", () => {
    const { container } = render(<RetryError />);
    // First mount triggers reload but component returns null
    expect(container.firstChild).toBeNull();
  });
});
