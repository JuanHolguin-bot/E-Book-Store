import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { captureMatchesOrder, getCompletedCapture, getPayPalApprovalUrl } from "../lib/paypal";

describe("PayPal capture verification", () => {
  it("only selects a completed capture", () => {
    const capture = getCompletedCapture({
      id: "order-1",
      status: "COMPLETED",
      links: [],
      purchase_units: [{
        payments: {
          captures: [
            { id: "pending", status: "PENDING", amount: { value: "12.99", currency_code: "USD" } },
            { id: "paid", status: "COMPLETED", amount: { value: "12.99", currency_code: "USD" } },
          ],
        },
      }],
    });

    assert.equal(capture?.id, "paid");
  });

  it("rejects a capture with a different amount or currency", () => {
    const capture = {
      id: "paid",
      status: "COMPLETED",
      amount: { value: "12.99", currency_code: "USD" },
    };

    assert.equal(captureMatchesOrder(capture, 1299, "USD"), true);
    assert.equal(captureMatchesOrder(capture, 1300, "USD"), false);
    assert.equal(captureMatchesOrder(capture, 1299, "EUR"), false);
  });

  it("only returns PayPal's expected approval host", () => {
    const previousEnvironment = process.env.PAYPAL_ENV;
    process.env.PAYPAL_ENV = "sandbox";
    try {
      assert.equal(
        getPayPalApprovalUrl({ id: "order-1", status: "CREATED", links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/checkoutnow?token=order-1" }] }),
        "https://www.sandbox.paypal.com/checkoutnow?token=order-1",
      );
      assert.equal(
        getPayPalApprovalUrl({ id: "order-1", status: "CREATED", links: [{ rel: "approve", href: "https://attacker.example/checkout" }] }),
        undefined,
      );
    } finally {
      if (previousEnvironment === undefined) delete process.env.PAYPAL_ENV;
      else process.env.PAYPAL_ENV = previousEnvironment;
    }
  });
});
