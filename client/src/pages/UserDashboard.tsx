import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { 
  Calendar, 
  Heart, 
  Bell, 
  Settings, 
  Star,
  Clock,
  MapPin,
  ChevronRight,
  User,
  LogOut,
  CreditCard,
  Phone,
  Instagram,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const statusLabels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending: { text: "待確認", variant: "secondary", icon: AlertCircle },
  confirmed: { text: "已確認", variant: "default", icon: CheckCircle2 },
  completed: { text: "已完成", variant: "outline", icon: CheckCircle2 },
  cancelled: { text: "已取消", variant: "destructive", icon: XCircle },
  refunded: { text: "已退款", variant: "destructive", icon: XCircle },
};

// Dashboard Stats Component
function DashboardStats({ bookings, favorites, reviews }: { bookings: any[]; favorites: any[]; reviews: number }) {
  const completedBookings = bookings?.filter(b => b.booking.status === 'completed').length || 0;
  const pendingBookings = bookings?.filter(b => b.booking.status === 'pending' || b.booking.status === 'confirmed').length || 0;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="elegant-card p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <p className="text-2xl font-semibold">{bookings?.length || 0}</p>
        <p className="text-sm text-muted-foreground">總預約數</p>
      </div>
      <div className="elegant-card p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-2xl font-semibold">{completedBookings}</p>
        <p className="text-sm text-muted-foreground">已完成</p>
      </div>
      <div className="elegant-card p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-2">
          <Heart className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-2xl font-semibold">{favorites?.length || 0}</p>
        <p className="text-sm text-muted-foreground">收藏老師</p>
      </div>
      <div className="elegant-card p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
          <Star className="w-5 h-5 text-yellow-500" />
        </div>
        <p className="text-2xl font-semibold">{reviews}</p>
        <p className="text-sm text-muted-foreground">已評價</p>
      </div>
    </div>
  );
}

// Profile Completion Component
function ProfileCompletion({ user }: { user: any }) {
  const fields = [
    { key: 'name', label: '姓名', filled: !!user?.name },
    { key: 'email', label: '電郵', filled: !!user?.email },
    { key: 'phone', label: '電話', filled: !!user?.phone },
    { key: 'instagram', label: 'Instagram', filled: !!user?.instagram },
  ];
  
  const filledCount = fields.filter(f => f.filled).length;
  const percentage = Math.round((filledCount / fields.length) * 100);
  
  if (percentage === 100) return null;
  
  return (
    <div className="elegant-card p-4 mb-6 bg-gradient-to-r from-primary/5 to-transparent">
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <span className="font-medium">完善您的個人資料</span>
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
    </div>
  );
}

