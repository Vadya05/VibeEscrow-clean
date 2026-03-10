import {
  Address,
  Blockchain,
  BytesWriter,
  Calldata,
  OP_NET,
  encodeSelector,
  Selector,
  StoredU256,
  StoredString,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

const ESCROW_COUNT_POINTER: u16 = 1;
const ESCROW_BASE_POINTER: u16 = 2;

const STATUS_PENDING: u8 = 0;
const STATUS_RELEASED: u8 = 1;
const STATUS_REFUNDED: u8 = 2;

const SEVEN_DAYS: u64 = 604800;

@final
export class Escrow extends OP_NET {
  public constructor() {
    super();
  }

  public override onDeployment(_calldata: Calldata): void {
    const counter = new StoredU256(ESCROW_COUNT_POINTER, u256.Zero);
    counter.set(u256.Zero);
  }

  public override execute(method: Selector, calldata: Calldata): BytesWriter {
    switch (method) {
      case encodeSelector('deposit'):
        return this.deposit(calldata);
      case encodeSelector('approve'):
        return this.approve(calldata);
      case encodeSelector('refund'):
        return this.refund(calldata);
      case encodeSelector('get_escrow'):
        return this.getEscrow(calldata);
      case encodeSelector('get_escrow_count'):
        return this.getEscrowCount();
      case encodeSelector('get_time_left'):
        return this.getTimeLeft(calldata);
      default:
        throw new Error('Unknown method');
    }
  }

  private deposit(calldata: Calldata): BytesWriter {
    const seller = calldata.readAddress();
    const token  = calldata.readAddress();
    const amount = calldata.readU256();
    const buyer  = Blockchain.tx.sender;

    const counterStorage = new StoredU256(ESCROW_COUNT_POINTER, u256.Zero);
    const id = counterStorage.get();
    counterStorage.set(id + u256.One);

    const deadline = u256.fromU64(Blockchain.block.timestamp + SEVEN_DAYS);

    this.storeStr(id, 0, buyer.toString());
    this.storeStr(id, 1, seller.toString());
    this.storeStr(id, 2, token.toString());
    this.storeU256(id, 3, amount);
    this.storeU256(id, 4, deadline);
    this.storeU256(id, 5, u256.Zero);
    this.storeU256(id, 6, u256.Zero);
    this.storeU256(id, 7, u256.Zero);

    const writer = new BytesWriter(32);
    writer.writeU256(id);
    return writer;
  }

  private approve(calldata: Calldata): BytesWriter {
    const id     = calldata.readU256();
    const caller = Blockchain.tx.sender;

    const status = this.loadU256(id, 5);
    if (status != u256.Zero) throw new Error('Not pending');

    const buyer  = this.loadStr(id, 0);
    const seller = this.loadStr(id, 1);

    if (caller.toString() == buyer) {
      this.storeU256(id, 6, u256.One);
    } else if (caller.toString() == seller) {
      this.storeU256(id, 7, u256.One);
    } else {
      throw new Error('Not a party');
    }

    const ba = this.loadU256(id, 6);
    const sa = this.loadU256(id, 7);
    if (ba == u256.One && sa == u256.One) {
      this.storeU256(id, 5, u256.fromU8(STATUS_RELEASED));
    }

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  private refund(calldata: Calldata): BytesWriter {
    const id     = calldata.readU256();
    const caller = Blockchain.tx.sender;

    const status   = this.loadU256(id, 5);
    if (status != u256.Zero) throw new Error('Not pending');

    const buyer    = this.loadStr(id, 0);
    const deadline = this.loadU256(id, 4);
    const now      = u256.fromU64(Blockchain.block.timestamp);

    if (caller.toString() != buyer) throw new Error('Only buyer');
    if (now < deadline) throw new Error('Too early');

    this.storeU256(id, 5, u256.fromU8(STATUS_REFUNDED));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  private getEscrow(calldata: Calldata): BytesWriter {
    const id = calldata.readU256();

    const writer = new BytesWriter(256);
    writer.writeStringWithLength(this.loadStr(id, 0));
    writer.writeStringWithLength(this.loadStr(id, 1));
    writer.writeStringWithLength(this.loadStr(id, 2));
    writer.writeU256(this.loadU256(id, 3));
    writer.writeU256(this.loadU256(id, 4));
    writer.writeU8(u8(this.loadU256(id, 5).toU64()));
    writer.writeBoolean(this.loadU256(id, 6) == u256.One);
    writer.writeBoolean(this.loadU256(id, 7) == u256.One);
    return writer;
  }

  private getEscrowCount(): BytesWriter {
    const counter = new StoredU256(ESCROW_COUNT_POINTER, u256.Zero);
    const writer = new BytesWriter(32);
    writer.writeU256(counter.get());
    return writer;
  }

  private getTimeLeft(calldata: Calldata): BytesWriter {
    const id       = calldata.readU256();
    const deadline = this.loadU256(id, 4);
    const now      = u256.fromU64(Blockchain.block.timestamp);
    const left     = deadline > now ? deadline - now : u256.Zero;
    const writer   = new BytesWriter(32);
    writer.writeU256(left);
    return writer;
  }

  private ptr(id: u256, field: u8): u256 {
    return (id << u256.fromU8(8)) | u256.fromU8(field);
  }

  private storeU256(id: u256, field: u8, value: u256): void {
    new StoredU256(ESCROW_BASE_POINTER, this.ptr(id, field)).set(value);
  }

  private loadU256(id: u256, field: u8): u256 {
    return new StoredU256(ESCROW_BASE_POINTER, this.ptr(id, field)).get();
  }

  private storeStr(id: u256, field: u8, value: string): void {
    new StoredString(ESCROW_BASE_POINTER, this.ptr(id, field + 100 as u8)).set(value);
  }

  private loadStr(id: u256, field: u8): string {
    return new StoredString(ESCROW_BASE_POINTER, this.ptr(id, field + 100 as u8)).get();
  }
}
