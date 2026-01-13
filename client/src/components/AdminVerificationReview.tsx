import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, XCircle, Clock, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface PendingVerification {
  id: number;
  teacherProfileId: number;
  teacherName: string;
  status: "pending" | "approved" | "rejected" | "expired";
  fileUrl: string;
  fileName: string;
  uploadedAt: Date;
  verificationTypeId: number;
}

export function AdminVerificationReview() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVerification, setSelectedVerification] = useState<PendingVerification | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Query pending verifications
  const { data: verificationData, isLoading, refetch } = trpc.superadmin.getPendingVerifications.useQuery({
    page: currentPage,
    limit: 10,
  });

  // Review verification mutation
  const reviewMutation = trpc.superadmin.reviewVerification.useMutation({
    onSuccess: () => {
      toast.success("認證已審核");
      setIsReviewDialogOpen(false);
      setReviewNotes("");
      setRejectionReason("");
      setSelectedVerification(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "審核失敗");
    },
  });

  const handleApprove = async () => {
    if (!selectedVerification) return;

    await reviewMutation.mutateAsync({
      verificationId: selectedVerification.id,
      status: "approved",
      reviewNotes: reviewNotes || undefined,
    });
  };

  const handleReject = async () => {
    if (!selectedVerification) {
      toast.error("請選擇一個認證");
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error("請填寫拒絕原因");
      return;
    }

    await reviewMutation.mutateAsync({
      verificationId: selectedVerification.id,
      status: "rejected",
      rejectionReason,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const openReviewDialog = (verification: PendingVerification) => {
    setSelectedVerification(verification);
    setReviewNotes("");
    setRejectionReason("");
    setIsReviewDialogOpen(true);
  };

  const totalPages = verificationData ? Math.ceil((verificationData.total as number) / 10) : 1;
  const pendingVerifications = verificationData?.verifications || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">認證審核</h3>
        <p className="text-sm text-muted-foreground">審核和管理教師上傳的認證文件</p>
      </div>

      {/* Verification List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="elegant-card h-24 animate-pulse bg-muted" />
            ))}
          </div>
        ) : pendingVerifications && pendingVerifications.length > 0 ? (
          <>
            {pendingVerifications.map((verification: PendingVerification) => (
              <Card key={verification.id} className="hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-medium">{verification.teacherName}</h4>
                        <Badge variant="secondary">待審核</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{verification.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        上傳於 {format(new Date(verification.uploadedAt), "yyyy年MM月dd日 HH:mm", { locale: zhTW })}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(verification.fileUrl, "_blank")}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        查看
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openReviewDialog(verification)}
                        className="gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        審核
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(currentPage - 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(currentPage + 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">沒有待審核的認證</p>
              <p className="text-sm text-muted-foreground mt-1">所有認證都已審核完成</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>審核認證</DialogTitle>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-4">
              {/* Verification Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">認證詳情</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">教師名稱</p>
                      <p className="font-medium">{selectedVerification.teacherName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">文件名稱</p>
                      <p className="font-medium">{selectedVerification.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">上傳時間</p>
                      <p className="font-medium">
                        {format(new Date(selectedVerification.uploadedAt), "yyyy年MM月dd日 HH:mm", { locale: zhTW })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">狀態</p>
                      <Badge variant="secondary">待審核</Badge>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => window.open(selectedVerification.fileUrl, "_blank")}
                    >
                      <Download className="w-4 h-4" />
                      下載並查看文件
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Review Notes */}
              <div>
                <Label htmlFor="review-notes">審核備註（可選）</Label>
                <Textarea
                  id="review-notes"
                  placeholder="輸入審核備註，將顯示給教師..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-2 min-h-24"
                />
              </div>

              {/* Rejection Reason */}
              <div>
                <Label htmlFor="rejection-reason">拒絕原因（如果拒絕）</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="如果拒絕此認證，請說明原因..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-2 min-h-20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={reviewMutation.isPending}
                  className="flex-1 gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  拒絕
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={reviewMutation.isPending}
                  className="flex-1 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  批准
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
