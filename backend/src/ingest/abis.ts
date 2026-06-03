import { parseAbiItem } from "viem";

export const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);
export const SYNC_EVENT = parseAbiItem(
  "event Sync(uint112 reserve0, uint112 reserve1)"
);
export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const SYNC_TOPIC =
  "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1";
