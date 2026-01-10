import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Download, Trash2, Star, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function TeacherManagement() {
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  const { data: teachersData, isLoading, refetch } = trpc.superadmin.getAllTeachers.useQuery({
    page,
    limit: 20,
  });

  const { data: exportData } = trpc.superadmin.exportTeachers.useQuery();
  const deleteUser = trpc.superadmin.deleteUser.useMutation();
  const createTeacher = trpc.superadmin.createTeacher.useMutation();

  const handleDelete = async (userId: number) => {
    if (confirm('確定要刪除此老師嗎？')) {
      try {
        await deleteUser.mutateAsync({ userId });
        refetch();
      } catch (error) {
        console.error('刪除老師失敗:', error);
      }
    }
  };

  const handleAddTeacher = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('請填寫老師名稱和電郵');
      return;
    }

    try {
      await createTeacher.mutateAsync({
        name: formData.name,
        email: formData.email,
      });
      alert('新增老師成功');
      setFormData({ name: '', email: '' });
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('新增老師失敗:', error);
      alert(`新增老師失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  const handleExport = () => {
    if (!exportData) return;

    const csv = [
      ['用戶ID', '用戶名稱', '用戶電郵', '老師名稱', '頭銜', '地區', '預約數', '評價數', '平均評分', '已認證', '建立時間'],
      ...exportData.map((teacher: any) => [
        teacher.userId,
        teacher.userName || '',
        teacher.userEmail || '',
        teacher.displayName || '',
        teacher.title || '',
        teacher.region || '',
        teacher.totalBookings,
        teacher.totalReviews,
        teacher.averageRating || '0',
        teacher.isVerified ? '是' : '否',
        new Date(teacher.createdAt).toLocaleDateString('zh-HK'),
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `teachers_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              新增老師
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增老師</DialogTitle>
              <DialogDescription>
                填寫老師的基本信息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">老師名稱</Label>
                <Input
                  id="name"
                  placeholder="輸入老師名稱"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">電郵地址</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="輸入電郵地址"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <Button onClick={handleAddTeacher} disabled={createTeacher.isPending}>
                {createTeacher.isPending ? '新增中...' : '新增'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          下載
        </Button>
      </div>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>老師列表</CardTitle>
          <CardDescription>
            共 {teachersData?.total || 0} 位老師
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">加載中...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用戶ID</TableHead>
                    <TableHead>老師名稱</TableHead>
                    <TableHead>頭銜</TableHead>
                    <TableHead>地區</TableHead>
                    <TableHead>預約數</TableHead>
                    <TableHead>評價</TableHead>
                    <TableHead>認證</TableHead>
                    <TableHead>建立時間</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachersData?.teachers && teachersData.teachers.length > 0 ? (
                    teachersData.teachers.map((item: any) => (
                      <TableRow key={item.profile.id}>
                        <TableCell className="font-mono text-sm">{item.user.id}</TableCell>
                        <TableCell className="font-medium">{item.profile.displayName}</TableCell>
                        <TableCell className="text-sm">{item.profile.title || '-'}</TableCell>
                        <TableCell className="text-sm">{item.profile.region || '-'}</TableCell>
                        <TableCell className="text-center">{item.profile.totalBookings}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">
                              {item.profile.averageRating || '0'} ({item.profile.totalReviews})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.profile.isVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.profile.isVerified ? '已認證' : '未認證'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(item.profile.createdAt).toLocaleDateString('zh-HK')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        暫無老師
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {teachersData && teachersData.total > 20 && (
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一頁
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} 頁，共 {Math.ceil(teachersData.total / 20)} 頁
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= teachersData.total}
              >
                下一頁
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
