// Stripe Product Configuration
// Products and prices are created dynamically based on teacher services

export interface BookingPaymentMetadata {
  bookingId: string;
  userId: string;
  teacherProfileId: string;
  serviceId: string;
  serviceName: string;
  teacherName: string;
  userEmail: string;
  userName: string;
}

export const STRIPE_CONFIG = {
  // Payment settings
  currency: "hkd",
  
  // Checkout session settings
  paymentMethodTypes: ["card"] as const,
  
  // Success and cancel URLs will be set dynamically
  successPath: "/payment/success",
  cancelPath: "/payment/cancel",
};
