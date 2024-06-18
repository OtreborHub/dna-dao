import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

//Deployare prima il contratto DNAERC20: l'indirizzo del contratto ERC20 andrà incollato qui
const ERC20_ADDRESS = "0x5445702698Ea9C56726155aD854CfF7d541A0C63";
const PRICE_PER_SHARE = 1;


const DAOBasicModule = buildModule("DAOModule", (m) => {
  const address = m.getParameter("_tokenAddress", ERC20_ADDRESS);
  const price = m.getParameter("_pricePerShare", PRICE_PER_SHARE);

  const dnaDAO_basic = m.contract("DNADAO_basic", [address, price]);

  return { dnaDAO_basic };
});

export default DAOBasicModule;
