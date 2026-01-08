import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { trpc } from "@/lib/trpc";
import { Link, useParams, useLocation } from "wouter";
import { 
  ChevronLeft, 
  Clock, 
  MapPin, 
  Video,
  CreditCard,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";

type BookingStep = "service" | "datetime" | "details" | "payment" | "confirmation";

export default function Booking() {
  const params = useParams<{ teacherId: string; serviceId?: string }>();
  const teacherId = parseInt(params.teacherId || "0");
  const preselectedServiceId = params.serviceId ? parseInt(params.serviceId) : null;
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<BookingStep>("service");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(preselectedServiceId);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [notes, setNotes] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: teacherData, isLoading } = trpc.teachers.getById.useQuery(
    { id: teacherId },
    { enabled: teacherId > 0 }
  );

  const [bookingId, setBookingId] = useState<number | null>(null);

  const createBookingMutation = trpc.bookings.create.useMutation({
    onSuccess: (data) => {
      if (data.bookingId) setBookingId(data.bookingId);
      toast.success("預約已建立！正在跳轉到付款頁面...");
    },
    onError: (error) => {
      toast.error(error.message || "預約失敗，請稍後再試");
    },
  });

  const createCheckoutMutation = trpc.bookings.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      window.open(data.checkoutUrl, "_blank");
      toast.info("已在新視窗開啟付款頁面");
      setStep("confirmation");
    },
    onError: (error) => {
      toast.error(error.message || "無法建立付款連結");
    },
  });

  // Demo data
  const demoData = {
    profile: {
      id: 1,
      displayName: "李明德大師",
      title: "紫微斗數專家 · 30年經驗",
      avatarUrl: null,
      region: "香港",
      address: "香港中環皇后大道中123號",
    },
    services: [
      {
        service: {
          id: 1,
          name: "紫微斗數命盤分析",
          description: "完整的紫微斗數命盤解讀",
          serviceType: "reading",
          duration: 60,
          price: "1500",
          currency: "HKD",
          isOnline: true,
          isInPerson: true,
        },
        category: { name: "紫微斗數" },
      },
      {
        service: {
          id: 2,
          name: "八字命理諮詢",
          description: "透過八字分析您的先天命格",
          serviceType: "reading",
          duration: 45,
          price: "1200",
          currency: "HKD",
          isOnline: true,
          isInPerson: true,
        },
        category: { name: "八字命理" },
      },
    ],
    availability: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 5, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 6, startTime: "10:00", endTime: "14:00" },
    ],
  };

  const data = teacherData || demoData;
  const selectedService = data.services.find(s => s.service.id === selectedServiceId);

  // Generate available time slots based on availability
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = data.availability.filter(a => a.dayOfWeek === dayOfWeek);
    
    if (dayAvailability.length === 0) return [];

    const slots: string[] = [];
    const duration = selectedService?.service.duration || 60;

    dayAvailability.forEach(avail => {
      const [startHour, startMin] = avail.startTime.split(":").map(Number);
      const [endHour, endMin] = avail.endTime.split(":").map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const slotEnd = currentMin + duration;
        const endSlotHour = currentHour + Math.floor(slotEnd / 60);
        const endSlotMin = slotEnd % 60;
        
        if (endSlotHour < endHour || (endSlotHour === endHour && endSlotMin <= endMin)) {
          slots.push(`${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`);
        }
        
        currentMin += 30;
        if (currentMin >= 60) {
          currentHour += 1;
          currentMin = 0;
        }
      }
    });

    return slots;
  }, [selectedDate, data.availability, selectedService]);

  // Calculate end time
  const endTime = useMemo(() => {
    if (!selectedTime || !selectedService) return null;
    const [hour, min] = selectedTime.split(":").map(Number);
    const totalMin = hour * 60 + min + selectedService.service.duration;
    const endHour = Math.floor(totalMin / 60);
    const endMin = totalMin % 60;
    return `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
  }, [selectedTime, selectedService]);

  // Check if date is available
  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    return data.availability.some(a => a.dayOfWeek === dayOfWeek);
  };

  const handleSubmit = async () => {
    if (!selectedServiceId || !selectedDate || !selectedTime || !endTime) {
      toast.error("請填寫所有必要資訊");
      return;
    }

    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBookingMutation.mutateAsync({
        teacherProfileId: teacherId,
        serviceId: selectedServiceId,
        bookingDate: selectedDate.toISOString(),
        startTime: selectedTime,
        endTime: endTime,
        notes: notes || undefined,
        userPhone: userPhone || undefined,
        userEmail: userEmail || undefined,
        isOnline,
      });
      
      // Create checkout session for payment
      if (result.bookingId) {
        await createCheckoutMutation.mutateAsync({ bookingId: result.bookingId });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayLater = async () => {
    if (!selectedServiceId || !selectedDate || !selectedTime || !endTime) {
      toast.error("請填寫所有必要資訊");
      return;
    }

    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    setIsSubmitting(true);
    try {
      await createBookingMutation.mutateAsync({
        teacherProfileId: teacherId,
        serviceId: selectedServiceId,
        bookingDate: selectedDate.toISOString(),
        startTime: selectedTime,
        endTime: endTime,
        notes: notes || undefined,
        userPhone: userPhone || undefined,
        userEmail: userEmail || undefined,
        isOnline,
      });
      setStep("confirmation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">請先登入</h2>
          <p className="text-muted-foreground mb-6">您需要登入才能進行預約</p>
          <a href={getLoginUrl()}>
            <Button className="gold-gradient text-foreground hover:opacity-90">
              立即登入
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-medium mb-2">預約成功！</h2>
          <p className="text-muted-foreground mb-6">
            您的預約已提交，老師確認後會通知您。
          </p>
          <div className="space-y-3">
            <Link href="/dashboard">
              <Button className="w-full">查看我的預約</Button>
            </Link>
            <Link href={`/teacher/${teacherId}`}>
              <Button variant="outline" className="w-full">返回老師頁面</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href={`/teacher/${teacherId}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              返回
            </Button>
          </Link>
          <span className="font-medium">預約服務</span>
          <div className="w-20" />
        </div>
      </nav>

      <div className="container py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["service", "datetime", "details", "payment"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? "bg-primary text-primary-foreground" :
                ["service", "datetime", "details", "payment"].indexOf(step) > i ? "bg-primary/20 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              {i < 3 && <div className="w-12 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Select Service */}
            {step === "service" && (
              <div className="space-y-4">
                <h2 className="text-xl font-medium mb-4">選擇服務項目</h2>
                <RadioGroup value={selectedServiceId?.toString()} onValueChange={(v) => setSelectedServiceId(parseInt(v))}>
                  {data.services.map((s) => (
                    <div key={s.service.id} className="elegant-card p-4 cursor-pointer">
                      <label className="flex items-start gap-4 cursor-pointer">
                        <RadioGroupItem value={s.service.id.toString()} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{s.service.name}</h4>
                              <p className="text-sm text-muted-foreground">{s.category.name}</p>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-primary">
                                ${s.service.price} {s.service.currency}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {s.service.duration} 分鐘
                              </div>
                            </div>
                          </div>
                          {s.service.description && (
                            <p className="text-sm text-muted-foreground mt-2">{s.service.description}</p>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={() => setStep("datetime")} 
                    disabled={!selectedServiceId}
                    className="gold-gradient text-foreground hover:opacity-90"
                  >
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Select Date & Time */}
            {step === "datetime" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium mb-4">選擇日期與時間</h2>
                
                <div className="elegant-card p-6">
                  <h3 className="font-medium mb-4">選擇日期</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || !isDateAvailable(date)}
                    locale={zhTW}
                    className="mx-auto"
                  />
                </div>

                {selectedDate && (
                  <div className="elegant-card p-6">
                    <h3 className="font-medium mb-4">
                      選擇時間 - {format(selectedDate, "M月d日 (EEEE)", { locale: zhTW })}
                    </h3>
                    {availableTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {availableTimeSlots.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(time)}
                            className={selectedTime === time ? "gold-gradient text-foreground" : ""}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        該日期暫無可預約時段
                      </p>
                    )}
                  </div>
                )}

                {/* Service Mode */}
                {selectedService && (selectedService.service.isOnline || selectedService.service.isInPerson) && (
                  <div className="elegant-card p-6">
                    <h3 className="font-medium mb-4">服務方式</h3>
                    <RadioGroup value={isOnline ? "online" : "inperson"} onValueChange={(v) => setIsOnline(v === "online")}>
                      <div className="flex gap-4">
                        {selectedService.service.isInPerson && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="inperson" />
                            <MapPin className="w-4 h-4" />
                            <span>面對面</span>
                          </label>
                        )}
                        {selectedService.service.isOnline && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="online" />
                            <Video className="w-4 h-4" />
                            <span>線上視訊</span>
                          </label>
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep("service")}>
                    上一步
                  </Button>
                  <Button 
                    onClick={() => setStep("details")} 
                    disabled={!selectedDate || !selectedTime}
                    className="gold-gradient text-foreground hover:opacity-90"
                  >
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Details */}
            {step === "details" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium mb-4">聯絡資料</h2>
                
                <div className="elegant-card p-6 space-y-4">
                  <div>
                    <Label htmlFor="email">電郵地址</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">聯絡電話</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+852 1234 5678"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">備註（選填）</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="請輸入您想讓老師事先知道的資訊..."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep("datetime")}>
                    上一步
                  </Button>
                  <Button 
                    onClick={() => setStep("payment")}
                    className="gold-gradient text-foreground hover:opacity-90"
                  >
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Payment */}
            {step === "payment" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium mb-4">確認並付款</h2>
                
                <div className="elegant-card p-6">
                  <h3 className="font-medium mb-4">付款方式</h3>
                  <div className="space-y-4">
                    <div className="border border-primary rounded-lg p-4 bg-primary/5">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-primary" />
                        <div>
                          <p className="font-medium">線上付款</p>
                          <p className="text-sm text-muted-foreground">使用信用卡或 Debit 卡安全付款</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      點擊「立即付款」後將跳轉至安全的 Stripe 付款頁面
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-6">
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep("details")}>
                      上一步
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="gold-gradient text-foreground hover:opacity-90"
                    >
                      {isSubmitting ? "處理中..." : "立即付款"}
                    </Button>
                  </div>
                  <Button 
                    variant="ghost"
                    onClick={handlePayLater}
                    disabled={isSubmitting}
                    className="text-muted-foreground"
                  >
                    稍後付款（先預約）
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="elegant-card p-6 sticky top-24">
              <h3 className="font-medium mb-4">預約摘要</h3>
              
              {/* Teacher Info */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl">
                  {data.profile.avatarUrl ? (
                    <img src={data.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    "👤"
                  )}
                </div>
                <div>
                  <p className="font-medium">{data.profile.displayName}</p>
                  <p className="text-sm text-muted-foreground">{data.profile.region}</p>
                </div>
              </div>

              {/* Selected Service */}
              {selectedService && (
                <div className="py-4 border-b">
                  <p className="text-sm text-muted-foreground">服務項目</p>
                  <p className="font-medium">{selectedService.service.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {selectedService.service.duration} 分鐘
                  </p>
                </div>
              )}

              {/* Selected Date & Time */}
              {selectedDate && selectedTime && (
                <div className="py-4 border-b">
                  <p className="text-sm text-muted-foreground">日期與時間</p>
                  <p className="font-medium">
                    {format(selectedDate, "yyyy年M月d日 (EEEE)", { locale: zhTW })}
                  </p>
                  <p className="text-sm">
                    {selectedTime} - {endTime}
                  </p>
                </div>
              )}

              {/* Service Mode */}
              {selectedService && (
                <div className="py-4 border-b">
                  <p className="text-sm text-muted-foreground">服務方式</p>
                  <p className="font-medium flex items-center gap-2">
                    {isOnline ? (
                      <>
                        <Video className="w-4 h-4" />
                        線上視訊
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        面對面
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Total */}
              {selectedService && (
                <div className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">總計</span>
                    <span className="text-2xl font-medium text-primary">
                      ${selectedService.service.price} {selectedService.service.currency}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
