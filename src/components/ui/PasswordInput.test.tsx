import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordInput from "./PasswordInput";

describe("PasswordInput", () => {
  it("renders as type='password' by default", () => {
    render(<PasswordInput value="" onChange={() => {}} placeholder="Enter password" />);
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toHaveAttribute("type", "password");
  });

  it("renders the 'Show password' toggle button by default", () => {
    render(<PasswordInput value="" onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: /show password/i })
    ).toBeInTheDocument();
  });

  it("toggles to type='text' when the eye button is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordInput value="secret" onChange={() => {}} placeholder="pwd" />);
    const input = screen.getByPlaceholderText("pwd");
    const toggle = screen.getByRole("button", { name: /show password/i });

    expect(input).toHaveAttribute("type", "password");
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    // Aria label flips to "Hide password"
    expect(
      screen.getByRole("button", { name: /hide password/i })
    ).toBeInTheDocument();
  });

  it("toggles back to password when clicked a second time", async () => {
    const user = userEvent.setup();
    render(<PasswordInput value="secret" onChange={() => {}} placeholder="pwd" />);
    const input = screen.getByPlaceholderText("pwd");
    const toggle = screen.getByRole("button", { name: /show password/i });

    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("fires onChange when user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PasswordInput value="" onChange={onChange} placeholder="pwd" />);
    const input = screen.getByPlaceholderText("pwd");

    await user.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("passes through id, required, and className props", () => {
    render(
      <PasswordInput
        value=""
        onChange={() => {}}
        id="myPassword"
        required
        className="custom-class"
        placeholder="pwd"
      />
    );
    const input = screen.getByPlaceholderText("pwd");
    expect(input).toHaveAttribute("id", "myPassword");
    expect(input).toBeRequired();
    expect(input).toHaveClass("custom-class");
  });
});
