import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Upload, AlertCircle, CheckCircle2, Clock, XCircle, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface VerificationFile {
  id: number;
  verificationTypeId: number;
  fileName: string;
  fileUrl: string;
  status: "pending" | "approved" | "rejected" | "expired";
  uploadedAt: Date;
  reviewNotes?: string | null;
  rejectionReason?: string | null;
}

interface VerificationType {
  id: number;
  name: string;
  description?: string;
  isRequired: boolean;
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
};

export function TeacherVerificationUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Query verification types
  const { data: verificationTypes = [] } = trpc.teachers.getVerificationTypes.useQuery();

  // Query my verifications
  const { data: myVerifications = [], isLoading, refetch } = trpc.teachers.getMyVerifications.useQuery();

  // Upload verification mutation
  const uploadMutation = trpc.teachers.uploadVerification.useMutation({
    onSuccess: () => {
      toast.success("認證文件上傳成功，等待管理員審核");
      setIsOpen(false);
      setSelectedTypeId("");
      setUploadProgress(0);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "上傳失敗");
    },
  });

  // Delete verification mutation
  const deleteMutation = trpc.teachers.deleteVerification.useMutation({
    onSuccess: () => {
      toast.success("認證文件已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTypeId) {
      toast.error("請選擇認證類型和文件");
      return;
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("只支持 PDF、JPG 和 PNG 文件");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件大小不能超過 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // Simulate file upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 30;
        });
      }, 500);

      // In a real app, you would upload to S3 here
      // For now, we'll use a mock URL
      const fileUrl = URL.createObjectURL(file);

      await uploadMutation.mutateAsync({
        verificationTypeId: parseInt(selectedTypeId),
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getVerificationTypeName = (typeId: number) => {
    return verificationTypes.find((t) => t.id === typeId)?.name || "未知類型";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">認證管理</h3>
          <p className="text-sm text-muted-foreground">上傳和管理您的專業認證文件</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              上傳新認證
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>上傳認證文件</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="verification-type">認證類型 *</Label>
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger id="verification-type">
                    <SelectValue placeholder="選擇認證類型" />
                  </SelectTrigger>
                  <SelectContent>
                    {verificationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                        {type.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file-upload">選擇文件</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={isUploading || !selectedTypeId}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">點擊或拖拽上傳文件</p>
                    <p className="text-xs text-muted-foreground">支持 PDF、JPG、PNG，最大 10MB</p>
                  </label>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>上傳中...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="w-full"
                disabled={isUploading}
              >
                關閉
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Verification List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="elegant-card h-24 animate-pulse bg-muted" />
            ))}
          </div>
        ) : myVerifications && myVerifications.length > 0 ? (
          myVerifications.map((verification: VerificationFile) => {
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
                        <h4 className="font-medium">{getVerificationTypeName(verification.verificationTypeId)}</h4>
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
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ verificationId: verification.id })}
                        disabled={deleteMutation.isPending}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        刪除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">還未上傳任何認證文件</p>
              <p className="text-sm text-muted-foreground mt-1">上傳認證文件可以提高您的專業度和信任度</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
