// Stub module for optional transitive peer dependencies (@x402/*, @coinbase/cdp-sdk) in Turbopack
export class x402Client {
  register() {
    return this;
  }
  async createPaymentPayload() {
    return {};
  }
}

export class UptoEvmScheme {}
export class ExactSvmScheme {}

export function registerExactEvmScheme() {}
export function registerExactSvmScheme() {}
export function toClientEvmSigner<T>(account: T): T {
  return account;
}

export default {};
