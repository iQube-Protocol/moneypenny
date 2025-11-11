// RPC helpers for EVM chains
export async function evmRpcCall(chain: string, method: string, params: any[]) {
  const rpcUrls: Record<string, string> = {
    ethereum: process.env.RPC_ETHEREUM_URL || "",
    arbitrum: process.env.RPC_ARBITRUM_URL || "",
    optimism: process.env.RPC_OPTIMISM_URL || "",
    base: process.env.RPC_BASE_URL || "",
    polygon: process.env.RPC_POLYGON_URL || ""
  };

  const url = rpcUrls[chain];
  if (!url) throw new Error(`No RPC URL configured for chain: ${chain}`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  const json = await response.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

export async function getGasPrice(chain: string): Promise<bigint> {
  const hex = await evmRpcCall(chain, "eth_gasPrice", []);
  return BigInt(hex);
}

export async function estimateGas(chain: string, tx: any): Promise<bigint> {
  const hex = await evmRpcCall(chain, "eth_estimateGas", [tx]);
  return BigInt(hex);
}
