import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface VerificationItem {
  id: number;
  verificationTypeId: number;
  fileName: string;
  fileUrl: string;
  status: "pending" | "approved" | "rejected" | "expired";
  uploadedAt: Date;
  reviewNotes?: string | null;
  rejectionReason?: string | null;
  verificationTypeName?: string;
}

interface VerificationListProps {
  verifications: VerificationItem[];
  isLoading?: boolean;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

const statusConfig = {
  pending: {
    label: "待審核",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    badgeVariant: "secondary" as const,
  },
  approved: {
    label: "已批准",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    badgeVariant: "default" as const,
  },
  rejected: {
    label: "已拒絕",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    badgeVariant: "destructive" as const,
  },
  expired: {
    label: "已過期",
    icon: AlertCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    badgeVariant: "outline" as const,
  },
};

export function VerificationList({
  verifications,
  isLoading = false,
  onDelete,
  isDeleting = false,
}: VerificationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="elegant-card h-24 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (!verifications || verifications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">還未上傳任何認證文件</p>
          <p className="text-sm text-muted-foreground mt-1">上傳認證文件可以提高您的專業度和信任度</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {verifications.map((verification) => {
        const status = verification.status as keyof typeof statusConfig;
        const config = statusConfig[status];
        const StatusIcon = config.icon;

        return (
          <Card key={verification.id} className={`${config.bgColor}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusIcon className={`w-5 h-5 ${config.color}`} />
                    <h4 className="font-medium">{verification.verificationTypeName || `認證 #${verification.id}`}</h4>
                    <Badge variant={config.badgeVariant}>{config.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{verification.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    上傳於 {format(new Date(verification.uploadedAt), "yyyy年MM月dd日 HH:mm", { locale: zhTW })}
                  </p>

                  {verification.reviewNotes && (
                    <Alert className="mt-3 bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-800">
                        <strong>審核備註：</strong> {verification.reviewNotes}
                      </AlertDescription>
                    </Alert>
                  )}

                  {verification.rejectionReason && (
                    <Alert className="mt-3 bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-800">
                        <strong>拒絕原因：</strong> {verification.rejectionReason}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
