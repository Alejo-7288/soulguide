import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Plus, Download, Upload, Edit2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface CreateUserInput {
  email: string;
  name: string;
  role: 'user' | 'teacher' | 'admin' | 'superadmin';
  phone?: string;
}

export default function UserManagement() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<string>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const { data: usersData, isLoading, refetch } = trpc.superadmin.getAllUsers.useQuery({
    page,
    limit: 20,
    role: role as any,
  });

  const { data: exportData } = trpc.superadmin.exportUsers.useQuery();
  const createUser = trpc.superadmin.createUser.useMutation();
  const updateUser = trpc.superadmin.updateUser.useMutation();
  const deleteUser = trpc.superadmin.deleteUser.useMutation();

  const { register, handleSubmit, reset } = useForm<CreateUserInput>();

  const onCreateSubmit = async (data: CreateUserInput) => {
    try {
      await createUser.mutateAsync(data);
      setIsCreateOpen(false);
      reset();
      refetch();
    } catch (error) {
      console.error('創建用戶失敗:', error);
    }
  };

  const handleDelete = async (userId: number) => {
    if (confirm('確定要刪除此用戶嗎？')) {
      try {
        await deleteUser.mutateAsync({ userId });
        refetch();
      } catch (error) {
        console.error('刪除用戶失敗:', error);
      }
    }
  };

  const handleExport = () => {
    if (!exportData) return;

    const csv = [
      ['ID', '姓名', '電郵', '角色', '電話', 'Instagram', '建立時間'],
      ...exportData.map((user: any) => [
        user.id,
        user.name || '',
        user.email || '',
        user.role,
        user.phone || '',
        user.instagram || '',
        new Date(user.createdAt).toLocaleDateString('zh-HK'),
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2">
          <select
            value={role || ''}
            onChange={(e) => {
              setRole(e.target.value || undefined);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="">所有角色</option>
            <option value="user">普通用戶</option>
            <option value="teacher">老師</option>
            <option value="admin">管理員</option>
            <option value="superadmin">超級管理員</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                新增用戶
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新增用戶</DialogTitle>
                <DialogDescription>
                  填寫表單以創建新用戶
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">電郵</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    {...register('email', { required: true })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">姓名</label>
                  <Input
                    placeholder="用戶姓名"
                    {...register('name', { required: true })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">角色</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    {...register('role')}
                  >
                    <option value="user">普通用戶</option>
                    <option value="teacher">老師</option>
                    <option value="admin">管理員</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">電話（可選）</label>
                  <Input
                    placeholder="+852 1234 5678"
                    {...register('phone')}
                  />
                </div>
                <Button type="submit" className="w-full">
                  建立用戶
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            下載
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>用戶列表</CardTitle>
          <CardDescription>
            共 {usersData?.total || 0} 個用戶
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
                    <TableHead>ID</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>電郵</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>電話</TableHead>
                    <TableHead>建立時間</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.users && usersData.users.length > 0 ? (
                    usersData.users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">{user.id}</TableCell>
                        <TableCell>{user.name || '-'}</TableCell>
                        <TableCell className="text-sm">{user.email || '-'}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            {user.role === 'user' ? '普通用戶' : user.role === 'teacher' ? '老師' : user.role === 'admin' ? '管理員' : '超級管理員'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{user.phone || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(user.createdAt).toLocaleDateString('zh-HK')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暫無用戶
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {usersData && usersData.total > 20 && (
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一頁
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} 頁，共 {Math.ceil(usersData.total / 20)} 頁
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= usersData.total}
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
