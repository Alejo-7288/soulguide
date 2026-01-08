import { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { stripe } from "./stripe";
import { ENV } from "../_core/env";
import * as db from "../db";

export function registerStripeWebhook(app: Express) {
  // IMPORTANT: This must be registered BEFORE express.json() middleware
  // The raw body is needed for signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"];

      if (!sig) {
        console.error("[Stripe Webhook] No signature found");
        return res.status(400).send("No signature");
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          ENV.stripeWebhookSecret
        );
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            await handleCheckoutSessionCompleted(session);
            break;
          }

          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log(`[Stripe Webhook] Payment succeeded: ${paymentIntent.id}`);
            break;
          }

          case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log(`[Stripe Webhook] Payment failed: ${paymentIntent.id}`);
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (error) {
        console.error("[Stripe Webhook] Error processing event:", error);
        res.status(500).json({ error: "Webhook handler failed" });
      }
    }
  );
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  const userId = session.metadata?.user_id;
  const paymentIntentId = session.payment_intent as string;

  if (!bookingId || !userId) {
    console.error("[Stripe Webhook] Missing metadata in checkout session");
    return;
  }

  console.log(`[Stripe Webhook] Checkout completed for booking ${bookingId}`);

  try {
    // Update booking with payment info
    await db.updateBookingPayment(parseInt(bookingId), "paid", paymentIntentId);

    // Update booking status to confirmed
    await db.updateBookingStatus(parseInt(bookingId), "confirmed");

    // Get booking details for notification
    const booking = await db.getBookingById(parseInt(bookingId));
    if (booking) {
      // Notify teacher about new paid booking
      const teacherProfile = await db.getTeacherProfileById(booking.teacherProfileId);
      if (teacherProfile) {
        await db.createNotification({
          userId: teacherProfile.userId,
          type: "booking_new",
          title: "新預約（已付款）",
          message: `您有一個新的已付款預約，請查看並確認`,
          relatedBookingId: parseInt(bookingId),
        });
      }

      // Notify user about successful payment
      await db.createNotification({
        userId: parseInt(userId),
        type: "booking_confirmed",
        title: "付款成功",
        message: `您的預約已成功付款，請等待老師確認`,
        relatedBookingId: parseInt(bookingId),
      });
    }

    console.log(`[Stripe Webhook] Booking ${bookingId} updated successfully`);
  } catch (error) {
    console.error(`[Stripe Webhook] Error updating booking ${bookingId}:`, error);
    throw error;
  }
}
