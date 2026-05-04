import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="text-center">
        <h1 className="mb-3 text-4xl font-bold">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
