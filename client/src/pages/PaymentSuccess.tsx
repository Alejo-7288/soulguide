import { Button } from "@/components/ui/button";
import { Link, useSearch } from "wouter";
import { CheckCircle } from "lucide-react";
import { useMemo } from "react";

export default function PaymentSuccess() {
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const bookingId = params.get("booking_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="elegant-card p-8 text-center max-w-md">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-medium mb-2">付款成功！</h2>
        <p className="text-muted-foreground mb-6">
          您的預約已成功付款，老師會盡快確認您的預約。
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
