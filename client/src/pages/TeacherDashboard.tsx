import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { 
  Calendar, 
  Users, 
  Star,
  Clock,
  Settings,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  MessageSquare,
  TrendingUp,
  DollarSign,
  ChevronRight,
  LogOut,
  Bell,
  BarChart3,
  Sparkles,
  Eye,
  Reply,
  User,
  Phone,
  Mail,
  Instagram,
  Globe,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wallet,
  Shield
} from "lucide-react";
import { TeacherVerificationUpload } from "@/components/TeacherVerificationUpload";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

const statusLabels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending: { text: "待確認", variant: "secondary", icon: AlertCircle },
  confirmed: { text: "已確認", variant: "default", icon: CheckCircle2 },
  completed: { text: "已完成", variant: "outline", icon: CheckCircle2 },
  cancelled: { text: "已取消", variant: "destructive", icon: XCircle },
};

// Dashboard Stats Overview Component
function DashboardStats({ 
  bookingStats, 
  incomeStats 
}: { 
  bookingStats: { pending: number; confirmed: number; completed: number; cancelled: number; thisMonth: number };
  incomeStats: { totalIncome: number; thisMonthIncome: number; lastMonthIncome: number; completedBookings: number };
}) {
  const incomeGrowth = incomeStats.lastMonthIncome > 0 
    ? ((incomeStats.thisMonthIncome - incomeStats.lastMonthIncome) / incomeStats.lastMonthIncome * 100).toFixed(1)
    : incomeStats.thisMonthIncome > 0 ? '100' : '0';
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="elegant-card p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
        </div>
        <p className="text-2xl font-semibold">{bookingStats.pending}</p>
        <p className="text-sm text-muted-foreground">待確認預約</p>
      </div>
      <div className="elegant-card p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-2xl font-semibold">{bookingStats.confirmed}</p>
        <p className="text-sm text-muted-foreground">已確認預約</p>
      </div>
      <div className="elegant-card p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <p className="text-2xl font-semibold">{bookingStats.thisMonth}</p>
        <p className="text-sm text-muted-foreground">本月預約</p>
      </div>
      <div className="elegant-card p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
          <DollarSign className="w-5 h-5 text-yellow-600" />
        </div>
        <p className="text-2xl font-semibold">${incomeStats.thisMonthIncome.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">本月收入</p>
        {parseFloat(incomeGrowth) !== 0 && (
          <p className={`text-xs mt-1 flex items-center justify-center gap-1 ${parseFloat(incomeGrowth) > 0 ? 'text-green-600' : 'text-red-500'}`}>
            <TrendingUp className="w-3 h-3" />
            {parseFloat(incomeGrowth) > 0 ? '+' : ''}{incomeGrowth}%
          </p>
        )}
      </div>
    </div>
  );
}

