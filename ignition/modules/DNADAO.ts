import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ERC20_ADDRESS = "0x0BdA1854eC82Bbe5CB1fC1D73fC0FbD48D8AAfcb";
const PRICE_PER_SHARE = 1;


const DAOModule = buildModule("DAOModule", (m) => {
  const address = m.getParameter("_tokenAddress", ERC20_ADDRESS);
  const price = m.getParameter("_pricePerShare", PRICE_PER_SHARE);

  const dnaDAO = m.contract("DNADAO", [address, price]);

  return { dnaDAO };
});

export default DAOModule;
