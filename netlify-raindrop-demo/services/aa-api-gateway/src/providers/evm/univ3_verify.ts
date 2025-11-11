import { evmRpcCall } from "./rpc";

// Simplified Uniswap V3 verification
export async function rpcVerify(args: { chain: string; poolAddress: string; expectedPrice: number }) {
  const { chain, poolAddress, expectedPrice } = args;

  try {
    // Call slot0 to get sqrtPriceX96
    const data = "0x3850c7bd"; // slot0() function selector
    const result = await evmRpcCall(chain, "eth_call", [
      {
        to: poolAddress,
        data
      },
      "latest"
    ]);

    // Parse result (simplified - in production, use proper ABI decoding)
    const sqrtPriceX96 = BigInt(result.slice(0, 66));

    // Convert sqrtPriceX96 to price
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;

    // Calculate deviation from expected price
    const deviation = Math.abs(price - expectedPrice) / expectedPrice;
    const deviationBps = deviation * 10000;

    return {
      verified: true,
      onChainPrice: price,
      expectedPrice,
      deviationBps,
      pegOk: deviationBps < 80 // halt_on_peg_deviation_bps from policy
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