// Profile Completion Component
function ProfileCompletion({ profile }: { profile: any }) {
  const fields = [
    { key: 'displayName', label: '顯示名稱', filled: !!profile?.displayName },
    { key: 'title', label: '頭銜', filled: !!profile?.title },
    { key: 'bio', label: '個人簡介', filled: !!profile?.bio },
    { key: 'experience', label: '經驗資歷', filled: !!profile?.experience },
    { key: 'region', label: '服務地區', filled: !!profile?.region },
    { key: 'contactEmail', label: '聯絡電郵', filled: !!profile?.contactEmail },
    { key: 'contactPhone', label: '聯絡電話', filled: !!profile?.contactPhone },
    { key: 'avatarUrl', label: '頭像', filled: !!profile?.avatarUrl },
  ];
  
  const filledCount = fields.filter(f => f.filled).length;
  const percentage = Math.round((filledCount / fields.length) * 100);
  
  if (percentage === 100) return null;
  
  return (
    <div className="elegant-card p-4 mb-6 bg-gradient-to-r from-primary/5 to-transparent">
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <span className="font-medium">完善您的老師資料</span>
        <span className="text-sm text-muted-foreground ml-auto">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2 mb-3" />
      <div className="flex flex-wrap gap-2">
        {fields.filter(f => !f.filled).map(field => (
          <Badge key={field.key} variant="outline" className="text-xs">
            缺少{field.label}
          </Badge>
        ))}
      </div>
      <Link href="/teacher/settings">
        <Button variant="link" className="p-0 h-auto mt-2 text-primary">
          前往完善資料 <ChevronRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

// Booking Management Card
function BookingManagementCard({ booking, onStatusChange }: { booking: any; onStatusChange: () => void }) {
  const status = statusLabels[booking.booking.status] || statusLabels.pending;
  const StatusIcon = status.icon;

  const updateStatusMutation = trpc.teacherDashboard.updateBookingStatus.useMutation({
    onSuccess: () => {
      toast.success("預約狀態已更新");
      onStatusChange();
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const canConfirm = booking.booking.status === "pending";
  const canCancel = booking.booking.status === "pending" || booking.booking.status === "confirmed";

  return (
    <div className="elegant-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-medium">
            {booking.user?.name?.[0] || "👤"}
          </div>
          <div>
            <h4 className="font-medium">{booking.user?.name || "用戶"}</h4>
            <p className="text-sm text-muted-foreground">{booking.user?.email}</p>
            {booking.user?.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {booking.user.phone}
              </p>
            )}
          </div>
        </div>
        <Badge variant={status.variant} className="flex items-center gap-1">
          <StatusIcon className="w-3 h-3" />
          {status.text}
        </Badge>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 mb-4">
        <p className="font-medium text-sm">{booking.service.name}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(booking.booking.bookingDate), "M月d日 (EEEE)", { locale: zhTW })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {booking.booking.startTime} - {booking.booking.endTime}
          </span>
        </div>
      </div>

      {booking.booking.notes && (
        <div className="text-sm text-muted-foreground mb-4 bg-muted/30 rounded p-2">
          <span className="font-medium">客戶備註：</span> {booking.booking.notes}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg text-primary">
          ${booking.booking.totalAmount} {booking.booking.currency}
        </span>
        <div className="flex gap-2">
          {canConfirm && (
            <Button 
              size="sm"
              className="gap-1 gold-gradient text-foreground hover:opacity-90"
              onClick={() => updateStatusMutation.mutate({ bookingId: booking.booking.id, status: "confirmed" })}
            >
              <Check className="w-4 h-4" />
              確認預約
            </Button>
          )}
          {canCancel && (
            <Button 
              variant="outline"
              size="sm"
              className="gap-1 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("確定要取消此預約嗎？")) {
                  updateStatusMutation.mutate({ bookingId: booking.booking.id, status: "cancelled" });
                }
              }}
            >
              <X className="w-4 h-4" />
              取消
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Review Management Card
function ReviewCard({ review, onReplySuccess }: { review: any; onReplySuccess: () => void }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState(review.review.teacherReply || "");

  const replyMutation = trpc.teacherDashboard.replyToReview.useMutation({
    onSuccess: () => {
      toast.success("回覆已發送");
      setIsReplying(false);
      onReplySuccess();
    },
    onError: (error) => {
      toast.error(error.message || "回覆失敗");
    },
  });

  return (
    <div className="elegant-card p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          {review.user?.name?.[0] || "👤"}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{review.user?.name || "匿名用戶"}</h4>
            <span className="text-xs text-muted-foreground">
              {format(new Date(review.review.createdAt), "yyyy年M月d日", { locale: zhTW })}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= review.review.rating ? "star-filled fill-current" : "text-muted-foreground/30"}`}
              />
            ))}
            <span className="text-sm ml-1">{review.review.rating}.0</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{review.review.comment}</p>

      {review.review.teacherReply ? (
        <div className="bg-primary/5 rounded-lg p-3 border-l-2 border-primary">
          <p className="text-xs text-muted-foreground mb-1">您的回覆：</p>
          <p className="text-sm">{review.review.teacherReply}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {review.review.teacherReplyAt && format(new Date(review.review.teacherReplyAt), "yyyy年M月d日", { locale: zhTW })}
          </p>
        </div>
      ) : isReplying ? (
        <div className="space-y-3">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="輸入您的回覆..."
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsReplying(false)}>
              取消
            </Button>
            <Button 
              size="sm" 
              onClick={() => replyMutation.mutate({ reviewId: review.review.id, reply: replyText })}
              disabled={!replyText.trim()}
            >
              發送回覆
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsReplying(true)}>
          <Reply className="w-4 h-4" />
          回覆評價
        </Button>
      )}
    </div>
  );
}

// Client Card
function ClientCard({ client }: { client: any }) {
  return (
    <div className="elegant-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-medium">
          {client.user?.name?.[0] || "👤"}
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{client.user?.name || "用戶"}</h4>
          <p className="text-sm text-muted-foreground">{client.user?.email}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-primary">${client.totalSpent.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{client.totalBookings} 次預約</p>
        </div>
      </div>
      {client.lastBooking && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          最後預約：{format(new Date(client.lastBooking), "yyyy年M月d日", { locale: zhTW })}
        </p>
      )}
    </div>
  );
}

// Income Chart Component
function IncomeChart({ monthlyData }: { monthlyData: { month: string; income: number; bookings: number }[] }) {
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="elegant-card p-8 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">尚無收入數據</h3>
        <p className="text-muted-foreground">當有已完成的預約時，收入數據會在這裡顯示</p>
      </div>
    );
  }

  const maxIncome = Math.max(...monthlyData.map(d => d.income), 1);

  return (
    <div className="elegant-card p-6">
      <h3 className="font-medium mb-4">近期收入趨勢</h3>
      <div className="flex items-end gap-2 h-40">
        {monthlyData.map((data, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col items-center">
              <span className="text-xs text-muted-foreground mb-1">${data.income.toLocaleString()}</span>
              <div 
                className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t"
                style={{ height: `${(data.income / maxIncome) * 100}px`, minHeight: data.income > 0 ? '8px' : '2px' }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-2">{data.month.slice(5)}月</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Service Management Component
function ServiceManagement() {
  const { data: services, isLoading } = trpc.teacherDashboard.getServices.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    serviceType: "reading" as "reading" | "course" | "consultation",
    duration: 60,
    price: "",
    isOnline: true,
    isInPerson: true,
    maxParticipants: 1,
  });

  const createMutation = trpc.teacherDashboard.createService.useMutation({
    onSuccess: () => {
      toast.success("服務已新增");
      utils.teacherDashboard.getServices.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "新增失敗");
    },
  });

  const updateMutation = trpc.teacherDashboard.updateService.useMutation({
    onSuccess: () => {
      toast.success("服務已更新");
      utils.teacherDashboard.getServices.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = trpc.teacherDashboard.deleteService.useMutation({
    onSuccess: () => {
      toast.success("服務已刪除");
      utils.teacherDashboard.getServices.invalidate();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      serviceType: "reading",
      duration: 60,
      price: "",
      isOnline: true,
      isInPerson: true,
      maxParticipants: 1,
    });
    setEditingService(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.categoryId || !formData.price) {
      toast.error("請填寫所有必要欄位");
      return;
    }

    if (editingService) {
      updateMutation.mutate({
        id: editingService.service.id,
        ...formData,
      });
    } else {
      createMutation.mutate({
        ...formData,
        categoryId: parseInt(formData.categoryId),
      });
    }
  };

  const openEditDialog = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.service.name,
      description: service.service.description || "",
      categoryId: service.service.categoryId.toString(),
      serviceType: service.service.serviceType,
      duration: service.service.duration,
      price: service.service.price,
      isOnline: service.service.isOnline,
      isInPerson: service.service.isInPerson,
      maxParticipants: service.service.maxParticipants,
    });
    setIsDialogOpen(true);
  };

  const serviceTypeLabels = {
    reading: "算命",
    course: "課程",
    consultation: "諮詢",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium">服務項目管理</h2>
          <p className="text-sm text-muted-foreground">管理您提供的服務，設定價格和時長</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 gold-gradient text-foreground hover:opacity-90">
              <Plus className="w-4 h-4" />
              新增服務
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingService ? "編輯服務" : "新增服務"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>服務名稱 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：紫微斗數命盤分析"
                />
              </div>
              <div>
                <Label>服務類別 *</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇類別" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>服務類型 *</Label>
                <Select value={formData.serviceType} onValueChange={(v: any) => setFormData({ ...formData, serviceType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reading">算命</SelectItem>
                    <SelectItem value="course">課程</SelectItem>
                    <SelectItem value="consultation">諮詢</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>時長（分鐘）*</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div>
                  <Label>價格 (HKD) *</Label>
                  <Input
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="1500"
                  />
                </div>
              </div>
              <div>
                <Label>服務描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="詳細描述您的服務內容..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={formData.isOnline}
                    onCheckedChange={(v) => setFormData({ ...formData, isOnline: v })}
                  />
                  <span>線上服務</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={formData.isInPerson}
                    onCheckedChange={(v) => setFormData({ ...formData, isInPerson: v })}
                  />
                  <span>面對面服務</span>
                </label>
              </div>
              {formData.serviceType === "course" && (
                <div>
                  <Label>最大人數</Label>
                  <Input
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                <Button onClick={handleSubmit} className="gold-gradient text-foreground hover:opacity-90">
                  {editingService ? "更新" : "新增"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="elegant-card h-24 animate-pulse bg-muted" />
          ))}
        </div>
      ) : services && services.length > 0 ? (
        <div className="grid gap-4">
          {services.map((service) => (
            <div key={service.service.id} className="elegant-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-lg">{service.service.name}</h4>
                    <Badge variant="secondary">{serviceTypeLabels[service.service.serviceType]}</Badge>
                    <Badge variant="outline">{service.category.name}</Badge>
                  </div>
                  {service.service.description && (
                    <p className="text-sm text-muted-foreground mb-2">{service.service.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {service.service.duration} 分鐘
                    </span>
                    <span className="font-semibold text-primary text-lg">
                      ${service.service.price} HKD
                    </span>
                    {service.service.isOnline && (
                      <Badge variant="outline" className="text-xs">線上</Badge>
                    )}
                    {service.service.isInPerson && (
                      <Badge variant="outline" className="text-xs">面對面</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(service)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("確定要刪除此服務嗎？")) {
                        deleteMutation.mutate({ id: service.service.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="elegant-card p-12 text-center">
          <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">尚未設定服務項目</h3>
          <p className="text-muted-foreground mb-6">新增您提供的服務，讓用戶可以預約</p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2 gold-gradient text-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            新增第一個服務
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TeacherDashboard() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: profileData, isLoading: profileLoading } = trpc.teacherDashboard.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: bookings, isLoading: bookingsLoading } = trpc.teacherDashboard.getBookings.useQuery(
    undefined,
    { enabled: isAuthenticated && !!profileData }
  );

  const { data: bookingStats } = trpc.teacherDashboard.getBookingStats.useQuery(
    undefined,
    { enabled: isAuthenticated && !!profileData }
  );

  const { data: incomeStats } = trpc.teacherDashboard.getIncomeStats.useQuery(
    undefined,
    { enabled: isAuthenticated && !!profileData }
  );

  const { data: monthlyIncome } = trpc.teacherDashboard.getMonthlyIncome.useQuery(
    undefined,
    { enabled: isAuthenticated && !!profileData }
  );

  const { data: reviews } = trpc.teacherDashboard.getReviews.useQuery(
    undefined,
    { enabled: isAuthenticated && !!profileData }
  );

  const { data: clients } = trpc.teacherDashboard.getClients.useQuery(
    undefined,
    { enabled: isAuthenticated && !!profileData }
  );

  const { data: notifications } = trpc.notifications.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const utils = trpc.useUtils();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <h2 className="text-xl font-medium mb-2">請先登入</h2>
          <p className="text-muted-foreground mb-6">登入後即可管理您的老師帳戶</p>
          <a href={getLoginUrl()}>
            <Button className="gold-gradient text-foreground hover:opacity-90">
              立即登入
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <h2 className="text-xl font-medium mb-2">尚未建立老師資料</h2>
          <p className="text-muted-foreground mb-6">請先申請成為老師</p>
          <Link href="/teacher/register">
            <Button className="gold-gradient text-foreground hover:opacity-90">
              申請成為老師
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const profile = profileData.profile;
  const pendingBookings = bookings?.filter(b => b.booking.status === "pending") || [];
  const confirmedBookings = bookings?.filter(b => b.booking.status === "confirmed") || [];
  const completedBookings = bookings?.filter(b => b.booking.status === "completed") || [];
  const unreadNotifications = notifications?.filter(n => !n.isRead).length || 0;
  const unrepliedReviews = reviews?.filter(r => !r.review.teacherReply).length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">☯️</span>
            <span className="text-xl font-medium">SoulGuide</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Link href={`/teacher/${profile.id}`}>
              <Button variant="ghost" size="sm" className="gap-1">
                <Eye className="w-4 h-4" />
                查看公開頁面
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">用戶後台</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-1">
              <LogOut className="w-4 h-4" />
              登出
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* Header Card */}
        <div className="elegant-card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-3xl overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                "👤"
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-medium">{profile.displayName}</h1>
                {profile.isVerified && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    已認證
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{profile.title}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 star-filled" />
                  {profile.averageRating || "0.0"} ({profile.totalReviews} 評價)
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {profile.totalBookings} 預約
                </span>
                {profile.region && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.region}
                  </span>
                )}
              </div>
            </div>
            <Link href="/teacher/settings">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                編輯資料
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Completion */}
        <ProfileCompletion profile={profile} />

        {/* Stats Overview */}
        <DashboardStats 
          bookingStats={{
            pending: bookingStats?.pending ?? 0,
            confirmed: bookingStats?.confirmed ?? 0,
            completed: bookingStats?.completed ?? 0,
            cancelled: bookingStats?.cancelled ?? 0,
            thisMonth: bookingStats?.thisMonth ?? 0,
          }} 
          incomeStats={{
            totalIncome: incomeStats?.totalIncome ?? 0,
            thisMonthIncome: incomeStats?.thisMonthIncome ?? 0,
            lastMonthIncome: incomeStats?.lastMonthIncome ?? 0,
            completedBookings: incomeStats?.completedBookings ?? 0,
          }} 
        />

        {/* Main Tabs */}
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="w-4 h-4" />
              預約管理
              {pendingBookings.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pendingBookings.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Settings className="w-4 h-4" />
              服務項目
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              評價管理
              {unrepliedReviews > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{unrepliedReviews}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-2">
              <Wallet className="w-4 h-4" />
              收入報表
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              客戶管理
            </TabsTrigger>
            <TabsTrigger value="verifications" className="gap-2">
              <Shield className="w-4 h-4" />
              認證管理
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="elegant-card h-32 animate-pulse bg-muted" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-6">
                {pendingBookings.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2 text-orange-600">
                      <AlertCircle className="w-5 h-5" />
                      待確認 ({pendingBookings.length})
                    </h3>
                    <div className="grid gap-4">
                      {pendingBookings.map((booking) => (
                        <BookingManagementCard 
                          key={booking.booking.id} 
                          booking={booking}
                          onStatusChange={() => {
                            utils.teacherDashboard.getBookings.invalidate();
                            utils.teacherDashboard.getBookingStats.invalidate();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {confirmedBookings.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      已確認 ({confirmedBookings.length})
                    </h3>
                    <div className="grid gap-4">
                      {confirmedBookings.map((booking) => (
                        <BookingManagementCard 
                          key={booking.booking.id} 
                          booking={booking}
                          onStatusChange={() => {
                            utils.teacherDashboard.getBookings.invalidate();
                            utils.teacherDashboard.getBookingStats.invalidate();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {completedBookings.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-5 h-5" />
                      已完成 ({completedBookings.length})
                    </h3>
                    <div className="grid gap-4">
                      {completedBookings.slice(0, 5).map((booking) => (
                        <BookingManagementCard 
                          key={booking.booking.id} 
                          booking={booking}
                          onStatusChange={() => utils.teacherDashboard.getBookings.invalidate()}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="elegant-card p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">尚無預約</h3>
                <p className="text-muted-foreground">當有用戶預約您的服務時，會在這裡顯示</p>
              </div>
            )}
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <ServiceManagement />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="mb-6">
              <h2 className="text-xl font-medium">評價管理</h2>
              <p className="text-sm text-muted-foreground">查看客戶評價並回覆</p>
            </div>
            {reviews && reviews.length > 0 ? (
              <div className="grid gap-4">
                {reviews.map((review) => (
                  <ReviewCard 
                    key={review.review.id} 
                    review={review}
                    onReplySuccess={() => utils.teacherDashboard.getReviews.invalidate()}
                  />
                ))}
              </div>
            ) : (
              <div className="elegant-card p-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">尚無評價</h3>
                <p className="text-muted-foreground">當客戶完成服務後留下評價，會在這裡顯示</p>
              </div>
            )}
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income">
            <div className="mb-6">
              <h2 className="text-xl font-medium">收入報表</h2>
              <p className="text-sm text-muted-foreground">查看您的收入統計和趨勢</p>
            </div>
            
            {incomeStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="elegant-card p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">總收入</p>
                  <p className="text-2xl font-semibold text-primary">${incomeStats.totalIncome.toLocaleString()}</p>
                </div>
                <div className="elegant-card p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">本月收入</p>
                  <p className="text-2xl font-semibold text-green-600">${incomeStats.thisMonthIncome.toLocaleString()}</p>
                </div>
                <div className="elegant-card p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">上月收入</p>
                  <p className="text-2xl font-semibold">${incomeStats.lastMonthIncome.toLocaleString()}</p>
                </div>
                <div className="elegant-card p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">已完成預約</p>
                  <p className="text-2xl font-semibold">{incomeStats.completedBookings}</p>
                </div>
              </div>
            )}

            <IncomeChart monthlyData={monthlyIncome || []} />
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <div className="mb-6">
              <h2 className="text-xl font-medium">客戶管理</h2>
              <p className="text-sm text-muted-foreground">查看預約過您服務的客戶</p>
            </div>
            {clients && clients.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {clients.map((client, index) => (
                  <ClientCard key={index} client={client} />
                ))}
              </div>
            ) : (
              <div className="elegant-card p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">尚無客戶</h3>
                <p className="text-muted-foreground">當有用戶預約您的服務後，會在這裡顯示</p>
              </div>
            )}
          </TabsContent>
          
          {/* Verifications Tab */}
          <TabsContent value="verifications">
            <TeacherVerificationUpload />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
