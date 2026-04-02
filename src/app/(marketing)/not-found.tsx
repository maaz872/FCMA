import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="min-h-[calc(100vh-70px)] flex items-center justify-center bg-cream px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-primary mb-4">404</div>
        <h1 className="text-2xl font-black mb-3">Page Not Found</h1>
        <p className="text-white/50 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Button href="/">Go Home</Button>
          <Button href="/nutrition" variant="outline">
            View The Hub
          </Button>
        </div>
      </div>
    </section>
  );
}
