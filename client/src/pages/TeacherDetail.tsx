import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  Clock, 
  Heart,
  Award,
  Users,
  MessageSquare,
  ChevronLeft,
  ExternalLink
} from "lucide-react";
import { useState, useRef } from "react";
import { MapView } from "@/components/Map";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? "star-filled fill-current" : "star-empty"}`}
        />
      ))}
    </div>
  );
}

function ServiceCard({ service, onBook }: { service: any; onBook: () => void }) {
  const serviceTypeLabels: Record<string, string> = {
    reading: "算命",
    course: "課程",
    consultation: "諮詢",
  };

  return (
    <div className="elegant-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-lg">{service.service.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{serviceTypeLabels[service.service.serviceType]}</Badge>
            <Badge variant="outline">{service.category.name}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-medium text-primary">
            ${service.service.price} <span className="text-sm text-muted-foreground">{service.service.currency}</span>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />
            {service.service.duration} 分鐘
          </div>
        </div>
      </div>
      
      {service.service.description && (
        <p className="text-sm text-muted-foreground mb-4">{service.service.description}</p>
      )}
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        {service.service.isOnline && <span>✓ 線上服務</span>}
        {service.service.isInPerson && <span>✓ 面對面服務</span>}
        {service.service.maxParticipants > 1 && (
          <span>最多 {service.service.maxParticipants} 人</span>
        )}
      </div>
      
      <Button className="w-full gold-gradient text-foreground hover:opacity-90" onClick={onBook}>
        立即預約
      </Button>
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  return (
    <div className="border-b border-border pb-6 mb-6 last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">
          {review.user?.name?.[0] || "👤"}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium">{review.user?.name || "匿名用戶"}</span>
              {review.review.isVerified && (
                <Badge variant="secondary" className="ml-2 text-xs">已驗證購買</Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(review.review.createdAt).toLocaleDateString("zh-TW")}
            </span>
          </div>
          <StarRating rating={review.review.rating} />
          {review.review.comment && (
            <p className="mt-2 text-muted-foreground">{review.review.comment}</p>
          )}
          {review.review.teacherReply && (
            <div className="mt-4 pl-4 border-l-2 border-primary/30">
              <p className="text-sm font-medium mb-1">老師回覆：</p>
              <p className="text-sm text-muted-foreground">{review.review.teacherReply}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdBanner() {
  return (
    <div className="elegant-card p-4 text-center text-sm text-muted-foreground mb-6">
      <div className="bg-muted/50 border border-dashed border-border rounded-lg p-6">
        <span>廣告位置</span>
        <br />
        <span className="text-xs">(Google Ads)</span>
      </div>
    </div>
  );
}

export default function TeacherDetail() {
  const params = useParams<{ id: string }>();
  const teacherId = parseInt(params.id || "0");
  const { user, isAuthenticated } = useAuth();
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const { data: teacherData, isLoading } = trpc.teachers.getById.useQuery(
    { id: teacherId },
    { enabled: teacherId > 0 }
  );

  const { data: reviews } = trpc.teachers.getReviews.useQuery(
    { teacherProfileId: teacherId },
    { enabled: teacherId > 0 }
  );

  const { data: isFavorite } = trpc.userDashboard.checkFavorite.useQuery(
    { teacherProfileId: teacherId },
    { enabled: isAuthenticated && teacherId > 0 }
  );

  const toggleFavoriteMutation = trpc.userDashboard.toggleFavorite.useMutation({
    onSuccess: (data) => {
      toast.success(data.isFavorite ? "已加入收藏" : "已取消收藏");
    },
  });

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      toast.error("請先登入");
      return;
    }
    toggleFavoriteMutation.mutate({ teacherProfileId: teacherId });
  };

  const handleBook = (serviceId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setSelectedServiceId(serviceId);
    // Navigate to booking page
    window.location.href = `/book/${teacherId}/${serviceId}`;
  };

  // Demo data
  const demoData = {
    profile: {
      id: 1,
      displayName: "李明德大師",
      title: "紫微斗數專家 · 30年經驗",
      bio: "李明德大師自幼對命理學產生濃厚興趣，師承多位名師，專研紫微斗數三十餘年。曾為無數有緣人指點迷津，協助他們在人生重要關口做出正確決定。\n\n大師精通紫微斗數命盤分析，能夠準確解讀個人命運軌跡，提供事業、婚姻、健康、財運等全方位指引。",
      experience: "• 30年紫微斗數研究與實踐經驗\n• 曾任香港命理學會理事\n• 著有《紫微斗數入門》等書籍\n• 服務超過5000位客戶",
      qualifications: "• 香港命理學會認證命理師\n• 台灣紫微斗數學會會員\n• 中華易經研究院研究員",
      avatarUrl: null,
      coverImageUrl: null,
      region: "香港",
      address: "香港中環皇后大道中123號",
      contactEmail: "master.li@example.com",
      contactPhone: "+852 1234 5678",
      website: "https://example.com",
      averageRating: "4.9",
      totalReviews: 128,
      totalBookings: 256,
      isVerified: true,
      isFeatured: true,
      latitude: "22.2819",
      longitude: "114.1580",
    },
    categories: [
      { id: 2, name: "紫微斗數", slug: "ziwei" },
      { id: 1, name: "八字命理", slug: "bazi" },
    ],
    services: [
      {
        service: {
          id: 1,
          name: "紫微斗數命盤分析",
          description: "完整的紫微斗數命盤解讀，包含十二宮位分析、大限流年運勢、事業財運婚姻等全方位指引。",
          serviceType: "reading",
          duration: 60,
          price: "1500",
          currency: "HKD",
          isOnline: true,
          isInPerson: true,
          maxParticipants: 1,
        },
        category: { id: 2, name: "紫微斗數", slug: "ziwei" },
      },
      {
        service: {
          id: 2,
          name: "八字命理諮詢",
          description: "透過八字分析您的先天命格，了解性格特質、運勢起伏、適合的發展方向。",
          serviceType: "reading",
          duration: 45,
          price: "1200",
          currency: "HKD",
          isOnline: true,
          isInPerson: true,
          maxParticipants: 1,
        },
        category: { id: 1, name: "八字命理", slug: "bazi" },
      },
      {
        service: {
          id: 3,
          name: "紫微斗數入門課程",
          description: "適合初學者的紫微斗數基礎課程，學習命盤結構、星曜特性、基本論命技巧。",
          serviceType: "course",
          duration: 120,
          price: "3000",
          currency: "HKD",
          isOnline: true,
          isInPerson: true,
          maxParticipants: 10,
        },
        category: { id: 2, name: "紫微斗數", slug: "ziwei" },
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

  const demoReviews = [
    {
      review: {
        id: 1,
        rating: 5,
        comment: "李大師非常專業，分析得很準確，給了我很多有用的建議。強烈推薦！",
        isVerified: true,
        createdAt: new Date("2024-01-15"),
        teacherReply: "感謝您的信任與支持，祝您一切順利！",
      },
      user: { name: "陳小姐" },
    },
    {
      review: {
        id: 2,
        rating: 5,
        comment: "第一次算命就遇到這麼好的老師，解釋得很清楚，讓我對未來更有信心了。",
        isVerified: true,
        createdAt: new Date("2024-01-10"),
        teacherReply: null,
      },
      user: { name: "王先生" },
    },
    {
      review: {
        id: 3,
        rating: 4,
        comment: "很有耐心地回答我的問題，分析也很到位。",
        isVerified: false,
        createdAt: new Date("2024-01-05"),
        teacherReply: null,
      },
      user: { name: "林小姐" },
    },
  ];

  const data = teacherData || demoData;
  const displayReviews = reviews && reviews.length > 0 ? reviews : demoReviews;

  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
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
          <div className="flex items-center gap-4">
            <Link href="/search">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                返回搜尋
              </Button>
            </Link>
          </div>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">☯️</span>
            <span className="text-xl font-medium">SoulGuide</span>
          </Link>
          <div className="w-24" />
        </div>
      </nav>

      {/* Cover Image */}
      <div className="h-48 md:h-64 purple-gradient relative">
        {data.profile.coverImageUrl && (
          <img 
            src={data.profile.coverImageUrl} 
            alt="" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="container">
        {/* Profile Header */}
        <div className="relative -mt-16 mb-8">
          <div className="elegant-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="w-32 h-32 rounded-full bg-secondary border-4 border-card -mt-20 flex items-center justify-center text-5xl flex-shrink-0">
                {data.profile.avatarUrl ? (
                  <img src={data.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-medium flex items-center gap-3">
                      {data.profile.displayName}
                      {data.profile.isVerified && (
                        <span className="text-primary" title="認證老師">
                          <Award className="w-6 h-6" />
                        </span>
                      )}
                    </h1>
                    <p className="text-muted-foreground mt-1">{data.profile.title}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleToggleFavorite}
                      className={isFavorite ? "text-red-500" : ""}
                    >
                      <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                    </Button>
                    <Link href={`/book/${teacherId}`}>
                      <Button className="gold-gradient text-foreground hover:opacity-90">
                        <Calendar className="w-4 h-4 mr-2" />
                        立即預約
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 star-filled" />
                    <span className="font-medium text-lg">{data.profile.averageRating}</span>
                    <span className="text-muted-foreground">({data.profile.totalReviews} 評價)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-5 h-5" />
                    <span>{data.profile.totalBookings} 次預約</span>
                  </div>
                  {data.profile.region && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span>{data.profile.region}</span>
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {data.categories.map((cat) => (
                    <Badge key={cat.id} variant="secondary">{cat.name}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 pb-16">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="about">關於</TabsTrigger>
                <TabsTrigger value="services">服務項目</TabsTrigger>
                <TabsTrigger value="reviews">評價 ({data.profile.totalReviews})</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                <div className="elegant-card p-6">
                  <h3 className="font-medium text-lg mb-4">個人簡介</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{data.profile.bio}</p>
                </div>

                {data.profile.experience && (
                  <div className="elegant-card p-6">
                    <h3 className="font-medium text-lg mb-4">經驗與資歷</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{data.profile.experience}</p>
                  </div>
                )}

                {data.profile.qualifications && (
                  <div className="elegant-card p-6">
                    <h3 className="font-medium text-lg mb-4">專業認證</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{data.profile.qualifications}</p>
                  </div>
                )}

                {/* Availability */}
                <div className="elegant-card p-6">
                  <h3 className="font-medium text-lg mb-4">服務時間</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {data.availability.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                          {dayNames[slot.dayOfWeek]}
                        </span>
                        <span className="text-muted-foreground">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4">
                {data.services.map((service) => (
                  <ServiceCard 
                    key={service.service.id} 
                    service={service} 
                    onBook={() => handleBook(service.service.id)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="reviews">
                <div className="elegant-card p-6">
                  {displayReviews.map((review) => (
                    <ReviewCard key={review.review.id} review={review} />
                  ))}
                  
                  {displayReviews.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      暫無評價
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="elegant-card p-6">
              <h3 className="font-medium text-lg mb-4">聯絡方式</h3>
              <div className="space-y-3">
                {data.profile.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{data.profile.address}</span>
                  </div>
                )}
                {data.profile.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <a href={`tel:${data.profile.contactPhone}`} className="text-sm hover:text-primary">
                      {data.profile.contactPhone}
                    </a>
                  </div>
                )}
                {data.profile.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <a href={`mailto:${data.profile.contactEmail}`} className="text-sm hover:text-primary">
                      {data.profile.contactEmail}
                    </a>
                  </div>
                )}
                {data.profile.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <a href={data.profile.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary flex items-center gap-1">
                      網站 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Map */}
              {data.profile.latitude && data.profile.longitude && (
                <div className="mt-4">
                  <MapView
                    className="h-40 rounded-lg overflow-hidden"
                    initialCenter={{ 
                      lat: parseFloat(data.profile.latitude), 
                      lng: parseFloat(data.profile.longitude) 
                    }}
                    initialZoom={15}
                    onMapReady={(map) => {
                      new google.maps.marker.AdvancedMarkerElement({
                        map,
                        position: { 
                          lat: parseFloat(data.profile.latitude!), 
                          lng: parseFloat(data.profile.longitude!) 
                        },
                        title: data.profile.displayName,
                      });
                    }}
                  />
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${data.profile.latitude},${data.profile.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-4 h-4" />
                    在 Google Maps 中開啟導航
                  </a>
                </div>
              )}
              
              {/* Address without coordinates - show link to search */}
              {data.profile.address && !data.profile.latitude && (
                <div className="mt-4">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.profile.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-4 h-4" />
                    在 Google Maps 中查看位置
                  </a>
                </div>
              )}
            </div>

            {/* Ad */}
            <AdBanner />

            {/* Quick Book */}
            <div className="elegant-card p-6">
              <h3 className="font-medium text-lg mb-4">快速預約</h3>
              <p className="text-sm text-muted-foreground mb-4">
                選擇服務項目並預約您方便的時間
              </p>
              <Link href={`/book/${teacherId}`}>
                <Button className="w-full gold-gradient text-foreground hover:opacity-90">
                  <Calendar className="w-4 h-4 mr-2" />
                  查看可預約時段
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
