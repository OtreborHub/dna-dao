import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NAME = "DnA Token";
const SYMBOL = "DNA";
const INITIAL_SUPPLY = 1000;
const TOKEN_PRICE = 1;

const ERC20Module = buildModule("ERC20Module", (m) => {
  const name = m.getParameter("name", NAME);
  const symbol = m.getParameter("symbol", SYMBOL);
  const initialSupply = m.getParameter("initialSupply", INITIAL_SUPPLY);
  const tokenPrice = m.getParameter("tokenPrice", TOKEN_PRICE);

  const dnaERC20 = m.contract("DNAERC20", [name, symbol, initialSupply, tokenPrice]);

  return { dnaERC20 };
});

export default ERC20Module;
