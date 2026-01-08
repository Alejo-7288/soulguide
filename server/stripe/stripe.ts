import Stripe from "stripe";
import { ENV } from "../_core/env";
import { STRIPE_CONFIG, BookingPaymentMetadata } from "./products";

// Initialize Stripe
const stripe = new Stripe(ENV.stripeSecretKey || "", {
  apiVersion: "2025-12-15.clover",
});

export { stripe };

export interface CreateCheckoutSessionParams {
  bookingId: number;
  userId: number;
  userEmail: string;
  userName: string;
  teacherProfileId: number;
  teacherName: string;
  serviceId: number;
  serviceName: string;
  amount: number; // in smallest currency unit (cents for HKD)
  currency?: string;
  origin: string;
}

export async function createBookingCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  const {
    bookingId,
    userId,
    userEmail,
    userName,
    teacherProfileId,
    teacherName,
    serviceId,
    serviceName,
    amount,
    currency = STRIPE_CONFIG.currency,
    origin,
  } = params;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: [...STRIPE_CONFIG.paymentMethodTypes],
    mode: "payment",
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: serviceName,
            description: `預約服務 - ${teacherName}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId.toString(),
      user_id: userId.toString(),
      teacher_profile_id: teacherProfileId.toString(),
      service_id: serviceId.toString(),
      service_name: serviceName,
      teacher_name: teacherName,
      customer_email: userEmail,
      customer_name: userName,
    },
    success_url: `${origin}${STRIPE_CONFIG.successPath}?booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${STRIPE_CONFIG.cancelPath}?booking_id=${bookingId}`,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId);
}

export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}