function ProfileSettingsForm({ user }: { user: any }) {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    instagram: user?.instagram || "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        instagram: user.instagram || "",
      });
    }
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("個人資料已更新");
      setIsEditing(false);
      utils.auth.me.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Profile Form */}
      <div className="elegant-card p-6">
        <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
          <User className="w-5 h-5" />
          個人資料
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              姓名
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : ""}
            />
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              電郵地址
            </Label>
            <Input
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">電郵地址無法修改</p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              電話號碼
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+852 9XXX XXXX"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : ""}
            />
          </div>

          {/* Instagram */}
          <div className="space-y-2">
            <Label htmlFor="instagram" className="flex items-center gap-2">
              <Instagram className="w-4 h-4" />
              Instagram
            </Label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${!isEditing ? "text-muted-foreground" : "text-foreground"}`}>@</span>
              <Input
                id="instagram"
                type="text"
                placeholder="your_username"
                value={formData.instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value.replace(/^@/, "") }))}
                disabled={!isEditing}
                className={`pl-8 ${!isEditing ? "bg-muted" : ""}`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {isEditing ? (
              <>
                <Button
                  type="submit"
                  className="gold-gradient text-foreground hover:opacity-90"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      儲存變更
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user?.name || "",
                      phone: user?.phone || "",
                      instagram: user?.instagram || "",
                    });
                  }}
                >
                  取消
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                編輯資料
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Account Info & Security */}
      <div className="space-y-6">
        {/* Account Info Card */}
        <div className="elegant-card p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            帳戶資訊
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">登入方式</span>
              <Badge variant="outline">
                {user?.loginMethod === 'email' ? '電郵/密碼' : 'Manus 帳戶'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">帳戶角色</span>
              <Badge variant={user?.role === 'teacher' ? 'default' : 'secondary'}>
                {user?.role === 'teacher' ? '老師' : user?.role === 'admin' ? '管理員' : '用戶'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">註冊日期</span>
              <span className="text-sm">
                {user?.createdAt ? format(new Date(user.createdAt), "yyyy年M月d日") : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Security Section */}
        {user?.loginMethod === 'email' && (
          <div className="elegant-card p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              安全設定
            </h3>
            <ChangePasswordSection />
          </div>
        )}

        {/* Become Teacher CTA */}
        {user?.role !== 'teacher' && (
          <div className="elegant-card p-6 bg-gradient-to-br from-primary/10 to-transparent">
            <h3 className="text-lg font-medium mb-2">成為平台老師</h3>
            <p className="text-sm text-muted-foreground mb-4">
              分享您的專業知識，接觸更多有緣人
            </p>
            <Link href="/teacher/register">
              <Button className="gold-gradient text-foreground hover:opacity-90 w-full">
                立即申請
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("密碼已成功修改");
      setIsOpen(false);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "修改密碼失敗");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("新密碼與確認密碼不符");
      return;
    }
    
    if (passwords.newPassword.length < 8) {
      toast.error("新密碼至少需要8個字元");
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Lock className="w-4 h-4 mr-2" />
          修改密碼
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改密碼</DialogTitle>
          <DialogDescription>
            請輸入您的現有密碼和新密碼
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label>現有密碼</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={passwords.currentPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* New Password */}
          <div className="space-y-2">
            <Label>新密碼</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={passwords.newPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">至少8個字元</p>
          </div>
          
          {/* Confirm Password */}
          <div className="space-y-2">
            <Label>確認新密碼</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button 
              type="submit" 
              className="gold-gradient text-foreground hover:opacity-90"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  修改中...
                </>
              ) : (
                "確認修改"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const status = statusLabels[booking.booking.status] || statusLabels.pending;
  const StatusIcon = status.icon;
  const utils = trpc.useUtils();
  
  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("預約已取消");
      utils.userDashboard.getBookings.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "取消失敗");
    },
  });

  const payMutation = trpc.bookings.createCheckoutSession.useMutation({
    onSuccess: (data: { checkoutUrl: string }) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        toast.info("正在跳轉至付款頁面...");
      }
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "無法建立付款連結");
    },
  });

  const canCancel = booking.booking.status === "pending" || booking.booking.status === "confirmed";
  const canReview = booking.booking.status === "completed";
  const canPay = booking.booking.paymentStatus === "pending" && booking.booking.status !== "cancelled";

  return (
    <div className="elegant-card p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
            {booking.teacherProfile.avatarUrl ? (
              <img src={booking.teacherProfile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              "👤"
            )}
          </div>
          <div>
            <h4 className="font-medium text-lg">{booking.teacherProfile.displayName}</h4>
            <p className="text-sm text-muted-foreground">{booking.service.name}</p>
          </div>
        </div>
        <Badge variant={status.variant} className="flex items-center gap-1">
          <StatusIcon className="w-3 h-3" />
          {status.text}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg mb-4">
        <div className="text-center">
          <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">
            {format(new Date(booking.booking.bookingDate), "M月d日", { locale: zhTW })}
          </p>
        </div>
        <div className="text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">
            {booking.booking.startTime}
          </p>
        </div>
        <div className="text-center">
          <MapPin className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">
            {booking.booking.isOnline ? "線上" : "面對面"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-semibold text-primary">
            ${booking.booking.totalAmount}
          </span>
          <span className="text-sm text-muted-foreground ml-1">{booking.booking.currency}</span>
          {booking.booking.paymentStatus === 'pending' && (
            <Badge variant="outline" className="ml-2 text-xs">待付款</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {canPay && (
            <Button 
              size="sm"
              className="gold-gradient text-foreground hover:opacity-90"
              onClick={() => payMutation.mutate({ bookingId: booking.booking.id })}
              disabled={payMutation.isPending}
            >
              <CreditCard className="w-4 h-4 mr-1" />
              {payMutation.isPending ? "處理中..." : "付款"}
            </Button>
          )}
          <Link href={`/booking/${booking.booking.id}`}>
            <Button variant="outline" size="sm">
              詳情
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          {canCancel && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("確定要取消此預約嗎？")) {
                  cancelMutation.mutate({ id: booking.booking.id });
                }
              }}
            >
              取消
            </Button>
          )}
          {canReview && (
            <Link href={`/review/${booking.booking.id}`}>
              <Button variant="ghost" size="sm">
                <Star className="w-4 h-4 mr-1" />
                評價
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function FavoriteCard({ favorite }: { favorite: any }) {
  const utils = trpc.useUtils();
  
  const toggleMutation = trpc.userDashboard.toggleFavorite.useMutation({
    onSuccess: () => {
      toast.success("已取消收藏");
      utils.userDashboard.getFavorites.invalidate();
    },
  });

  return (
    <div className="elegant-card p-4 hover:shadow-lg transition-shadow group">
      <div className="flex items-center gap-4">
        <Link href={`/teacher/${favorite.profile.id}`} className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
            {favorite.profile.avatarUrl ? (
              <img src={favorite.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              "👤"
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-medium group-hover:text-primary transition-colors">
              {favorite.profile.displayName}
            </h4>
            <p className="text-sm text-muted-foreground">{favorite.profile.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 star-filled" />
              <span className="text-sm font-medium">{favorite.profile.averageRating}</span>
              {favorite.profile.region && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{favorite.profile.region}</span>
                </>
              )}
            </div>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={(e) => {
            e.preventDefault();
            toggleMutation.mutate({ teacherProfileId: favorite.profile.id });
          }}
        >
          <Heart className="w-5 h-5 fill-current" />
        </Button>
      </div>
    </div>
  );
}

function NotificationItem({ notification }: { notification: any }) {
  const utils = trpc.useUtils();
  
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const typeIcons: Record<string, any> = {
    booking_confirmed: CheckCircle2,
    booking_cancelled: XCircle,
    booking_reminder: Bell,
    payment_received: CreditCard,
    new_review: Star,
    booking_rescheduled: Calendar,
  };

  const Icon = typeIcons[notification.type] || Bell;

  return (
    <div 
      className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
        !notification.isRead ? "bg-primary/5" : ""
      }`}
      onClick={() => {
        if (!notification.isRead) {
          markReadMutation.mutate({ id: notification.id });
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          !notification.isRead ? "bg-primary/20" : "bg-muted"
        }`}>
          <Icon className={`w-4 h-4 ${!notification.isRead ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1">
          <p className={`text-sm ${!notification.isRead ? "font-medium" : ""}`}>
            {notification.title}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{notification.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {format(new Date(notification.createdAt), "M月d日 HH:mm", { locale: zhTW })}
          </p>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
        )}
      </div>
    </div>
  );
}

