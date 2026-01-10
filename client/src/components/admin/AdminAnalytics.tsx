import { useEffect, useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, BookOpen, Star, TrendingUp } from 'lucide-react';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function AdminAnalytics() {
  const { data: analytics, isLoading } = trpc.superadmin.getAnalytics.useQuery();

  if (isLoading) {
    return <div className="text-center py-8">加載中...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">無法加載分析數據</div>;
  }

  // Prepare data for charts
  const usersByRoleData = (analytics.usersByRole || []).map((item: any) => ({
    name: item.role === 'user' ? '普通用戶' : item.role === 'teacher' ? '老師' : item.role === 'admin' ? '管理員' : '超級管理員',
    value: item.count,
  }));

  const bookingsByStatusData = (analytics.bookingsByStatus || []).map((item: any) => ({
    name: item.status === 'pending' ? '待確認' : item.status === 'confirmed' ? '已確認' : item.status === 'completed' ? '已完成' : '已取消',
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              總用戶數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">所有註冊用戶</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              總老師數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalTeachers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">認證老師</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              總預約數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalBookings || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">所有預約</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4" />
              總評價數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalReviews || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">用戶評價</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle>用戶分佈</CardTitle>
            <CardDescription>按角色分類的用戶數量</CardDescription>
          </CardHeader>
          <CardContent>
            {usersByRoleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={usersByRoleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usersByRoleData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">暫無數據</div>
            )}
          </CardContent>
        </Card>

        {/* Bookings by Status */}
        <Card>
          <CardHeader>
            <CardTitle>預約狀態分佈</CardTitle>
            <CardDescription>過去30天的預約狀態</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsByStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookingsByStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">暫無數據</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
