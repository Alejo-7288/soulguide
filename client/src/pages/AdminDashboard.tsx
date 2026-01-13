import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
<<<<<<< Updated upstream
import { LogOut, Users, BarChart3, Download, Upload, Shield } from 'lucide-react';
import AdminAnalytics from '../components/admin/AdminAnalytics';
import UserManagement from '../components/admin/UserManagement';
import TeacherManagement from '../components/admin/TeacherManagement';
import { AdminVerificationReview } from '../components/AdminVerificationReview';
=======
import { LogOut, Users, BarChart3, Download, Upload, CheckSquare } from 'lucide-react';
import AdminAnalytics from '../components/admin/AdminAnalytics';
import UserManagement from '../components/admin/UserManagement';
import TeacherManagement from '../components/admin/TeacherManagement';
import { TeacherApprovalPanel } from '../components/admin/TeacherApprovalPanel';
>>>>>>> Stashed changes

export default function AdminDashboard() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, { staleTime: 0, gcTime: 0 });
  const logout = trpc.auth.logout.useMutation();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加載中...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">加載中...</div>;
  }

  // Check if user is superadmin or has the special email
  const isSuperAdmin = user.role === 'superadmin' || user.email === 'alejonegrolobo@gmail.com';
  
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">無權限訪問</h1>
          <p className="text-muted-foreground mb-6">您沒有超級管理員權限</p>
          <Link href="/">
            <Button>返回首頁</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">☯️ SoulGuide</div>
            <div className="text-sm text-muted-foreground ml-2">超級管理員後台</div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1"
              >
                返回首頁
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => logout.mutate()}
              className="gap-1"
            >
              <LogOut className="w-4 h-4" />
              登出
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">超級管理員控制台</h1>
          <p className="text-muted-foreground">
            管理網站數據、用戶和老師信息
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              網站分析
            </TabsTrigger>
            <TabsTrigger value="approval" className="gap-2">
              <CheckSquare className="w-4 h-4" />
              師傅審核
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              用戶管理
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="w-4 h-4" />
              老師管理
            </TabsTrigger>
            <TabsTrigger value="verifications" className="gap-2">
              <Shield className="w-4 h-4" />
              認證審核
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalytics />
          </TabsContent>

          {/* Approval Tab */}
          <TabsContent value="approval" className="space-y-6">
            <TeacherApprovalPanel />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-6">
            <TeacherManagement />
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications" className="space-y-6">
            <AdminVerificationReview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