function MyReviewsSection() {
  const { data: reviews, isLoading } = trpc.userDashboard.getMyReviews.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="elegant-card h-32 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="elegant-card p-12 text-center">
        <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">尚無評價記錄</h3>
        <p className="text-muted-foreground mb-6">完成預約後可以撰寫評價</p>
        <Link href="/search">
          <Button className="gold-gradient text-foreground hover:opacity-90">
            搜尋老師
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review: any) => (
        <div key={review.review.id} className="elegant-card p-5 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xl">
                {review.teacherProfile?.avatarUrl ? (
                  <img src={review.teacherProfile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              <div>
                <Link href={`/teacher/${review.teacherProfile?.id}`}>
                  <h4 className="font-medium hover:text-primary transition-colors">
                    {review.teacherProfile?.displayName || "未知老師"}
                  </h4>
                </Link>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(review.review.createdAt), "yyyy年M月d日", { locale: zhTW })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= review.review.rating ? "star-filled" : "text-muted-foreground"}`}
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">{review.review.comment}</p>
          {review.service && (
            <div className="mt-3 pt-3 border-t">
              <Badge variant="outline" className="text-xs">
                {review.service.name}
              </Badge>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function UserDashboard() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: bookings, isLoading: bookingsLoading } = trpc.userDashboard.getBookings.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: favorites, isLoading: favoritesLoading } = trpc.userDashboard.getFavorites.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: notifications, isLoading: notificationsLoading } = trpc.notifications.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: myReviews } = trpc.userDashboard.getMyReviews.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("已全部標為已讀");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <User className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">請先登入</h2>
          <p className="text-muted-foreground mb-6">登入後即可查看您的預約和收藏</p>
          <Link href="/login">
            <Button className="gold-gradient text-foreground hover:opacity-90">
              立即登入
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
            <Link href="/search">
              <Button variant="ghost" size="sm">搜尋老師</Button>
            </Link>
            {user?.role === 'superadmin' && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-primary font-medium">
                  ⚙️ 管理員後台
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* User Header */}
        <div className="elegant-card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-3xl shadow-lg">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                "👤"
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-medium">{user?.name || "用戶"}</h1>
              <p className="text-muted-foreground">{user?.email}</p>
              {user?.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" />
                  {user.phone}
                </p>
              )}
            </div>
            {user?.role === "teacher" && (
              <Link href="/teacher/dashboard">
                <Button className="gold-gradient text-foreground hover:opacity-90">
                  老師後台
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Profile Completion */}
        <ProfileCompletion user={user} />

        {/* Dashboard Stats */}
        <DashboardStats 
          bookings={bookings || []} 
          favorites={favorites || []} 
          reviews={myReviews?.length || 0}
        />

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-2">
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="w-4 h-4" />
              我的預約
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="w-4 h-4" />
              收藏老師
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              通知
              {unreadCount && unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              我的評價
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              個人設定
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="elegant-card h-40 animate-pulse bg-muted" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <BookingCard key={booking.booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <div className="elegant-card p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">尚無預約記錄</h3>
                <p className="text-muted-foreground mb-6">開始探索並預約您感興趣的服務</p>
                <Link href="/search">
                  <Button className="gold-gradient text-foreground hover:opacity-90">
                    搜尋老師
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {favoritesLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="elegant-card h-24 animate-pulse bg-muted" />
                ))}
              </div>
            ) : favorites && favorites.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {favorites.map((favorite) => (
                  <FavoriteCard key={favorite.favorite.id} favorite={favorite} />
                ))}
              </div>
            ) : (
              <div className="elegant-card p-12 text-center">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">尚無收藏老師</h3>
                <p className="text-muted-foreground mb-6">瀏覽老師頁面並點擊愛心收藏</p>
                <Link href="/search">
                  <Button className="gold-gradient text-foreground hover:opacity-90">
                    搜尋老師
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <MyReviewsSection />
          </TabsContent>

          <TabsContent value="settings">
            <ProfileSettingsForm user={user} />
          </TabsContent>

          <TabsContent value="notifications">
            <div className="elegant-card overflow-hidden">
              {notifications && notifications.length > 0 && (
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                  <span className="text-sm text-muted-foreground">
                    {unreadCount || 0} 則未讀通知
                  </span>
                  {unreadCount && unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => markAllReadMutation.mutate()}
                    >
                      全部標為已讀
                    </Button>
                  )}
                </div>
              )}
              
              {notificationsLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div>
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">暫無通知</h3>
                  <p className="text-muted-foreground">當有新的預約或消息時，您會在這裡收到通知</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
