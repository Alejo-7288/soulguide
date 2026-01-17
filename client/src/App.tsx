import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Search from "./pages/Search";
import TeacherDetail from "./pages/TeacherDetail";
import Booking from "./pages/Booking";
import UserDashboard from "./pages/UserDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherRegister from "./pages/TeacherRegister";
import TeacherSettings from "./pages/TeacherSettings";
import TeacherApprovalStatus from "./pages/TeacherApprovalStatus";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import BookingDetail from "./pages/BookingDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import { GoogleCalendarCallback } from "./pages/GoogleCalendarCallback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/search" component={Search} />
      {/* 具體的 /teacher/* 路由必須放在通用的 /teacher/:id 之前 */}
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/register" component={TeacherRegister} />
      <Route path="/teacher/settings" component={TeacherSettings} />
      <Route path="/teacher/approval-status" component={TeacherApprovalStatus} />
      <Route path="/teacher/:id" component={TeacherDetail} />
      <Route path="/book/:teacherId" component={Booking} />
      <Route path="/book/:teacherId/:serviceId" component={Booking} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/auth/google/callback" component={GoogleCalendarCallback} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      <Route path="/booking/:bookingId" component={BookingDetail} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
