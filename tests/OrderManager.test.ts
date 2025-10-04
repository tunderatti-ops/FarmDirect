import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_ORDER_ID = 101;
const ERR_INVALID_PRODUCT_ID = 102;
const ERR_INVALID_QUANTITY = 103;
const ERR_INVALID_PRICE = 104;
const ERR_INVALID_STATUS = 105;
const ERR_ORDER_ALREADY_EXISTS = 106;
const ERR_ORDER_NOT_FOUND = 107;
const ERR_INSUFFICIENT_INVENTORY = 109;
const ERR_INVALID_BUYER = 110;
const ERR_INVALID_SELLER = 111;
const ERR_INVALID_LOCATION = 122;
const ERR_INVALID_CURRENCY = 123;
const ERR_INVALID_PAYMENT_AMOUNT = 116;
const ERR_ORDER_NOT_PENDING = 117;
const ERR_ORDER_NOT_SHIPPED = 118;
const ERR_MAX_ORDERS_EXCEEDED = 121;

interface Order {
  productId: number;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  buyer: string;
  seller: string;
  status: string;
  orderTimestamp: number;
  shipTimestamp: number | null;
  deliveryTimestamp: number | null;
  deliveryLocation: string;
  currency: string;
}

interface OrderUpdate {
  updateStatus: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class OrderManagerMock {
  state: {
    nextOrderId: number;
    maxOrders: number;
    escrowContract: string;
    supplyChainContract: string;
    productCatalogContract: string;
    platformFee: number;
    orders: Map<number, Order>;
    orderUpdates: Map<number, OrderUpdate>;
  } = {
    nextOrderId: 0,
    maxOrders: 10000,
    escrowContract: "SP000000000000000000002Q6VF78",
    supplyChainContract: "SP000000000000000000002Q6VF78",
    productCatalogContract: "SP000000000000000000002Q6VF78",
    platformFee: 100,
    orders: new Map(),
    orderUpdates: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1BUYER";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextOrderId: 0,
      maxOrders: 10000,
      escrowContract: "SP000000000000000000002Q6VF78",
      supplyChainContract: "SP000000000000000000002Q6VF78",
      productCatalogContract: "SP000000000000000000002Q6VF78",
      platformFee: 100,
      orders: new Map(),
      orderUpdates: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1BUYER";
    this.stxTransfers = [];
  }

  setPlatformFee(newFee: number): Result<boolean> {
    if (this.caller !== "ST1BUYER") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.platformFee = newFee;
    return { ok: true, value: true };
  }

  placeOrder(
    productId: number,
    quantity: number,
    pricePerUnit: number,
    seller: string,
    deliveryLocation: string,
    currency: string
  ): Result<number> {
    if (this.state.nextOrderId >= this.state.maxOrders) return { ok: false, value: ERR_MAX_ORDERS_EXCEEDED };
    if (productId <= 0) return { ok: false, value: ERR_INVALID_PRODUCT_ID };
    if (quantity <= 0) return { ok: false, value: ERR_INVALID_QUANTITY };
    if (pricePerUnit <= 0) return { ok: false, value: ERR_INVALID_PRICE };
    if (seller === this.caller) return { ok: false, value: ERR_INVALID_SELLER };
    if (!deliveryLocation || deliveryLocation.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };

    const totalAmount = quantity * pricePerUnit;
    const feeAmount = Math.floor((totalAmount * this.state.platformFee) / 10000);
    const netAmount = totalAmount - feeAmount;

    this.stxTransfers.push({ amount: feeAmount, from: this.caller, to: "contract" });

    const id = this.state.nextOrderId;
    const order: Order = {
      productId,
      quantity,
      pricePerUnit,
      totalAmount,
      buyer: this.caller,
      seller,
      status: "pending",
      orderTimestamp: this.blockHeight,
      shipTimestamp: null,
      deliveryTimestamp: null,
      deliveryLocation,
      currency,
    };
    this.state.orders.set(id, order);
    this.state.nextOrderId++;
    return { ok: true, value: id };
  }

  shipOrder(orderId: number): Result<boolean> {
    const order = this.state.orders.get(orderId);
    if (!order) return { ok: false, value: ERR_ORDER_NOT_FOUND };
    if (order.seller !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (order.status !== "pending") return { ok: false, value: ERR_ORDER_NOT_PENDING };
    const updated: Order = { ...order, status: "shipped", shipTimestamp: this.blockHeight };
    this.state.orders.set(orderId, updated);
    this.state.orderUpdates.set(orderId, { updateStatus: "shipped", updateTimestamp: this.blockHeight, updater: this.caller });
    return { ok: true, value: true };
  }

  confirmDelivery(orderId: number): Result<boolean> {
    const order = this.state.orders.get(orderId);
    if (!order) return { ok: false, value: ERR_ORDER_NOT_FOUND };
    if (order.buyer !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (order.status !== "shipped") return { ok: false, value: ERR_ORDER_NOT_SHIPPED };
    const updated: Order = { ...order, status: "delivered", deliveryTimestamp: this.blockHeight };
    this.state.orders.set(orderId, updated);
    this.state.orderUpdates.set(orderId, { updateStatus: "delivered", updateTimestamp: this.blockHeight, updater: this.caller });
    return { ok: true, value: true };
  }

  cancelOrder(orderId: number): Result<boolean> {
    const order = this.state.orders.get(orderId);
    if (!order) return { ok: false, value: ERR_ORDER_NOT_FOUND };
    if (order.buyer !== this.caller && order.seller !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (order.status !== "pending") return { ok: false, value: ERR_ORDER_NOT_PENDING };
    const updated: Order = { ...order, status: "cancelled" };
    this.state.orders.set(orderId, updated);
    this.state.orderUpdates.set(orderId, { updateStatus: "cancelled", updateTimestamp: this.blockHeight, updater: this.caller });
    return { ok: true, value: true };
  }

  getOrder(orderId: number): Order | null {
    return this.state.orders.get(orderId) || null;
  }

  getOrderStatus(orderId: number): Result<string> {
    const order = this.state.orders.get(orderId);
    if (!order) return { ok: false, value: "" };
    return { ok: true, value: order.status };
  }

  getOrderCount(): Result<number> {
    return { ok: true, value: this.state.nextOrderId };
  }
}

describe("OrderManager", () => {
  let contract: OrderManagerMock;

  beforeEach(() => {
    contract = new OrderManagerMock();
    contract.reset();
  });

  it("places an order successfully", () => {
    const result = contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const order = contract.getOrder(0);
    expect(order?.productId).toBe(1);
    expect(order?.quantity).toBe(5);
    expect(order?.pricePerUnit).toBe(100);
    expect(order?.totalAmount).toBe(500);
    expect(order?.buyer).toBe("ST1BUYER");
    expect(order?.seller).toBe("ST2SELLER");
    expect(order?.status).toBe("pending");
    expect(order?.deliveryLocation).toBe("Farm Location");
    expect(order?.currency).toBe("STX");
    expect(contract.stxTransfers).toEqual([{ amount: 5, from: "ST1BUYER", to: "contract" }]);
  });

  it("rejects invalid product id", () => {
    const result = contract.placeOrder(0, 5, 100, "ST2SELLER", "Farm Location", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PRODUCT_ID);
  });

  it("rejects invalid quantity", () => {
    const result = contract.placeOrder(1, 0, 100, "ST2SELLER", "Farm Location", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_QUANTITY);
  });

  it("rejects invalid price", () => {
    const result = contract.placeOrder(1, 5, 0, "ST2SELLER", "Farm Location", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PRICE);
  });

  it("rejects same buyer and seller", () => {
    const result = contract.placeOrder(1, 5, 100, "ST1BUYER", "Farm Location", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SELLER);
  });

  it("rejects invalid location", () => {
    const result = contract.placeOrder(1, 5, 100, "ST2SELLER", "", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_LOCATION);
  });

  it("rejects invalid currency", () => {
    const result = contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "INVALID");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CURRENCY);
  });

  it("ships an order successfully", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    contract.caller = "ST2SELLER";
    const result = contract.shipOrder(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const order = contract.getOrder(0);
    expect(order?.status).toBe("shipped");
    const update = contract.state.orderUpdates.get(0);
    expect(update?.updateStatus).toBe("shipped");
    expect(update?.updater).toBe("ST2SELLER");
  });

  it("rejects ship by non-seller", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    const result = contract.shipOrder(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects ship non-pending order", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    contract.caller = "ST2SELLER";
    contract.shipOrder(0);
    const result = contract.shipOrder(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ORDER_NOT_PENDING);
  });

  it("confirms delivery successfully", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    contract.caller = "ST2SELLER";
    contract.shipOrder(0);
    contract.caller = "ST1BUYER";
    const result = contract.confirmDelivery(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const order = contract.getOrder(0);
    expect(order?.status).toBe("delivered");
    const update = contract.state.orderUpdates.get(0);
    expect(update?.updateStatus).toBe("delivered");
    expect(update?.updater).toBe("ST1BUYER");
  });

  it("rejects confirm by non-buyer", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    contract.caller = "ST2SELLER";
    contract.shipOrder(0);
    const result = contract.confirmDelivery(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects confirm non-shipped order", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    const result = contract.confirmDelivery(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ORDER_NOT_SHIPPED);
  });

  it("cancels order successfully by buyer", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    const result = contract.cancelOrder(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const order = contract.getOrder(0);
    expect(order?.status).toBe("cancelled");
    const update = contract.state.orderUpdates.get(0);
    expect(update?.updateStatus).toBe("cancelled");
    expect(update?.updater).toBe("ST1BUYER");
  });

  it("cancels order successfully by seller", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    contract.caller = "ST2SELLER";
    const result = contract.cancelOrder(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const order = contract.getOrder(0);
    expect(order?.status).toBe("cancelled");
    const update = contract.state.orderUpdates.get(0);
    expect(update?.updateStatus).toBe("cancelled");
    expect(update?.updater).toBe("ST2SELLER");
  });

  it("rejects cancel by unauthorized", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    contract.caller = "ST3FAKE";
    const result = contract.cancelOrder(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects cancel non-pending order", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    contract.caller = "ST2SELLER";
    contract.shipOrder(0);
    contract.caller = "ST1BUYER";
    const result = contract.cancelOrder(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ORDER_NOT_PENDING);
  });

  it("gets order status correctly", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    const result = contract.getOrderStatus(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe("pending");
  });

  it("rejects get status for non-existent order", () => {
    const result = contract.getOrderStatus(99);
    expect(result.ok).toBe(false);
  });

  it("gets order count correctly", () => {
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    contract.placeOrder(2, 10, 200, "ST3SELLER", "Another Location", "USD");
    const result = contract.getOrderCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("sets platform fee successfully", () => {
    const result = contract.setPlatformFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.platformFee).toBe(200);
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    expect(contract.stxTransfers).toEqual([{ amount: 10, from: "ST1BUYER", to: "contract" }]);
  });

  it("rejects set fee by unauthorized", () => {
    contract.caller = "ST3FAKE";
    const result = contract.setPlatformFee(200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects order when max orders exceeded", () => {
    contract.state.maxOrders = 1;
    contract.placeOrder(1, 5, 100, "ST2SELLER", "Farm Location", "STX");
    const result = contract.placeOrder(2, 10, 200, "ST3SELLER", "Another Location", "USD");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_ORDERS_EXCEEDED);
  });
});