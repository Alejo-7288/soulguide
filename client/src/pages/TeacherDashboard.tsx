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
  LogOut
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

const statusLabels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { text: "待確認", variant: "secondary" },
  confirmed: { text: "已確認", variant: "default" },
  completed: { text: "已完成", variant: "outline" },
  cancelled: { text: "已取消", variant: "destructive" },
};

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string | number; trend?: string }) {
  return (
    <div className="elegant-card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-medium">{value}</div>
      {trend && (
        <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  );
}

function BookingManagementCard({ booking, onStatusChange }: { booking: any; onStatusChange: () => void }) {
  const status = statusLabels[booking.booking.status] || statusLabels.pending;
  const utils = trpc.useUtils();

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
    <div className="elegant-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            {booking.user?.name?.[0] || "👤"}
          </div>
          <div>
            <h4 className="font-medium">{booking.user?.name || "用戶"}</h4>
            <p className="text-sm text-muted-foreground">{booking.user?.email}</p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.text}</Badge>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 mb-4">
        <p className="font-medium text-sm">{booking.service.name}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(booking.booking.bookingDate), "M月d日", { locale: zhTW })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {booking.booking.startTime} - {booking.booking.endTime}
          </span>
        </div>
      </div>

      {booking.booking.notes && (
        <div className="text-sm text-muted-foreground mb-4">
          <span className="font-medium">備註：</span> {booking.booking.notes}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-medium text-primary">
          ${booking.booking.totalAmount} {booking.booking.currency}
        </span>
        <div className="flex gap-2">
          {canConfirm && (
            <Button 
              size="sm"
              className="gap-1"
              onClick={() => updateStatusMutation.mutate({ bookingId: booking.booking.id, status: "confirmed" })}
            >
              <Check className="w-4 h-4" />
              確認
            </Button>
          )}
          {canCancel && (
            <Button 
              variant="outline"
              size="sm"
              className="gap-1 text-destructive"
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
        <h2 className="text-xl font-medium">服務項目管理</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
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
                <Button onClick={handleSubmit}>
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
        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.service.id} className="elegant-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{service.service.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{serviceTypeLabels[service.service.serviceType]}</Badge>
                    <Badge variant="outline">{service.category.name}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {service.service.duration} 分鐘
                    </span>
                    <span className="font-medium text-primary">
                      ${service.service.price} HKD
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(service)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive"
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">☯️</span>
            <span className="text-xl font-medium">SoulGuide</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href={`/teacher/${profile.id}`}>
              <Button variant="ghost" size="sm">查看公開頁面</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">用戶後台</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* Header */}
        <div className="elegant-card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                "👤"
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-medium">{profile.displayName}</h1>
              <p className="text-muted-foreground">{profile.title}</p>
            </div>
            <Link href="/teacher/settings">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                編輯資料
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Calendar className="w-5 h-5 text-primary" />}
            label="總預約數"
            value={profile.totalBookings}
          />
          <StatCard
            icon={<Star className="w-5 h-5 star-filled" />}
            label="平均評分"
            value={profile.averageRating || "0.0"}
          />
          <StatCard
            icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
            label="評價數"
            value={profile.totalReviews}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-orange-500" />}
            label="待處理預約"
            value={pendingBookings.length}
          />
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="w-4 h-4" />
              預約管理
              {pendingBookings.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingBookings.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Settings className="w-4 h-4" />
              服務項目
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="elegant-card h-32 animate-pulse bg-muted" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-4">
                {pendingBookings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3 text-orange-600">待確認 ({pendingBookings.length})</h3>
                    <div className="space-y-4">
                      {pendingBookings.map((booking) => (
                        <BookingManagementCard 
                          key={booking.booking.id} 
                          booking={booking}
                          onStatusChange={() => utils.teacherDashboard.getBookings.invalidate()}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {confirmedBookings.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 text-green-600">已確認 ({confirmedBookings.length})</h3>
                    <div className="space-y-4">
                      {confirmedBookings.map((booking) => (
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

          <TabsContent value="services">
            <ServiceManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
