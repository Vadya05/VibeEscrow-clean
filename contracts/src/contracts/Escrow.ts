import {
  Address,
  Blockchain,
  BytesWriter,
  Calldata,
  OP_NET,
  encodeSelector,
  Selector,
  StoredU256,
  StoredBoolean,
  StoredString,
} from '@btc-vision/btc-runtime/runtime';
import { u128, u256 } from '@btc-vision/as-bignum/assembly';

// Storage pointers
const ESCROW_COUNT_POINTER: u16 = 1;
const ESCROW_BASE_POINTER: u16 = 2;

// Escrow status
const STATUS_PENDING: u8 = 0;
const STATUS_RELEASED: u8 = 1;
const STATUS_REFUNDED: u8 = 2;

// 7 days in seconds
const SEVEN_DAYS: u64 = 7 * 24 * 60 * 60;

// Field offsets within each escrow record (sub-pointers)
const FIELD_BUYER: u8 = 0;
const FIELD_SELLER: u8 = 1;
const FIELD_TOKEN: u8 = 2;
const FIELD_AMOUNT: u8 = 3;
const FIELD_DEADLINE: u8 = 4;
const FIELD_STATUS: u8 = 5;
const FIELD_BUYER_APPROVED: u8 = 6;
const FIELD_SELLER_APPROVED: u8 = 7;

@final
export class Escrow extends OP_NET {
  public constructor() {
    super();
  }

  public override onDeployment(_calldata: Calldata): void {
    // Initialize escrow counter to 0
    const counter = new StoredU256(ESCROW_COUNT_POINTER, u256.Zero);
    counter.set(u256.Zero);
  }

  public override execute(method: Selector, calldata: Calldata): BytesWriter {
    switch (method) {
      case encodeSelector('deposit()'):
        return this.deposit(calldata);
      case encodeSelector('approve()'):
        return this.approve(calldata);
      case encodeSelector('refund()'):
        return this.refund(calldata);
      case encodeSelector('get_escrow()'):
        return this.getEscrow(calldata);
      case encodeSelector('get_escrow_count()'):
        return this.getEscrowCount();
      case encodeSelector('get_time_left()'):
        return this.getTimeLeft(calldata);
      default:
        throw new Error('Unknown method');
    }
  }

  // ─── deposit(seller, token, amount) ───────────────────────────────────────
  private deposit(calldata: Calldata): BytesWriter {
    const seller = calldata.readAddress();
    const token  = calldata.readAddress();
    const amount = calldata.readU256();
    const buyer  = Blockchain.tx.sender;

    // Get and increment escrow ID
    const counterStorage = new StoredU256(ESCROW_COUNT_POINTER, u256.Zero);
    const id = counterStorage.get();
    const newId = id + u256.One;
    counterStorage.set(newId);

    // Deadline = now + 7 days
    const deadline = u256.fromU64(Blockchain.block.timestamp + SEVEN_DAYS);

    // Store escrow fields
    this.storeAddress(id, FIELD_BUYER,  buyer.toString());
    this.storeAddress(id, FIELD_SELLER, seller.toString());
    this.storeAddress(id, FIELD_TOKEN,  token.toString());
    this.storeU256(id, FIELD_AMOUNT,   amount);
    this.storeU256(id, FIELD_DEADLINE, deadline);
    this.storeU8(id,   FIELD_STATUS,   STATUS_PENDING);
    this.storeBool(id, FIELD_BUYER_APPROVED,  false);
    this.storeBool(id, FIELD_SELLER_APPROVED, false);

    // Return new escrow ID
    const writer = new BytesWriter(32);
    writer.writeU256(id);
    return writer;
  }

