import Shell from '@/components/layout/Shell';

export default function Loading() {
  return (
    <Shell>
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-200 rounded animate-pulse mt-2" />
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 h-32">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Action Grid Skeleton */}
          <section>
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white h-24 p-4 rounded-lg border border-slate-200">
                  <div className="flex flex-col h-full justify-between">
                    <div className="w-6 h-6 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Activity & Alerts Skeleton */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6 h-64">
              <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 p-6 h-64">
              <div className="h-6 w-24 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <div className="w-2 h-2 bg-slate-200 rounded-full animate-pulse mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
