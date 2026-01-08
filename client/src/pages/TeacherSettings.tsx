import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { 
  ChevronLeft, 
  Save,
  User,
  Clock,
  MapPin,
  Plus,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export default function TeacherSettings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: profileData, isLoading: profileLoading } = trpc.teacherDashboard.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: availabilityData } = trpc.teacherDashboard.getAvailability.useQuery(
    undefined,
    { enabled: isAuthenticated && !!profileData }
  );
  const utils = trpc.useUtils();

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
    website: "",
    categoryIds: [] as number[],
  });

  const [availability, setAvailability] = useState<Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>>([]);

  useEffect(() => {
    if (profileData) {
      setFormData({
        displayName: profileData.profile.displayName || "",
        title: profileData.profile.title || "",
        bio: profileData.profile.bio || "",
        experience: profileData.profile.experience || "",
        qualifications: profileData.profile.qualifications || "",
        region: profileData.profile.region || "",
        address: profileData.profile.address || "",
        contactEmail: profileData.profile.contactEmail || "",
        contactPhone: profileData.profile.contactPhone || "",
        website: profileData.profile.website || "",
        categoryIds: profileData.categories.map(c => c.id),
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (availabilityData) {
      setAvailability(availabilityData.map((a: { dayOfWeek: number; startTime: string; endTime: string }) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })));
    }
  }, [availabilityData]);

  const updateProfileMutation = trpc.teacherDashboard.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("資料已更新");
      utils.teacherDashboard.getProfile.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const updateAvailabilityMutation = trpc.teacherDashboard.setAvailability.useMutation({
    onSuccess: () => {
      toast.success("服務時間已更新");
      utils.teacherDashboard.getProfile.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "更新失敗");
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

  const handleSaveProfile = () => {
    if (!formData.displayName) {
      toast.error("請輸入顯示名稱");
      return;
    }
    updateProfileMutation.mutate(formData);
  };

  const handleAddAvailability = () => {
    setAvailability(prev => [
      ...prev,
      { dayOfWeek: 1, startTime: "10:00", endTime: "18:00" },
    ]);
  };

  const handleRemoveAvailability = (index: number) => {
    setAvailability(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAvailability = () => {
    updateAvailabilityMutation.mutate(availability);
  };

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
          <Link href="/teacher/register">
            <Button className="gold-gradient text-foreground hover:opacity-90">
              申請成為老師
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
  ];

  const displayCategories = categories && categories.length > 0 ? categories : defaultCategories;

  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/teacher/dashboard">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              返回後台
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
        <h1 className="text-2xl font-medium mb-6">編輯老師資料</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              基本資料
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-2">
              <Clock className="w-4 h-4" />
              服務時間
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="elegant-card p-6 space-y-4">
              <h2 className="font-medium text-lg border-b pb-2">基本資料</h2>
              
              <div>
                <Label htmlFor="displayName">顯示名稱 *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="title">頭銜/專長</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="bio">個人簡介</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="experience">相關經驗</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="qualifications">專業認證</Label>
                <Textarea
                  id="qualifications"
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="elegant-card p-6 space-y-4">
              <h2 className="font-medium text-lg border-b pb-2">專業類別</h2>
              
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
              <h2 className="font-medium text-lg border-b pb-2">聯絡資訊</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">服務地區</Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">聯絡電話</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">詳細地址</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactEmail">聯絡電郵</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="website">網站</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="gap-2 gold-gradient text-foreground hover:opacity-90"
              >
                <Save className="w-4 h-4" />
                {updateProfileMutation.isPending ? "儲存中..." : "儲存變更"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <div className="elegant-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-lg">服務時間設定</h2>
                <Button variant="outline" size="sm" onClick={handleAddAvailability} className="gap-1">
                  <Plus className="w-4 h-4" />
                  新增時段
                </Button>
              </div>

              {availability.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>尚未設定服務時間</p>
                  <p className="text-sm">點擊「新增時段」開始設定</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availability.map((slot, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Select 
                        value={slot.dayOfWeek.toString()} 
                        onValueChange={(v) => {
                          const newAvailability = [...availability];
                          newAvailability[index].dayOfWeek = parseInt(v);
                          setAvailability(newAvailability);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dayNames.map((name, i) => (
                            <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={slot.startTime} 
                        onValueChange={(v) => {
                          const newAvailability = [...availability];
                          newAvailability[index].startTime = v;
                          setAvailability(newAvailability);
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-muted-foreground">至</span>

                      <Select 
                        value={slot.endTime} 
                        onValueChange={(v) => {
                          const newAvailability = [...availability];
                          newAvailability[index].endTime = v;
                          setAvailability(newAvailability);
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive ml-auto"
                        onClick={() => handleRemoveAvailability(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveAvailability}
                disabled={updateAvailabilityMutation.isPending}
                className="gap-2 gold-gradient text-foreground hover:opacity-90"
              >
                <Save className="w-4 h-4" />
                {updateAvailabilityMutation.isPending ? "儲存中..." : "儲存服務時間"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
