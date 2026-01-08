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
  MessageSquare,
  User,
  LogOut,
  CreditCard,
  Phone,
  Instagram,
  Save,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

const statusLabels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { text: "待確認", variant: "secondary" },
  confirmed: { text: "已確認", variant: "default" },
  completed: { text: "已完成", variant: "outline" },
  cancelled: { text: "已取消", variant: "destructive" },
  refunded: { text: "已退款", variant: "destructive" },
};

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
    <div className="elegant-card p-6">
      <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
        <User className="w-5 h-5" />
        個人資料
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
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

      {/* Login Method Info */}
      <div className="mt-8 pt-6 border-t">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">帳戶資訊</h4>
        <div className="text-sm">
          <p>登入方式：{user?.loginMethod === 'email' ? '電郵/密碼' : 'Manus 帳戶'}</p>
          <p className="text-muted-foreground">
            註冊日期：{user?.createdAt ? format(new Date(user.createdAt), "yyyy年M月d日") : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const status = statusLabels[booking.booking.status] || statusLabels.pending;
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
    onSuccess: (data) => {
      window.open(data.checkoutUrl, "_blank");
      toast.info("已在新視窗開啟付款頁面");
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "無法建立付款連結");
    },
  });

  const canCancel = booking.booking.status === "pending" || booking.booking.status === "confirmed";
  const canReview = booking.booking.status === "completed";
  const canPay = booking.booking.paymentStatus === "pending" && booking.booking.status !== "cancelled";

  return (
    <div className="elegant-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl">
            {booking.teacherProfile.avatarUrl ? (
              <img src={booking.teacherProfile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              "👤"
            )}
          </div>
          <div>
            <h4 className="font-medium">{booking.teacherProfile.displayName}</h4>
            <p className="text-sm text-muted-foreground">{booking.service.name}</p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.text}</Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {format(new Date(booking.booking.bookingDate), "M月d日", { locale: zhTW })}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {booking.booking.startTime} - {booking.booking.endTime}
        </span>
        {booking.booking.isOnline ? (
          <span>線上</span>
        ) : (
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            面對面
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-medium text-primary">
          ${booking.booking.totalAmount} {booking.booking.currency}
        </span>
        <div className="flex gap-2">
          {canPay && (
            <Button 
              size="sm"
              className="gold-gradient text-foreground hover:opacity-90"
              onClick={() => payMutation.mutate({ bookingId: booking.booking.id })}
              disabled={payMutation.isPending}
            >
              <CreditCard className="w-4 h-4 mr-1" />
              {payMutation.isPending ? "處理中..." : "立即付款"}
            </Button>
          )}
          {canCancel && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (confirm("確定要取消此預約嗎？")) {
                  cancelMutation.mutate({ id: booking.booking.id });
                }
              }}
            >
              取消預約
            </Button>
          )}
          {canReview && (
            <Link href={`/review/${booking.booking.id}`}>
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-1" />
                撰寫評價
              </Button>
            </Link>
          )}
          <Link href={`/booking/${booking.booking.id}`}>
            <Button variant="outline" size="sm">
              查看詳情
            </Button>
          </Link>
          <Link href={`/teacher/${booking.teacherProfile.id}`}>
            <Button variant="ghost" size="sm">
              查看老師 <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
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
    <Link href={`/teacher/${favorite.profile.id}`}>
      <div className="elegant-card p-4 cursor-pointer group">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl">
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
              <span className="text-sm">{favorite.profile.averageRating}</span>
              {favorite.profile.region && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{favorite.profile.region}</span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={(e) => {
              e.preventDefault();
              toggleMutation.mutate({ teacherProfileId: favorite.profile.id });
            }}
          >
            <Heart className="w-5 h-5 fill-current" />
          </Button>
        </div>
      </div>
    </Link>
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

  const typeIcons: Record<string, React.ReactNode> = {
    booking_new: <Calendar className="w-5 h-5 text-blue-500" />,
    booking_confirmed: <Calendar className="w-5 h-5 text-green-500" />,
    booking_cancelled: <Calendar className="w-5 h-5 text-red-500" />,
    booking_reminder: <Clock className="w-5 h-5 text-orange-500" />,
    review_new: <Star className="w-5 h-5 text-yellow-500" />,
    system: <Bell className="w-5 h-5 text-gray-500" />,
  };

  return (
    <div 
      className={`p-4 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
        !notification.isRead ? "bg-primary/5" : ""
      }`}
      onClick={() => {
        if (!notification.isRead) {
          markReadMutation.mutate({ id: notification.id });
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {typeIcons[notification.type] || typeIcons.system}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className={`font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
              {notification.title}
            </h4>
            <span className="text-xs text-muted-foreground">
              {format(new Date(notification.createdAt), "M/d HH:mm")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
        )}
      </div>
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

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("已全部標為已讀");
    },
  });

  if (loading) {
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
          <User className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">請先登入</h2>
          <p className="text-muted-foreground mb-6">登入後即可查看您的預約和收藏</p>
          <a href={getLoginUrl()}>
            <Button className="gold-gradient text-foreground hover:opacity-90">
              立即登入
            </Button>
          </a>
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
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* User Header */}
        <div className="elegant-card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                "👤"
              )}
            </div>
            <div>
              <h1 className="text-2xl font-medium">{user?.name || "用戶"}</h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
            {user?.role === "teacher" && (
              <Link href="/teacher/dashboard" className="ml-auto">
                <Button variant="outline">
                  老師後台
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="mb-6">
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
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              個人設定
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

          <TabsContent value="settings">
            <ProfileSettingsForm user={user} />
          </TabsContent>

          <TabsContent value="notifications">
            <div className="elegant-card overflow-hidden">
              {notifications && notifications.length > 0 && (
                <div className="p-4 border-b flex items-center justify-between">
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
                notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))
              ) : (
                <div className="p-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">暫無通知</h3>
                  <p className="text-muted-foreground">當有新的預約或評價時，您會在這裡收到通知</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
