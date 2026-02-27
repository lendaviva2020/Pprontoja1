export default function Loading() {
  return (
    <div className="max-w-4xl animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 rounded-lg bg-gray-200 mb-2" />
        <div className="h-4 w-64 rounded-lg bg-gray-100" />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4">
            <div className="mb-3 h-10 w-10 rounded-xl bg-gray-100" />
            <div className="h-6 w-20 rounded-lg bg-gray-200 mb-1" />
            <div className="h-4 w-24 rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="h-5 w-40 rounded-lg bg-gray-200" />
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded-lg bg-gray-200" />
                <div className="h-3 w-32 rounded-lg bg-gray-100" />
              </div>
              <div className="h-5 w-20 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
