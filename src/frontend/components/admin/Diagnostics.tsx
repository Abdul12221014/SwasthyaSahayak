export default function Diagnostics() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Diagnostics Panel</h2>
      <div className="grid gap-3">
        <div className="p-3 rounded bg-gradient-to-r from-teal-500 to-green-500 text-white">Tailwind Gradient OK ✅</div>
        <div className="p-3 rounded bg-zinc-100 border">Plain CSS OK ✅</div>
      </div>
    </div>
  );
}
