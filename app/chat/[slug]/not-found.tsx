export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Chatbot Not Found</h1>
        <p className="mt-2 text-slate-600">
          The chatbot you&apos;re looking for doesn&apos;t exist or is not public.
        </p>
      </div>
    </div>
  );
}
