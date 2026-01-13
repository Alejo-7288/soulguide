import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, Clock, Mail, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export function TeacherApprovalPanel() {
  const [page, setPage] = useState(1);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading, refetch } = trpc.superadmin.getPendingTeachers.useQuery({ 
    page, 
    limit: 10 
  });

  const approveMutation = trpc.superadmin.approveTeacher.useMutation({
    onSuccess: () => {
      toast.success("師傅已批准");
      setShowApproveDialog(false);
      setApprovalNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "批准失敗");
    },
  });

  const rejectMutation = trpc.superadmin.rejectTeacher.useMutation({
    onSuccess: () => {
      toast.success("師傅申請已拒絕");
      setShowRejectDialog(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "拒絕失敗");
    },
  });

  const handleApprove = (teacher: any) => {
    setSelectedTeacher(teacher);
    setShowApproveDialog(true);
  };

  const handleReject = (teacher: any) => {
    setSelectedTeacher(teacher);
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (!selectedTeacher) return;
    approveMutation.mutate({
      teacherId: selectedTeacher.id,
      approvalNotes: approvalNotes || undefined,
    });
  };

  const confirmReject = () => {
    if (!selectedTeacher) return;
    if (!rejectionReason.trim()) {
      toast.error("請填寫拒絕原因");
      return;
    }
    rejectMutation.mutate({
      teacherId: selectedTeacher.id,
      rejectionReason,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (!data || data.teachers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>師傅審核</CardTitle>
          <CardDescription>目前沒有待審核的師傅申請</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">師傅審核</h2>
          <p className="text-muted-foreground">
            共 {data.total} 個待審核申請
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {data.teachers.map((teacher) => (
          <Card key={teacher.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={teacher.avatarUrl || undefined} />
                    <AvatarFallback>
                      {teacher.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{teacher.displayName}</CardTitle>
                    {teacher.title && (
                      <CardDescription>{teacher.title}</CardDescription>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {teacher.submittedAt && format(new Date(teacher.submittedAt), "PPP", { locale: zhTW })}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">{teacher.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {teacher.bio && (
                <div>
                  <h4 className="font-semibold mb-2">簡介</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {teacher.bio}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {teacher.region && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {teacher.region}
                  </div>
                )}
                {teacher.contactEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {teacher.contactEmail}
                  </div>
                )}
                {teacher.contactPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {teacher.contactPhone}
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <strong>用戶資料：</strong> {teacher.userName} ({teacher.userEmail})
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedTeacher(teacher)}
              >
                <Eye className="h-4 w-4 mr-2" />
                查看詳情
              </Button>
              <Button
                variant="default"
                onClick={() => handleApprove(teacher)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                批准
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(teacher)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                拒絕
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 分頁 */}
      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一頁
          </Button>
          <div className="flex items-center px-4">
            第 {page} / {data.totalPages} 頁
          </div>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            下一頁
          </Button>
        </div>
      )}

      {/* 批准對話框 */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批准師傅申請</DialogTitle>
            <DialogDescription>
              確定要批准 {selectedTeacher?.displayName} 的申請嗎？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-notes">批准備註（可選）</Label>
              <Textarea
                id="approval-notes"
                placeholder="輸入批准備註..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "處理中..." : "確認批准"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒絕對話框 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒絕師傅申請</DialogTitle>
            <DialogDescription>
              請說明拒絕 {selectedTeacher?.displayName} 申請的原因
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">拒絕原因 *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="請詳細說明拒絕原因，此訊息將顯示給申請者..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              取消
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? "處理中..." : "確認拒絕"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 詳情對話框 */}
      {selectedTeacher && !showApproveDialog && !showRejectDialog && (
        <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>師傅詳細資料</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedTeacher.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {selectedTeacher.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold">{selectedTeacher.displayName}</h3>
                  {selectedTeacher.title && (
                    <p className="text-muted-foreground">{selectedTeacher.title}</p>
                  )}
                </div>
              </div>

              {selectedTeacher.bio && (
                <div>
                  <Label>簡介</Label>
                  <p className="mt-1 text-sm">{selectedTeacher.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedTeacher.region && (
                  <div>
                    <Label>地區</Label>
                    <p className="mt-1 text-sm">{selectedTeacher.region}</p>
                  </div>
                )}
                {selectedTeacher.contactEmail && (
                  <div>
                    <Label>聯絡電郵</Label>
                    <p className="mt-1 text-sm">{selectedTeacher.contactEmail}</p>
                  </div>
                )}
                {selectedTeacher.contactPhone && (
                  <div>
                    <Label>聯絡電話</Label>
                    <p className="mt-1 text-sm">{selectedTeacher.contactPhone}</p>
                  </div>
                )}
                {selectedTeacher.submittedAt && (
                  <div>
                    <Label>提交時間</Label>
                    <p className="mt-1 text-sm">
                      {format(new Date(selectedTeacher.submittedAt), "PPP p", { locale: zhTW })}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>用戶帳戶資料</Label>
                <div className="mt-1 text-sm space-y-1">
                  <p>姓名：{selectedTeacher.userName}</p>
                  <p>電郵：{selectedTeacher.userEmail}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTeacher(null)}>
                關閉
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