  // ─── approve(id) ──────────────────────────────────────────────────────────
  private approve(calldata: Calldata): BytesWriter {
    const id     = calldata.readU256();
    const caller = Blockchain.tx.sender;

    const status = this.loadU8(id, FIELD_STATUS);
    if (status !== STATUS_PENDING) throw new Error('Escrow not pending');

    const buyer  = this.loadAddress(id, FIELD_BUYER);
    const seller = this.loadAddress(id, FIELD_SELLER);

    if (caller.toString() === buyer) {
      this.storeBool(id, FIELD_BUYER_APPROVED, true);
    } else if (caller.toString() === seller) {
      this.storeBool(id, FIELD_SELLER_APPROVED, true);
    } else {
      throw new Error('Not a party to this escrow');
    }

    // Release if both approved
    const buyerApproved  = this.loadBool(id, FIELD_BUYER_APPROVED);
    const sellerApproved = this.loadBool(id, FIELD_SELLER_APPROVED);

    if (buyerApproved && sellerApproved) {
      this.storeU8(id, FIELD_STATUS, STATUS_RELEASED);
    }

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  // ─── refund(id) ───────────────────────────────────────────────────────────
  private refund(calldata: Calldata): BytesWriter {
    const id     = calldata.readU256();
    const caller = Blockchain.tx.sender;

    const status   = this.loadU8(id, FIELD_STATUS);
    if (status !== STATUS_PENDING) throw new Error('Escrow not pending');

    const buyer    = this.loadAddress(id, FIELD_BUYER);
    const deadline = this.loadU256(id, FIELD_DEADLINE);
    const now      = u256.fromU64(Blockchain.block.timestamp);

    // Only buyer can refund, and only after deadline
    if (caller.toString() !== buyer) throw new Error('Only buyer can refund');
    if (now < deadline) throw new Error('Deadline not reached yet');

    this.storeU8(id, FIELD_STATUS, STATUS_REFUNDED);

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  // ─── get_escrow(id) ───────────────────────────────────────────────────────
  private getEscrow(calldata: Calldata): BytesWriter {
    const id = calldata.readU256();

    const buyer          = this.loadAddress(id, FIELD_BUYER);
    const seller         = this.loadAddress(id, FIELD_SELLER);
    const token          = this.loadAddress(id, FIELD_TOKEN);
    const amount         = this.loadU256(id, FIELD_AMOUNT);
    const deadline       = this.loadU256(id, FIELD_DEADLINE);
    const status         = this.loadU8(id, FIELD_STATUS);
    const buyerApproved  = this.loadBool(id, FIELD_BUYER_APPROVED);
    const sellerApproved = this.loadBool(id, FIELD_SELLER_APPROVED);

    const writer = new BytesWriter(256);
    writer.writeStringWithLength(buyer);
    writer.writeStringWithLength(seller);
    writer.writeStringWithLength(token);
    writer.writeU256(amount);
    writer.writeU256(deadline);
    writer.writeU8(status);
    writer.writeBoolean(buyerApproved);
    writer.writeBoolean(sellerApproved);
    return writer;
  }

  // ─── get_escrow_count() ───────────────────────────────────────────────────
  private getEscrowCount(): BytesWriter {
    const counterStorage = new StoredU256(ESCROW_COUNT_POINTER, u256.Zero);
    const count = counterStorage.get();

    const writer = new BytesWriter(32);
    writer.writeU256(count);
    return writer;
  }

  // ─── get_time_left(id) ────────────────────────────────────────────────────
  private getTimeLeft(calldata: Calldata): BytesWriter {
    const id       = calldata.readU256();
    const deadline = this.loadU256(id, FIELD_DEADLINE);
    const now      = u256.fromU64(Blockchain.block.timestamp);

    let timeLeft: u256 = u256.Zero;
    if (deadline > now) {
      timeLeft = deadline - now;
    }

    const writer = new BytesWriter(32);
    writer.writeU256(timeLeft);
    return writer;
  }

  // ─── Storage helpers ──────────────────────────────────────────────────────

  private escrowSubPointer(id: u256, field: u8): u256 {
    // Combine id and field into a unique sub-pointer
    return (id << u256.fromU8(8)) | u256.fromU8(field);
  }

  private storeU256(id: u256, field: u8, value: u256): void {
    const ptr = new StoredU256(ESCROW_BASE_POINTER, this.escrowSubPointer(id, field));
    ptr.set(value);
  }

  private loadU256(id: u256, field: u8): u256 {
    const ptr = new StoredU256(ESCROW_BASE_POINTER, this.escrowSubPointer(id, field));
    return ptr.get();
  }

  private storeU8(id: u256, field: u8, value: u8): void {
    this.storeU256(id, field, u256.fromU8(value));
  }

  private loadU8(id: u256, field: u8): u8 {
    return u8(this.loadU256(id, field).toU64());
  }

  private storeBool(id: u256, field: u8, value: boolean): void {
    this.storeU256(id, field, value ? u256.One : u256.Zero);
  }

  private loadBool(id: u256, field: u8): boolean {
    return this.loadU256(id, field) !== u256.Zero;
  }

  private storeAddress(id: u256, field: u8, addr: string): void {
    // Store address as u256 via hash of string — simplified for OP_NET
    const encoded = u256.fromBytes(Blockchain.sha256(Uint8Array.wrap(String.UTF8.encode(addr))));
    this.storeU256(id, field, encoded);
    // Also store raw string in a string slot
    const strPtr = new StoredString(ESCROW_BASE_POINTER, this.escrowSubPointer(id, field + 100 as u8));
    strPtr.set(addr);
  }

  private loadAddress(id: u256, field: u8): string {
    const strPtr = new StoredString(ESCROW_BASE_POINTER, this.escrowSubPointer(id, field + 100 as u8));
    return strPtr.get();
  }
}
