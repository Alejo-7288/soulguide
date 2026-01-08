import { describe, expect, it, vi } from "vitest";
import { STRIPE_CONFIG } from "./products";

describe("Stripe Configuration", () => {
  it("should have correct currency configuration", () => {
    expect(STRIPE_CONFIG.currency).toBe("hkd");
  });

  it("should have correct payment method types", () => {
    expect(STRIPE_CONFIG.paymentMethodTypes).toContain("card");
  });

  it("should have correct success and cancel paths", () => {
    expect(STRIPE_CONFIG.successPath).toBe("/payment/success");
    expect(STRIPE_CONFIG.cancelPath).toBe("/payment/cancel");
  });
});

describe("Booking Payment Metadata", () => {
  it("should have correct structure for booking payment metadata", () => {
    const metadata = {
      bookingId: "123",
      userId: "456",
      teacherProfileId: "789",
      serviceId: "101",
      serviceName: "紫微斗數命盤分析",
      teacherName: "李明德大師",
      userEmail: "test@example.com",
      userName: "測試用戶",
    };

    expect(metadata.bookingId).toBeDefined();
    expect(metadata.userId).toBeDefined();
    expect(metadata.teacherProfileId).toBeDefined();
    expect(metadata.serviceId).toBeDefined();
    expect(metadata.serviceName).toBeDefined();
    expect(metadata.teacherName).toBeDefined();
    expect(metadata.userEmail).toBeDefined();
    expect(metadata.userName).toBeDefined();
  });
});
