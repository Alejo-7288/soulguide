import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  Award,
  Users,
  TrendingUp,
  Calendar,
  User,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Globe,
  Clock,
  Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

// 步驟定義
const STEPS = [
  { id: 1, title: "基本資料", description: "填寫您的個人資訊", icon: User },
  { id: 2, title: "專業類別", description: "選擇您的專業領域", icon: Award },
  { id: 3, title: "經驗資歷", description: "展示您的專業背景", icon: Briefcase },
  { id: 4, title: "聯絡資訊", description: "讓客戶能夠聯繫您", icon: Phone },
];

export default function TeacherRegister() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: existingProfile } = trpc.teacherDashboard.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const [formData, setFormData] = useState({
    displayName: "",
    title: "",
    bio: "",
    experience: "",
    qualifications: "",
    region: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    instagram: "",
    website: "",
    categoryIds: [] as number[],
  });

  // 自動填入用戶資料
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        displayName: prev.displayName || user.name || "",
        contactEmail: prev.contactEmail || user.email || "",
        contactPhone: prev.contactPhone || (user as any).phone || "",
        instagram: prev.instagram || (user as any).instagram || "",
      }));
    }
  }, [user]);

  const createProfileMutation = trpc.teacherDashboard.createProfile.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      toast.success("恭喜！您的老師帳戶已成功建立！");
    },
    onError: (error) => {
      toast.error(error.message || "申請失敗，請稍後再試");
    },
  });

  const handleCategoryToggle = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.displayName.trim()) {
          toast.error("請輸入您的顯示名稱");
          return false;
        }
        return true;
      case 2:
        if (formData.categoryIds.length === 0) {
          toast.error("請至少選擇一個專業類別");
          return false;
        }
        return true;
      case 3:
        return true; // 經驗資歷為選填
      case 4:
        return true; // 聯絡資訊為選填
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      await createProfileMutation.mutateAsync({
        displayName: formData.displayName,
        title: formData.title || undefined,
        bio: formData.bio || undefined,
        experience: formData.experience || undefined,
        qualifications: formData.qualifications || undefined,
        region: formData.region || undefined,
        address: formData.address || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        categoryIds: formData.categoryIds,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  // 載入中
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  // 未登入 - 顯示介紹頁面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
          <div className="container flex items-center justify-between h-16">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                返回首頁
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">☯️</span>
              <span className="text-xl font-medium">SoulGuide</span>
            </Link>
            <div className="w-20" />
          </div>
        </nav>

        <div className="container py-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">加入我們的專業老師團隊</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-medium mb-6">
                成為 <span className="text-gradient">SoulGuide</span> 老師
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                在這裡展示您的專業，接觸更多有緣人，拓展您的術數事業
              </p>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <Card className="elegant-card text-center">
                <CardHeader>
                  <Users className="w-12 h-12 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">接觸更多客戶</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    平台每月數千名活躍用戶，讓更多有緣人找到您
                  </p>
                </CardContent>
              </Card>
              <Card className="elegant-card text-center">
                <CardHeader>
                  <Calendar className="w-12 h-12 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">便捷預約管理</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    自動化預約系統，省時省力，專注於您的專業服務
                  </p>
                </CardContent>
              </Card>
              <Card className="elegant-card text-center">
                <CardHeader>
                  <TrendingUp className="w-12 h-12 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">建立專業形象</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    專屬個人頁面，展示您的資歷、服務和客戶評價
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* How it works */}
            <div className="mb-16">
              <h2 className="text-2xl font-medium text-center mb-8">申請流程</h2>
              <div className="grid md:grid-cols-4 gap-4">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="relative">
                    <div className="elegant-card p-6 text-center h-full">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                        <step.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-medium mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <a href={getLoginUrl()}>
                <Button size="lg" className="gold-gradient text-foreground hover:opacity-90 text-lg px-8 py-6">
                  登入並開始申請
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <p className="text-sm text-muted-foreground mt-4">
                已有帳戶？登入後即可開始申請
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 已經是老師
  if (existingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="elegant-card max-w-md w-full text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">您已經是老師了</CardTitle>
            <CardDescription>
              您可以前往老師後台管理您的服務和預約
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/teacher/dashboard">
              <Button className="w-full gold-gradient text-foreground hover:opacity-90">
                前往老師後台
              </Button>
            </Link>
            <Link href="/teacher/settings">
              <Button variant="outline" className="w-full">
                編輯個人資料
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 申請成功
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="elegant-card max-w-lg w-full text-center">
          <CardHeader>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">恭喜！申請成功！</CardTitle>
            <CardDescription className="text-base">
              您的老師帳戶已成功建立，現在可以開始設定服務項目了
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <h4 className="font-medium mb-3">接下來您可以：</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  設定您的服務項目和收費
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  設定可預約的時間
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  完善個人資料和照片
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  開始接受客戶預約
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/teacher/dashboard">
                <Button className="w-full gold-gradient text-foreground hover:opacity-90">
                  前往老師後台
                </Button>
              </Link>
              <Link href="/teacher/settings">
                <Button variant="outline" className="w-full">
                  設定服務項目
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 預設分類
  const defaultCategories = [
    { id: 1, name: "八字命理", slug: "bazi" },
    { id: 2, name: "紫微斗數", slug: "ziwei" },
    { id: 3, name: "塔羅占卜", slug: "tarot" },
    { id: 4, name: "風水堪輿", slug: "fengshui" },
    { id: 5, name: "奇門遁甲", slug: "qimen" },
    { id: 6, name: "梅花易數", slug: "meihua" },
    { id: 7, name: "西洋占星", slug: "astrology" },
    { id: 8, name: "靈性療癒", slug: "healing" },
    { id: 9, name: "易經占卜", slug: "yijing" },
    { id: 10, name: "數字命理", slug: "numerology" },
    { id: 11, name: "手相面相", slug: "palmistry" },
    { id: 12, name: "冥想引導", slug: "meditation" },
  ];

  const displayCategories = categories && categories.length > 0 ? categories : defaultCategories;

  // 多步驟表單
  return (
    <div className="min-h-screen bg-background">
      {/* 導航欄 */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              返回首頁
            </Button>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">☯️</span>
            <span className="text-xl font-medium">SoulGuide</span>
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      <div className="container py-8 max-w-3xl">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium mb-2">成為 SoulGuide 老師</h1>
          <p className="text-muted-foreground">完成以下步驟，開始您的老師之旅</p>
        </div>

        {/* 進度條 */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step) => (
              <div 
                key={step.id}
                className={`flex items-center gap-2 ${
                  step.id === currentStep 
                    ? "text-primary font-medium" 
                    : step.id < currentStep 
                      ? "text-green-600" 
                      : "text-muted-foreground"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step.id === currentStep 
                    ? "bg-primary text-primary-foreground" 
                    : step.id < currentStep 
                      ? "bg-green-100 text-green-600" 
                      : "bg-muted"
                }`}>
                  {step.id < currentStep ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                <span className="hidden md:inline text-sm">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 表單內容 */}
        <Card className="elegant-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const StepIcon = STEPS[currentStep - 1].icon;
                return <StepIcon className="w-5 h-5 text-primary" />;
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: 基本資料 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="displayName" className="text-base">
                    顯示名稱 <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    這是客戶看到的名稱，例如「李明德大師」
                  </p>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="輸入您的顯示名稱"
                    className="text-lg"
                  />
                </div>

                <div>
                  <Label htmlFor="title" className="text-base">頭銜/專長</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    簡短描述您的專業，例如「紫微斗數專家 · 30年經驗」
                  </p>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="輸入您的頭銜或專長"
                  />
                </div>

                <div>
                  <Label htmlFor="bio" className="text-base">個人簡介</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    介紹您的背景、專長和服務理念，讓客戶更了解您
                  </p>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="寫下您的個人簡介..."
                    rows={5}
                  />
                </div>
              </div>
            )}

            {/* Step 2: 專業類別 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="text-muted-foreground mb-4">
                    選擇您提供服務的術數類別（可多選），這將幫助客戶更容易找到您
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {displayCategories.map((category) => (
                      <label
                        key={category.id}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.categoryIds.includes(category.id)
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={formData.categoryIds.includes(category.id)}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                        <span className="font-medium">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {formData.categoryIds.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      已選擇 <span className="font-medium text-foreground">{formData.categoryIds.length}</span> 個類別
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: 經驗資歷 */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="experience" className="text-base">相關經驗</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    描述您的從業經驗，例如從業年數、服務過的客戶類型等
                  </p>
                  <Textarea
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="例如：從事紫微斗數研究與實踐超過30年，曾為超過5000位客戶提供命理諮詢服務..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="qualifications" className="text-base">專業認證</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    列出您的相關認證、資格或著作
                  </p>
                  <Textarea
                    id="qualifications"
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    placeholder="例如：&#10;• 香港命理學會認證命理師&#10;• 著有《紫微斗數入門》等書籍&#10;• 曾任香港命理學會理事"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 4: 聯絡資訊 */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="region" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      服務地區
                    </Label>
                    <Input
                      id="region"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      placeholder="例如：香港"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      聯絡電話
                    </Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="+852 1234 5678"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    詳細地址
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    如果您提供面對面服務，請填寫服務地點地址
                  </p>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="您的服務地點地址"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      聯絡電郵
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="your@email.com"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagram" className="flex items-center gap-2">
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </Label>
                    <Input
                      id="instagram"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      placeholder="@yourusername"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    個人網站
                  </Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 導航按鈕 */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} className="gap-2 gold-gradient text-foreground hover:opacity-90">
              下一步
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="gap-2 gold-gradient text-foreground hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  提交中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  完成申請
                </>
              )}
            </Button>
          )}
        </div>

        {/* 步驟提示 */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          步驟 {currentStep} / {STEPS.length}
        </p>
      </div>
    </div>
  );
}
