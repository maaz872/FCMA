import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FavouriteButton from "./FavouriteButton";

describe("FavouriteButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders unfavourited by default", () => {
    render(<FavouriteButton type="recipe" itemId={1} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Add to favourites");
  });

  it("renders favourited when initialFavourited is true", () => {
    render(
      <FavouriteButton type="recipe" itemId={1} initialFavourited={true} />
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Remove from favourites");
  });

  it("toggles optimistically on click and confirms with API response", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ favourited: true }), { status: 200 })
      );

    render(<FavouriteButton type="recipe" itemId={42} />);
    const button = screen.getByRole("button");

    await user.click(button);

    // After click + API response resolves, button should show favourited state
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-label", "Remove from favourites")
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/favourites",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ recipeId: 42 }),
      })
    );
  });

  it("reverts state when API call fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("err", { status: 500 })
    );

    render(<FavouriteButton type="recipe" itemId={1} />);
    const button = screen.getByRole("button");

    // Initial state: unfavourited
    expect(button).toHaveAttribute("aria-label", "Add to favourites");

    await user.click(button);

    // After error, button should revert to unfavourited
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-label", "Add to favourites")
    );
  });

  it("reverts state when fetch throws a network error", async () => {
    const user = userEvent.setup();
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("network"));

    render(
      <FavouriteButton type="recipe" itemId={1} initialFavourited={true} />
    );
    const button = screen.getByRole("button");

    // Initial: favourited
    expect(button).toHaveAttribute("aria-label", "Remove from favourites");

    await user.click(button);

    // After error, revert to favourited
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-label", "Remove from favourites")
    );
  });
});
