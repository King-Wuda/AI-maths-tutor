import Link from "next/link";
import { Review } from "./Review";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">Review</h1><Link href="/admin/stats" className="text-sm text-blue-700">Stats →</Link></div>
      <Review />
    </div>
  );
}
