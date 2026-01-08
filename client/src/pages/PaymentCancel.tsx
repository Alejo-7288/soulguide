import { Button } from "@/components/ui/button";
import { Link, useSearch } from "wouter";
import { XCircle } from "lucide-react";
import { useMemo } from "react";

export default function PaymentCancel() {
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const bookingId = params.get("booking_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="elegant-card p-8 text-center max-w-md">
        <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-medium mb-2">付款已取消</h2>
        <p className="text-muted-foreground mb-6">
          您已取消付款。您的預約仍然有效，可以稍後再進行付款。
        </p>
        <div className="space-y-3">
          <Link href="/dashboard">
            <Button className="w-full gold-gradient text-foreground hover:opacity-90">
              查看我的預約
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              返回首頁
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
