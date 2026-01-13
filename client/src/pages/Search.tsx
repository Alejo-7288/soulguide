import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { Search as SearchIcon, Star, MapPin, Filter, ChevronDown, Award, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

function AdSidebar() {
  return (
    <div className="space-y-4">
      <div className="elegant-card p-4 text-center text-sm text-muted-foreground">
        <div className="bg-muted/50 border border-dashed border-border rounded-lg p-8">
          <span>側邊廣告位</span>
          <br />
          <span className="text-xs">(Google Ads)</span>
        </div>
      </div>
      <div className="elegant-card p-4 text-center text-sm text-muted-foreground">
        <div className="bg-muted/50 border border-dashed border-border rounded-lg p-8">
          <span>側邊廣告位 2</span>
          <br />
          <span className="text-xs">(Google Ads)</span>
        </div>
      </div>
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: any }) {
  const profile = teacher.profile;
  
  return (
    <Link href={`/teacher/${profile.id}`}>
      <div className="elegant-card overflow-hidden cursor-pointer group flex">
        {/* Avatar */}
        <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 bg-secondary flex items-center justify-center text-4xl">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            "👤"
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                {profile.displayName}
                {profile.isVerified && (
                  <span className="text-primary">
                    <Award className="w-4 h-4" />
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">{profile.title}</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 star-filled" />
              <span className="font-medium">{profile.averageRating || "0.0"}</span>
              <span className="text-muted-foreground">({profile.totalReviews || 0})</span>
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {profile.bio}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {profile.region && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.region}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {profile.totalBookings || 0} 次預約
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Search() {
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  
  const [query, setQuery] = useState(params.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(params.get("category") || "all");
  const [selectedRegion, setSelectedRegion] = useState(params.get("region") || "all");
  const [sortBy, setSortBy] = useState<"rating" | "bookings" | "newest">(
    (params.get("sort") as any) || "rating"
  );

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: regions } = trpc.teachers.regions.useQuery();

  // Parse categoryId safely to avoid NaN
  const parsedCategoryId = selectedCategory !== "all" ? parseInt(selectedCategory) : undefined;
  const validCategoryId = !isNaN(parsedCategoryId || NaN) ? parsedCategoryId : undefined;

  const { data: searchResults, isLoading } = trpc.teachers.search.useQuery({
    categoryId: validCategoryId,
    region: selectedRegion !== "all" ? selectedRegion : undefined,
    query: query || undefined,
    sortBy,
    limit: 20,
  });

  // Demo data
  const demoTeachers = [
    {
      profile: {
        id: 1,
        displayName: "李明德大師",
        title: "紫微斗數專家 · 30年經驗",
        bio: "專精紫微斗數命盤分析，為您解讀人生運勢，提供事業、婚姻、健康等全方位指引。",
        avatarUrl: null,
        region: "香港",
        averageRating: "4.9",
        totalReviews: 128,
        totalBookings: 256,
        isVerified: true,
      },
    },
    {
      profile: {
        id: 2,
        displayName: "陳雅琳老師",
        title: "塔羅占卜師 · 心靈導師",
        bio: "結合塔羅牌與直覺力，協助您釐清困惑、洞察未來趨勢，找到內心的答案。",
        avatarUrl: null,
        region: "台北",
        averageRating: "4.8",
        totalReviews: 96,
        totalBookings: 180,
        isVerified: true,
      },
    },
    {
      profile: {
        id: 3,
        displayName: "王志強師傅",
        title: "風水堪輿 · 八字命理",
        bio: "傳承三代風水世家，精通陽宅風水布局與八字命理，助您趨吉避凶。",
        avatarUrl: null,
        region: "九龍",
        averageRating: "4.7",
        totalReviews: 85,
        totalBookings: 150,
        isVerified: true,
      },
    },
    {
      profile: {
        id: 4,
        displayName: "張心怡老師",
        title: "奇門遁甲 · 擇日專家",
        bio: "精研奇門遁甲二十餘年，專業提供擇日、預測、布局等服務。",
        avatarUrl: null,
        region: "新界",
        averageRating: "4.6",
        totalReviews: 62,
        totalBookings: 120,
        isVerified: false,
      },
    },
  ];

  const displayTeachers = searchResults?.teachers && searchResults.teachers.length > 0 
    ? searchResults.teachers 
    : demoTeachers;

  const defaultCategories = [
    { id: 1, name: "八字命理", slug: "bazi" },
    { id: 2, name: "紫微斗數", slug: "ziwei" },
    { id: 3, name: "塔羅占卜", slug: "tarot" },
    { id: 4, name: "風水堪輿", slug: "fengshui" },
    { id: 5, name: "奇門遁甲", slug: "qimen" },
  ];

  const displayCategories = categories && categories.length > 0 ? categories : defaultCategories;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">☯️</span>
            <span className="text-xl font-medium">SoulGuide</span>
          </Link>
          
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜尋老師..."
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          
          <Link href="/dashboard">
            <Button variant="ghost">我的帳戶</Button>
          </Link>
        </div>
      </nav>

      <div className="container py-8">
        {/* Filters */}
        <div className="elegant-card p-4 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">篩選：</span>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="所有類別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有類別</SelectItem>
                {displayCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="所有地區" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有地區</SelectItem>
                {(regions || ["香港", "九龍", "新界", "台北", "台中", "高雄"]).map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">評分最高</SelectItem>
                <SelectItem value="bookings">最多預約</SelectItem>
                <SelectItem value="newest">最新加入</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-medium">
                {query ? `「${query}」的搜尋結果` : "所有老師"}
              </h1>
              <span className="text-muted-foreground">
                共 {searchResults?.total || displayTeachers.length} 位老師
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="elegant-card h-40 animate-pulse bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displayTeachers.map((teacher) => (
                  <TeacherCard key={teacher.profile.id} teacher={teacher} />
                ))}
              </div>
            )}

            {displayTeachers.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">找不到符合條件的老師</p>
                <Button variant="outline" className="mt-4" onClick={() => {
                  setQuery("");
                  setSelectedCategory("all");
                  setSelectedRegion("all");
                }}>
                  清除篩選條件
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar Ads */}
          <div className="hidden lg:block w-72">
            <AdSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
