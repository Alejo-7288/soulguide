import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, CheckCircle2, XCircle, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Google Calendar 連接組件
 * 讓師傅授權連接 Google Calendar，系統自動同步忙碌時段
 */
export function GoogleCalendarConnect() {
  const [isSyncing, setIsSyncing] = useState(false);

  const utils = trpc.useUtils();
  
  // 獲取連接狀態
  const { data: status, isLoading } = trpc.teachers.getGoogleCalendarStatus.useQuery();
  
  // 獲取授權 URL
  const { mutate: getAuthUrl, isPending: isGettingUrl } = 
    trpc.teachers.getGoogleCalendarAuthUrl.useMutation({
      onSuccess: (data) => {
        // 跳轉到 Google OAuth 授權頁面
        window.location.href = data.authUrl;
      },
      onError: (error) => {
        toast({
          title: '錯誤',
          description: error.message || '無法獲取授權連結',
          variant: 'destructive',
        });
      },
    });

  // 斷開連接
  const { mutate: disconnect, isPending: isDisconnecting } = 
    trpc.teachers.disconnectGoogleCalendar.useMutation({
      onSuccess: () => {
        utils.teachers.getGoogleCalendarStatus.invalidate();
        toast({
          title: '成功',
          description: 'Google Calendar 已斷開連接',
        });
      },
      onError: (error) => {
        toast({
          title: '錯誤',
          description: error.message || '斷開連接失敗',
          variant: 'destructive',
        });
      },
    });

  // 手動同步
  const { mutate: syncNow, isPending: isSyncingMutation } = 
    trpc.teachers.syncGoogleCalendarBusySlots.useMutation({
      onSuccess: (data) => {
        utils.teachers.getGoogleCalendarStatus.invalidate();
        toast({
          title: '同步成功',
          description: `已同步 ${data.syncedCount} 個忙碌時段`,
        });
        setIsSyncing(false);
      },
      onError: (error) => {
        toast({
          title: '同步失敗',
          description: error.message || '無法同步日曆',
          variant: 'destructive',
        });
        setIsSyncing(false);
      },
    });

  const handleConnect = () => {
    getAuthUrl();
  };

  const handleDisconnect = () => {
    if (confirm('確定要斷開 Google Calendar 連接嗎？這將刪除所有同步的忙碌時段。')) {
      disconnect();
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    syncNow();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Google Calendar 整合</CardTitle>
        </div>
        <CardDescription>
          連接您的 Google Calendar，自動同步忙碌時段，避免預約撞期
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 連接狀態 */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">已連接</p>
                  {status.calendarId && (
                    <p className="text-sm text-muted-foreground">
                      日曆 ID: {status.calendarId}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">未連接</p>
                  <p className="text-sm text-muted-foreground">
                    尚未連接 Google Calendar
                  </p>
                </div>
              </>
            )}
          </div>
          
          {status?.connected ? (
            <Badge variant="default">已啟用</Badge>
          ) : (
            <Badge variant="secondary">未啟用</Badge>
          )}
        </div>

        {/* 說明信息 */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>為什麼需要連接？</strong>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>自動同步您的 Google Calendar 忙碌時段</li>
              <li>預約系統會自動避開已佔用的時間</li>
              <li>防止預約撞期，提升服務品質</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong>隱私政策：</strong>我們只讀取忙碌時間，不會讀取事件詳情或其他個人資料。
            </p>
          </AlertDescription>
        </Alert>

        {/* 最後同步時間 */}
        {status?.connected && status.lastSyncedAt && (
          <div className="text-sm text-muted-foreground">
            最後同步：{new Date(status.lastSyncedAt).toLocaleString('zh-TW')}
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-2">
          {status?.connected ? (
            <>
              <Button
                onClick={handleSync}
                disabled={isSyncing || isSyncingMutation}
                variant="default"
                className="flex-1"
              >
                {isSyncing || isSyncingMutation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    立即同步
                  </>
                )}
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                variant="outline"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '斷開連接'
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isGettingUrl}
              className="w-full"
            >
              {isGettingUrl ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  連接中...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  連接 Google Calendar
                </>
              )}
            </Button>
          )}
        </div>

        {/* 使用提示 */}
        {status?.connected && (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              系統每天凌晨會自動同步您的日曆。您也可以隨時點擊「立即同步」按鈕手動更新。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
