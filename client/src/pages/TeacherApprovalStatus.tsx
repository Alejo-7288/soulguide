import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useLocation } from "wouter";

export default function TeacherApprovalStatus() {
  const [, navigate] = useLocation();
  const { data: status, isLoading } = trpc.teachers.getApprovalStatus.useQuery();

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">載入中...</div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>未找到師傅資料</AlertTitle>
          <AlertDescription>
            您尚未註冊為師傅，請先完成註冊。
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate("/teacher/register")}>
            前往註冊
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>師傅審核狀態</CardTitle>
              <CardDescription>查看您的申請審核進度</CardDescription>
            </div>
            <StatusBadge status={status.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {status.status === "pending" && (
            <>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>審核中</AlertTitle>
                <AlertDescription>
                  您的申請正在審核中，通常需要 1-2 個工作日。我們會仔細審查您的資料，請耐心等待。
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">提交時間：</span>
                  <span>
                    {status.submittedAt && format(new Date(status.submittedAt), "PPP p", { locale: zhTW })}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <h4 className="font-semibold mb-2">審核流程</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>資料完整性檢查</li>
                  <li>資格審核</li>
                  <li>背景調查</li>
                  <li>最終審批</li>
                </ol>
              </div>
            </>
          )}

          {status.status === "approved" && (
            <>
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">恭喜！您的申請已獲批准</AlertTitle>
                <AlertDescription className="text-green-600">
                  您現在可以開始使用師傅儀表板，管理您的服務和預約。
                </AlertDescription>
              </Alert>

              {status.approvedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">批准時間：</span>
                  <span>
                    {format(new Date(status.approvedAt), "PPP p", { locale: zhTW })}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => navigate("/teacher/dashboard")}>
                  前往儀表板
                </Button>
                <Button variant="outline" onClick={() => navigate("/teacher/settings")}>
                  編輯資料
                </Button>
              </div>
            </>
          )}

          {status.status === "rejected" && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>申請已被拒絕</AlertTitle>
                <AlertDescription>
                  很遺憾，您的申請未能通過審核。請查看以下拒絕原因。
                </AlertDescription>
              </Alert>

              {status.rejectionReason && (
                <div className="space-y-2">
                  <h4 className="font-semibold">拒絕原因</h4>
                  <div className="p-4 bg-muted rounded-lg text-sm">
                    {status.rejectionReason}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">下一步</h4>
                <p className="text-sm text-muted-foreground">
                  您可以根據拒絕原因修改您的資料後重新申請。如有任何疑問，請聯繫我們的支援團隊。
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => navigate("/teacher/register")}>
                  重新申請
                </Button>
                <Button variant="outline" onClick={() => navigate("/contact")}>
                  聯繫支援
                </Button>
              </div>
            </>
          )}

          {status.status === "suspended" && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>帳戶已暫停</AlertTitle>
                <AlertDescription>
                  您的師傅帳戶已被暫停。請聯繫管理員了解詳情。
                </AlertDescription>
              </Alert>

              <Button variant="outline" onClick={() => navigate("/contact")}>
                聯繫管理員
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: {
      label: "審核中",
      variant: "secondary" as const,
      icon: Clock,
    },
    approved: {
      label: "已批准",
      variant: "default" as const,
      icon: CheckCircle2,
    },
    rejected: {
      label: "已拒絕",
      variant: "destructive" as const,
      icon: XCircle,
    },
    suspended: {
      label: "已暫停",
      variant: "destructive" as const,
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
