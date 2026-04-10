"use client";

import { useState } from "react";

interface FavouriteButtonProps {
  type: "recipe";
  itemId: number;
  initialFavourited?: boolean;
  className?: string;
}

export default function FavouriteButton({
  itemId,
  initialFavourited = false,
  className = "",
}: FavouriteButtonProps) {
  const [favourited, setFavourited] = useState(initialFavourited);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    // Optimistic update
    setFavourited((prev) => !prev);
    setLoading(true);

    try {
      const res = await fetch("/api/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: itemId }),
      });

      if (!res.ok) {
        // Revert on error
        setFavourited((prev) => !prev);
        return;
      }

      const data = await res.json();
      setFavourited(data.favourited);
    } catch {
      // Revert on error
      setFavourited((prev) => !prev);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
        favourited
          ? "bg-[#E51A1A] text-white shadow-lg shadow-[#E51A1A]/30"
          : "bg-black/50 text-white/70 hover:bg-black/70 hover:text-white backdrop-blur-sm"
      } ${className}`}
      aria-label={favourited ? "Remove from favourites" : "Add to favourites"}
    >
      <svg
        className="w-4.5 h-4.5"
        viewBox="0 0 24 24"
        fill={favourited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        />
      </svg>
    </button>
  );
}
