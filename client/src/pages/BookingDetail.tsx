import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Link, useParams, useLocation } from "wouter";
import { 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video,
  CreditCard,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

const statusConfig: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { text: "待確認", variant: "secondary", icon: <Clock className="w-4 h-4" /> },
  confirmed: { text: "已確認", variant: "default", icon: <CheckCircle className="w-4 h-4" /> },
  completed: { text: "已完成", variant: "outline", icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { text: "已取消", variant: "destructive", icon: <XCircle className="w-4 h-4" /> },
  refunded: { text: "已退款", variant: "destructive", icon: <RefreshCw className="w-4 h-4" /> },
};

const paymentStatusConfig: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { text: "待付款", variant: "secondary" },
  paid: { text: "已付款", variant: "default" },
  refunded: { text: "已退款", variant: "destructive" },
};

export default function BookingDetail() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = parseInt(params.bookingId || "0");
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState<string | null>(null);

  const { data, isLoading, error } = trpc.bookings.getById.useQuery(
    { id: bookingId },
    { enabled: bookingId > 0 && isAuthenticated }
  );

  // Get teacher availability for rescheduling
  const { data: availability } = trpc.teachers.getAvailability.useQuery(
    { teacherProfileId: data?.teacherProfile?.id || 0 },
    { enabled: !!data?.teacherProfile?.id && isRescheduleOpen }
  );

  // Get booked slots for the new date
  const { data: bookedSlots } = trpc.bookings.getBookedSlots.useQuery(
    { teacherProfileId: data?.teacherProfile?.id || 0, date: newDate?.toISOString() || "" },
    { enabled: !!newDate && !!data?.teacherProfile?.id && isRescheduleOpen }
  );

  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("預約已取消");
      utils.bookings.getById.invalidate({ id: bookingId });
      utils.userDashboard.getBookings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "取消失敗");
    },
  });

  const rescheduleMutation = trpc.bookings.reschedule.useMutation({
    onSuccess: () => {
      toast.success("預約已改期，等待老師確認");
      setIsRescheduleOpen(false);
      setNewDate(undefined);
      setNewTime(null);
      utils.bookings.getById.invalidate({ id: bookingId });
      utils.userDashboard.getBookings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "改期失敗");
    },
  });

  const payMutation = trpc.bookings.createCheckoutSession.useMutation({
    onSuccess: (result) => {
      window.open(result.checkoutUrl, "_blank");
      toast.info("已在新視窗開啟付款頁面");
    },
    onError: (err) => {
      toast.error(err.message || "無法建立付款連結");
    },
  });

  // Calculate available time slots for rescheduling
  const availableTimeSlots = useMemo(() => {
    if (!newDate || !availability || !data?.service) return [];

    const dayOfWeek = newDate.getDay();
    const dayAvailability = availability.filter((a: { dayOfWeek: number }) => a.dayOfWeek === dayOfWeek);
    
    if (dayAvailability.length === 0) return [];

    const slots: string[] = [];
    const serviceDuration = data.service.duration;

    dayAvailability.forEach((slot: { startTime: string; endTime: string }) => {
      const [startHour, startMin] = slot.startTime.split(":").map(Number);
      const [endHour, endMin] = slot.endTime.split(":").map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;

      while (currentHour * 60 + currentMin + serviceDuration <= endHour * 60 + endMin) {
        const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
        slots.push(timeStr);
        
        currentMin += 30;
        if (currentMin >= 60) {
          currentHour += 1;
          currentMin = 0;
        }
      }
    });

    return slots;
  }, [newDate, availability, data?.service]);

  // Check if a time slot is booked
  const isTimeSlotBooked = (time: string) => {
    if (!bookedSlots || !data?.service) return false;
    const [hour, min] = time.split(":").map(Number);
    const slotStart = hour * 60 + min;
    const slotEnd = slotStart + data.service.duration;

    return bookedSlots.some((booked) => {
      const [bStartH, bStartM] = booked.startTime.split(":").map(Number);
      const [bEndH, bEndM] = booked.endTime.split(":").map(Number);
      const bookedStart = bStartH * 60 + bStartM;
      const bookedEnd = bEndH * 60 + bEndM;
      return slotStart < bookedEnd && slotEnd > bookedStart;
    });
  };

  // Calculate new end time
  const newEndTime = useMemo(() => {
    if (!newTime || !data?.service) return null;
    const [hour, min] = newTime.split(":").map(Number);
    const totalMin = hour * 60 + min + data.service.duration;
    const endHour = Math.floor(totalMin / 60);
    const endMin = totalMin % 60;
    return `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
  }, [newTime, data?.service]);

  // Check if date is available
  const isDateAvailable = (date: Date) => {
    if (!availability) return false;
    const dayOfWeek = date.getDay();
    return availability.some((a: { dayOfWeek: number }) => a.dayOfWeek === dayOfWeek);
  };

  const handleReschedule = () => {
    if (!newDate || !newTime || !newEndTime) {
      toast.error("請選擇新的日期和時間");
      return;
    }
    rescheduleMutation.mutate({
      bookingId,
      newDate: newDate.toISOString(),
      newStartTime: newTime,
      newEndTime: newEndTime,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">請先登入</h2>
          <p className="text-muted-foreground mb-6">您需要登入才能查看預約詳情</p>
          <a href={getLoginUrl()}>
            <Button className="gold-gradient text-foreground hover:opacity-90">
              立即登入
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">找不到預約</h2>
          <p className="text-muted-foreground mb-6">該預約不存在或您沒有權限查看</p>
          <Link href="/dashboard">
            <Button>返回我的預約</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { booking, service, teacherProfile } = data;
  const status = statusConfig[booking.status] || statusConfig.pending;
  const paymentStatus = paymentStatusConfig[booking.paymentStatus] || paymentStatusConfig.pending;
  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const canReschedule = booking.status === "pending" || booking.status === "confirmed";
  const canPay = booking.paymentStatus === "pending" && booking.status !== "cancelled";

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              返回
            </Button>
          </Link>
          <span className="font-medium">預約詳情</span>
          <div className="w-20" />
        </div>
      </nav>

      <div className="container py-8 max-w-3xl">
        {/* Status Banner */}
        <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
          booking.status === "confirmed" ? "bg-green-50 text-green-800 border border-green-200" :
          booking.status === "cancelled" ? "bg-red-50 text-red-800 border border-red-200" :
          booking.status === "completed" ? "bg-blue-50 text-blue-800 border border-blue-200" :
          "bg-yellow-50 text-yellow-800 border border-yellow-200"
        }`}>
          {status.icon}
          <div>
            <span className="font-medium">預約狀態：{status.text}</span>
            {booking.status === "pending" && (
              <p className="text-sm opacity-80">等待老師確認您的預約</p>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Teacher & Service Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">預約資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl">
                  {teacherProfile?.avatarUrl ? (
                    <img src={teacherProfile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    "👤"
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-lg">{teacherProfile?.displayName}</h3>
                  <p className="text-muted-foreground">{teacherProfile?.title}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">服務項目</p>
                    <p className="font-medium">{service?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">預約日期</p>
                    <p className="font-medium">
                      {format(new Date(booking.bookingDate), "yyyy年M月d日 (EEEE)", { locale: zhTW })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">預約時間</p>
                    <p className="font-medium">{booking.startTime} - {booking.endTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {booking.isOnline ? (
                    <Video className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">服務方式</p>
                    <p className="font-medium">{booking.isOnline ? "線上視訊" : "面對面"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">付款資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">服務費用</span>
                <span className="font-medium text-lg">${booking.totalAmount} {booking.currency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">付款狀態</span>
                <Badge variant={paymentStatus.variant}>{paymentStatus.text}</Badge>
              </div>

              {canPay && (
                <Button 
                  className="w-full gold-gradient text-foreground hover:opacity-90"
                  onClick={() => payMutation.mutate({ bookingId: booking.id })}
                  disabled={payMutation.isPending}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {payMutation.isPending ? "處理中..." : "立即付款"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          {(booking.userPhone || booking.userEmail || booking.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">聯絡資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.userPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span>{booking.userPhone}</span>
                  </div>
                )}
                {booking.userEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <span>{booking.userEmail}</span>
                  </div>
                )}
                {booking.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">備註</p>
                    <p className="bg-muted p-3 rounded-lg">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {(canReschedule || canCancel) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">預約操作</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                {canReschedule && (
                  <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        改期
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>預約改期</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">選擇新日期</p>
                          <Calendar
                            mode="single"
                            selected={newDate}
                            onSelect={(date) => {
                              setNewDate(date);
                              setNewTime(null);
                            }}
                            disabled={(date) => date < new Date() || !isDateAvailable(date)}
                            locale={zhTW}
                            className="mx-auto"
                          />
                        </div>

                        {newDate && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">選擇新時間</p>
                            {availableTimeSlots.length > 0 ? (
                              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                                {availableTimeSlots.map((time) => {
                                  const isBooked = isTimeSlotBooked(time);
                                  return (
                                    <Button
                                      key={time}
                                      variant={newTime === time ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => !isBooked && setNewTime(time)}
                                      disabled={isBooked}
                                      className={isBooked ? "opacity-50 line-through" : ""}
                                    >
                                      {time}
                                    </Button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-center py-4">
                                該日期暫無可預約時段
                              </p>
                            )}
                          </div>
                        )}

                        {newDate && newTime && newEndTime && (
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm font-medium">新預約時間</p>
                            <p className="text-sm text-muted-foreground">
                              {format(newDate, "yyyy年M月d日", { locale: zhTW })} {newTime} - {newEndTime}
                            </p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">取消</Button>
                        </DialogClose>
                        <Button 
                          onClick={handleReschedule}
                          disabled={!newDate || !newTime || rescheduleMutation.isPending}
                        >
                          {rescheduleMutation.isPending ? "處理中..." : "確認改期"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {canCancel && (
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => {
                      if (confirm("確定要取消此預約嗎？此操作無法撤銷。")) {
                        cancelMutation.mutate({ id: booking.id });
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {cancelMutation.isPending ? "處理中..." : "取消預約"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">預約時間線</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="font-medium">預約建立</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.createdAt), "yyyy年M月d日 HH:mm", { locale: zhTW })}
                    </p>
                  </div>
                </div>
                
                {booking.status === "confirmed" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="font-medium">老師已確認</p>
                      <p className="text-sm text-muted-foreground">預約已確認，請準時出席</p>
                    </div>
                  </div>
                )}

                {booking.paymentStatus === "paid" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="font-medium">付款完成</p>
                      <p className="text-sm text-muted-foreground">已完成線上付款</p>
                    </div>
                  </div>
                )}

                {booking.status === "completed" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium">服務完成</p>
                      <p className="text-sm text-muted-foreground">感謝您的預約</p>
                    </div>
                  </div>
                )}

                {booking.status === "cancelled" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2" />
                    <div>
                      <p className="font-medium">預約已取消</p>
                      <p className="text-sm text-muted-foreground">此預約已被取消</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
