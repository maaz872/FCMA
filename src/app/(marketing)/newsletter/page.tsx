"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function NewsletterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        setFirstName("");
        setLastName("");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error);
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <section className="min-h-[calc(100vh-70px)] flex items-center justify-center bg-cream px-6">
      <div className="text-center w-full">
        <h1 className="text-4xl md:text-5xl font-black mb-4">
          Famous Weekly Emails
        </h1>
        <p className="text-lg text-white/50 max-w-[500px] mx-auto">
          Get exclusive training tips, nutrition advice, and motivation
          delivered straight to your inbox every week. Join thousands who
          are already levelling up.
        </p>

        {status === "success" ? (
          <div className="max-w-[450px] mx-auto mt-10">
            <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-5 rounded-xl">
              <div className="text-3xl mb-2">&#10003;</div>
              <p className="font-semibold">{message}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-[450px] mx-auto mt-10 space-y-4">
            {status === "error" && (
              <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl text-sm">
                {message}
              </div>
            )}
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded-full border-2 border-[#2A2A2A] py-3.5 px-5 text-base outline-none focus:border-primary transition-colors bg-[#1E1E1E]"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full rounded-full border-2 border-[#2A2A2A] py-3.5 px-5 text-base outline-none focus:border-primary transition-colors bg-[#1E1E1E]"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-full border-2 border-[#2A2A2A] py-3.5 px-5 text-base outline-none focus:border-primary transition-colors bg-[#1E1E1E]"
            />
            <Button type="submit" fullWidth className={status === "loading" ? "opacity-60 pointer-events-none" : ""}>
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
