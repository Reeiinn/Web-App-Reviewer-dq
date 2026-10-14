import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/**
 * The roster table, still loading.
 *
 * The navy header row renders for real — its column names are fixed and owe
 * nothing to the query — so the table reads as itself from the first frame and
 * only the cells fill in. Eight rows rather than the full page of fifteen:
 * enough to reach the fold, without claiming a row count nobody has counted
 * yet.
 */
export function RosterTableSkeleton({ isAdmin }: { isAdmin: boolean }) {
  const headings = [
    "Reviewee / Candidate",
    ...(isAdmin ? ["Recruited By"] : []),
    "Overall Readiness",
    "Mastery by Exam",
    "Memorize Acc.",
    "Practice Exams",
    "Activity",
    "Status",
    "Actions",
  ];

  return (
    <LoadingRegion label="Loading roster" className="rv-card mt-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className={`w-full text-left text-sm ${
            isAdmin ? "min-w-[1320px]" : "min-w-[1100px]"
          }`}
        >
          <thead className="bg-[#0B2340] text-white">
            <tr>
              {headings.map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="whitespace-nowrap px-5 py-4 text-[11px] font-bold uppercase tracking-wide"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: 8 }, (_, row) => (
              <tr key={row} className="border-t border-border align-top">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </td>

                {isAdmin && (
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  </td>
                )}

                {Array.from({ length: 4 }, (_, meter) => (
                  <td key={meter} className="px-5 py-4">
                    <Skeleton className="h-3.5 w-12" />
                    <Skeleton className="mt-2 h-1.5 w-24 rounded-full" />
                  </td>
                ))}

                <td className="px-5 py-4">
                  <Skeleton className="h-3.5 w-20" />
                </td>
                <td className="px-5 py-4">
                  <Skeleton className="h-6 w-24 rounded-full" />
                </td>
                <td className="px-5 py-4">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LoadingRegion>
  );
}
