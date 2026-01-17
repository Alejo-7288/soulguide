import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Google OAuth 回調處理頁面
 * 處理 Google 授權後的重定向
 */
export function GoogleCalendarCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // 從 URL 獲取授權碼
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  const { mutate: connectCalendar } = trpc.teachers.connectGoogleCalendar.useMutation({
    onSuccess: () => {
      setStatus('success');
      // 3 秒後跳轉到師傅儀表板
      setTimeout(() => {
        setLocation('/teacher/dashboard');
      }, 3000);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage(error.message || '連接失敗');
    },
  });

  useEffect(() => {
    if (error) {
      setStatus('error');
      setErrorMessage('授權被拒絕或取消');
      return;
    }

    if (code) {
      // 發送授權碼到後端
      connectCalendar({ code });
    } else {
      setStatus('error');
      setErrorMessage('無效的授權回調');
    }
  }, [code, error, connectCalendar]);

  const handleRetry = () => {
    setLocation('/teacher/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Google Calendar 連接</CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && '正在處理授權...'}
            {status === 'success' && '連接成功！'}
            {status === 'error' && '連接失敗'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                正在連接您的 Google Calendar...
              </p>
            </div>
          )}

          {status === 'success' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <p className="font-medium">連接成功！</p>
                <p className="mt-1 text-sm">
                  您的 Google Calendar 已成功連接，系統已開始同步忙碌時段。
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  正在跳轉到儀表板...
                </p>
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">連接失敗</p>
                  <p className="mt-1 text-sm">{errorMessage}</p>
                </AlertDescription>
              </Alert>
              <Button onClick={handleRetry} className="w-full">
                返回儀表板
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
