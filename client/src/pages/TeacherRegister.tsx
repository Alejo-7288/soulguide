import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { 
  ChevronLeft, 
  CheckCircle,
  Award,
  Users,
  TrendingUp,
  Calendar
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function TeacherRegister() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
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
    categoryIds: [] as number[],
  });

  const createProfileMutation = trpc.teacherDashboard.createProfile.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      toast.success("申請成功！");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.displayName) {
      toast.error("請輸入顯示名稱");
      return;
    }

    if (formData.categoryIds.length === 0) {
      toast.error("請至少選擇一個專業類別");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProfileMutation.mutateAsync({
        ...formData,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">載入中...</div>
      </div>
    );
  }

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
            <span className="text-2xl">☯️</span>
            <div className="w-20" />
          </div>
        </nav>

        <div className="container py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-medium mb-4">成為 SoulGuide 老師</h1>
            <p className="text-muted-foreground mb-8">
              加入我們的平台，拓展您的業務，接觸更多有緣人
            </p>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="elegant-card p-6 text-center">
                <Users className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-medium mb-2">接觸更多客戶</h3>
                <p className="text-sm text-muted-foreground">平台每月數千名活躍用戶</p>
              </div>
              <div className="elegant-card p-6 text-center">
                <Calendar className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-medium mb-2">便捷預約管理</h3>
                <p className="text-sm text-muted-foreground">自動化預約系統，省時省力</p>
              </div>
              <div className="elegant-card p-6 text-center">
                <TrendingUp className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-medium mb-2">建立專業形象</h3>
                <p className="text-sm text-muted-foreground">專屬個人頁面，展示您的專業</p>
              </div>
            </div>

            <a href={getLoginUrl()}>
              <Button size="lg" className="gold-gradient text-foreground hover:opacity-90">
                登入並開始申請
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (existingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-medium mb-2">您已經是老師了</h2>
          <p className="text-muted-foreground mb-6">
            您可以前往老師後台管理您的服務和預約
          </p>
          <Link href="/teacher/dashboard">
            <Button className="gold-gradient text-foreground hover:opacity-90">
              前往老師後台
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="elegant-card p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-medium mb-2">申請成功！</h2>
          <p className="text-muted-foreground mb-6">
            您的老師帳戶已建立，現在可以開始設定服務項目了
          </p>
          <Link href="/teacher/dashboard">
            <Button className="gold-gradient text-foreground hover:opacity-90">
              前往老師後台
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const defaultCategories = [
    { id: 1, name: "八字命理" },
    { id: 2, name: "紫微斗數" },
    { id: 3, name: "塔羅占卜" },
    { id: 4, name: "風水堪輿" },
    { id: 5, name: "奇門遁甲" },
    { id: 6, name: "梅花易數" },
    { id: 7, name: "西洋占星" },
    { id: 8, name: "靈性療癒" },
  ];

  const displayCategories = categories && categories.length > 0 ? categories : defaultCategories;

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

      <div className="container py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium mb-2">成為 SoulGuide 老師</h1>
          <p className="text-muted-foreground">填寫以下資料，開始您的老師之旅</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="elegant-card p-6 space-y-4">
            <h2 className="font-medium text-lg border-b pb-2">基本資料</h2>
            
            <div>
              <Label htmlFor="displayName">顯示名稱 *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="例：李明德大師"
              />
            </div>

            <div>
              <Label htmlFor="title">頭銜/專長</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例：紫微斗數專家 · 30年經驗"
              />
            </div>

            <div>
              <Label htmlFor="bio">個人簡介</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="介紹您的背景、專長和服務理念..."
                rows={4}
              />
            </div>
          </div>

          <div className="elegant-card p-6 space-y-4">
            <h2 className="font-medium text-lg border-b pb-2">專業類別 *</h2>
            <p className="text-sm text-muted-foreground">選擇您提供服務的術數類別（可多選）</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {displayCategories.map((category) => (
                <label
                  key={category.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.categoryIds.includes(category.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={formData.categoryIds.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  />
                  <span className="text-sm">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="elegant-card p-6 space-y-4">
            <h2 className="font-medium text-lg border-b pb-2">經驗與資歷</h2>
            
            <div>
              <Label htmlFor="experience">相關經驗</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="描述您的從業經驗..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="qualifications">專業認證</Label>
              <Textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                placeholder="列出您的相關認證或資格..."
                rows={3}
              />
            </div>
          </div>

          <div className="elegant-card p-6 space-y-4">
            <h2 className="font-medium text-lg border-b pb-2">聯絡資訊</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region">服務地區</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="例：香港"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">聯絡電話</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+852 1234 5678"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">詳細地址</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="您的服務地點地址"
              />
            </div>

            <div>
              <Label htmlFor="contactEmail">聯絡電郵</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link href="/">
              <Button type="button" variant="outline">取消</Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="gold-gradient text-foreground hover:opacity-90"
            >
              {isSubmitting ? "提交中..." : "提交申請"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
