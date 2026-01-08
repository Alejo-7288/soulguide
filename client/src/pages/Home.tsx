import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { 
  Search, 
  Star, 
  MapPin, 
  Calendar, 
  ChevronRight,
  Sparkles,
  Users,
  Award,
  Clock
} from "lucide-react";
import { useState } from "react";

// Category icons mapping
const categoryIcons: Record<string, string> = {
  "bazi": "🔮",
  "ziwei": "⭐",
  "tarot": "🃏",
  "fengshui": "🏠",
  "qimen": "📐",
  "meihua": "🌸",
  "yijing": "☯️",
  "astrology": "🌙",
  "numerology": "🔢",
  "palmistry": "✋",
  "meditation": "🧘",
  "healing": "💫",
};

function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 pattern-bg" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
      
      <div className="container relative z-10 text-center py-20">
        {/* Logo/Brand */}
        <div className="mb-8">
          <span className="inline-block text-6xl mb-4">☯️</span>
          <h1 className="text-5xl md:text-7xl font-medium tracking-tight mb-4">
            <span className="text-gradient">SoulGuide</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            探索身心靈與中西方術數的專業媒合平台
            <br />
            連結您與資深術數老師，開啟命運之門
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="elegant-card p-2 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="搜尋老師、服務或術數類型..."
                className="pl-12 h-14 text-lg border-0 bg-transparent focus-visible:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link href={`/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}>
              <Button className="h-14 px-8 text-lg gold-gradient text-foreground hover:opacity-90">
                搜尋
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>100+ 專業老師</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span>10+ 術數類別</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 star-filled" />
            <span>4.8 平均評分</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  const { data: categories, isLoading } = trpc.categories.list.useQuery();

  const defaultCategories = [
    { id: 1, name: "八字命理", slug: "bazi", description: "透過出生年月日時分析命運" },
    { id: 2, name: "紫微斗數", slug: "ziwei", description: "中國傳統命理學精髓" },
    { id: 3, name: "塔羅占卜", slug: "tarot", description: "西方神秘學占卜藝術" },
    { id: 4, name: "風水堪輿", slug: "fengshui", description: "環境能量與空間布局" },
    { id: 5, name: "奇門遁甲", slug: "qimen", description: "古代帝王決策之術" },
    { id: 6, name: "梅花易數", slug: "meihua", description: "象數易學占卜法" },
    { id: 7, name: "西洋占星", slug: "astrology", description: "星象與命運的連結" },
    { id: 8, name: "靈性療癒", slug: "healing", description: "能量療癒與身心平衡" },
  ];

  const displayCategories = categories && categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-medium mb-4">探索術數類別</h2>
          <div className="section-divider" />
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            從傳統中國術數到西方神秘學，找到最適合您的指引
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {displayCategories.map((category) => (
            <Link key={category.id} href={`/search?category=${category.slug}`}>
              <div className="elegant-card p-6 text-center cursor-pointer group">
                <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">
                  {categoryIcons[category.slug] || "✨"}
                </span>
                <h3 className="font-medium text-lg mb-2">{category.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedTeachersSection() {
  const { data: teachers, isLoading } = trpc.teachers.featured.useQuery({ limit: 6 });

  // Demo data for initial display
  const demoTeachers = [
    {
      profile: {
        id: 1,
        displayName: "李明德大師",
        title: "紫微斗數專家 · 30年經驗",
        avatarUrl: null,
        region: "香港",
        averageRating: "4.9",
        totalReviews: 128,
        isFeatured: true,
        isVerified: true,
      },
    },
    {
      profile: {
        id: 2,
        displayName: "陳雅琳老師",
        title: "塔羅占卜師 · 心靈導師",
        avatarUrl: null,
        region: "台北",
        averageRating: "4.8",
        totalReviews: 96,
        isFeatured: true,
        isVerified: true,
      },
    },
    {
      profile: {
        id: 3,
        displayName: "王志強師傅",
        title: "風水堪輿 · 八字命理",
        avatarUrl: null,
        region: "九龍",
        averageRating: "4.7",
        totalReviews: 85,
        isFeatured: true,
        isVerified: true,
      },
    },
  ];

  const displayTeachers = teachers && teachers.length > 0 ? teachers : demoTeachers;

  return (
    <section className="py-24">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-medium mb-4">精選老師推薦</h2>
          <div className="section-divider" />
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            經驗豐富、口碑卓越的專業術數老師
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayTeachers.map((teacher) => (
            <Link key={teacher.profile.id} href={`/teacher/${teacher.profile.id}`}>
              <div className="elegant-card overflow-hidden cursor-pointer group">
                {/* Cover Image */}
                <div className="h-32 purple-gradient relative">
                  {teacher.profile.isVerified && (
                    <span className="absolute top-3 right-3 bg-white/90 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Award className="w-3 h-3" /> 認證
                    </span>
                  )}
                </div>
                
                {/* Avatar */}
                <div className="relative px-6">
                  <div className="w-20 h-20 rounded-full bg-secondary border-4 border-card -mt-10 flex items-center justify-center text-2xl">
                    {teacher.profile.avatarUrl ? (
                      <img src={teacher.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      "👤"
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 pt-3">
                  <h3 className="text-xl font-medium mb-1 group-hover:text-primary transition-colors">
                    {teacher.profile.displayName}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {teacher.profile.title}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 star-filled" />
                      <span className="font-medium">{teacher.profile.averageRating}</span>
                      <span className="text-muted-foreground">({teacher.profile.totalReviews})</span>
                    </span>
                    {teacher.profile.region && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {teacher.profile.region}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/search">
            <Button variant="outline" size="lg" className="gap-2">
              查看所有老師 <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: <Search className="w-8 h-8" />,
      title: "搜尋老師",
      description: "按類別、地區或評分搜尋適合您的術數老師",
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "預約服務",
      description: "選擇服務項目，預約方便的時間進行諮詢",
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "獲得指引",
      description: "與老師進行深度交流，獲得專業的命理指引",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "分享評價",
      description: "完成服務後分享您的體驗，幫助其他用戶",
    },
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-medium mb-4">如何使用</h2>
          <div className="section-divider" />
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary mx-auto mb-6 flex items-center justify-center">
                {step.icon}
              </div>
              <div className="text-sm text-primary font-medium mb-2">步驟 {index + 1}</div>
              <h3 className="text-xl font-medium mb-3">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-24">
      <div className="container">
        <div className="elegant-card p-12 md:p-16 text-center purple-gradient text-white">
          <h2 className="text-3xl md:text-4xl font-medium mb-4">
            成為平台老師
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            如果您是專業的術數老師，歡迎加入我們的平台，
            <br />
            拓展您的業務，接觸更多有緣人
          </p>
          {isAuthenticated ? (
            <Link href="/teacher/register">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                立即申請成為老師
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                登入並申請成為老師
              </Button>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">☯️</span>
              <span className="text-xl font-medium">SoulGuide</span>
            </div>
            <p className="text-sm text-muted-foreground">
              專業身心靈與術數媒合平台
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">探索</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-foreground transition-colors">搜尋老師</Link></li>
              <li><Link href="/search?category=bazi" className="hover:text-foreground transition-colors">八字命理</Link></li>
              <li><Link href="/search?category=tarot" className="hover:text-foreground transition-colors">塔羅占卜</Link></li>
              <li><Link href="/search?category=fengshui" className="hover:text-foreground transition-colors">風水堪輿</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">老師專區</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/teacher/register" className="hover:text-foreground transition-colors">成為老師</Link></li>
              <li><Link href="/teacher/dashboard" className="hover:text-foreground transition-colors">老師後台</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">支援</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">關於我們</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">聯絡我們</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">隱私政策</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">服務條款</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SoulGuide. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// Ad placeholder component
function AdBanner({ position }: { position: "top" | "middle" | "bottom" }) {
  return (
    <div className="container py-4">
      <div className="bg-muted/50 border border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
        <span>廣告位置 - {position === "top" ? "頂部橫幅" : position === "middle" ? "中間橫幅" : "底部橫幅"}</span>
        <br />
        <span className="text-xs">(Google Ads 整合區域)</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">☯️</span>
            <span className="text-xl font-medium">SoulGuide</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
              搜尋老師
            </Link>
            <Link href="/teacher/register" className="text-muted-foreground hover:text-foreground transition-colors">
              成為老師
            </Link>
          </div>
          
          <AuthButton />
        </div>
      </nav>

      <main className="flex-1">
        <HeroSection />
        <AdBanner position="top" />
        <CategoriesSection />
        <FeaturedTeachersSection />
        <AdBanner position="middle" />
        <HowItWorksSection />
        <CTASection />
        <AdBanner position="bottom" />
      </main>

      <Footer />
    </div>
  );
}

function AuthButton() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            我的帳戶
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          登出
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login">
        <Button variant="ghost" size="sm">
          登入
        </Button>
      </Link>
      <Link href="/register">
        <Button className="gold-gradient text-foreground hover:opacity-90" size="sm">
          註冊
        </Button>
      </Link>
    </div>
  );
}
