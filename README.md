# dna-dao
<h3>DAO Governance Smart Contracts per Start2Impact University</h3>

>
>Il progetto **dna-dao** contiene i contratti che gestiranno la governance di un'azienda di divulgazione scientifica chiamata DnA. I contratti hanno il compito di gestire l'intero ciclo di vita di una serie di proposte sottoposte ai membri della governance e permettere a nuovi membri di acquistare parte delle azioni DnA.<br>
In questo scenario si suppone che l'Owner sia un utente superparte che detiene tutti i DNA Token e che possiede volutamente solo poche funzioni specifiche.<br>
I contratti sono stati creati, testati e deployati per mezzo di hardhat:
>
> - **/contracts** (folder): cartella contenente due versioni del contratto Dao (DNADAO e DNADAO_basic) e un contratto ERC20 che rappresenta il token DNA (DNAERC20). <br>
> - **/ignition** (folder): cartella contenente le istruzioni di deploy per l'ambiente hardhat. <br>
> - **/test** (folder): cartella contenente i test per le due versioni del contratto Dao e per il contratto ERC20. <br>
> - **hardhat.config.ts** (file): file di configurazione di hardhat, compilatore e network sono modificabili da questo file
> - **package.json** (file): dipendenze del progetto <br>
><br>
>
>
>
>Nella cartella **/contract**, come anticipato, troverai 3 contratti: <br>
Il contratto **DNAERC20** (contratto Token) rappresenta il Token DNA di riferimento ed estende tutte le funzionalità dell'interfaccia ERC20. In aggiunta permette la gestione del prezzo del token per mezzo della funzione updateTokenPrice.<br>
>
>Il contratto **DNADAO_basic** (contratto DAO_basic) è il contratto che rappresenta le funzionalità minime di gestione della DAO per l'organizzazione DNA. In particolare il contratto DAO_basic permette l'acquisto di Shares (previa approvazione dei Token su DNAERC20) dopo il quale sarà possibile la creazione, il voto e l'esecuzione di proposte. Ogni proposta contiene un titolo ed una descrizione: facoltativamente è possibile inviare dei DNA ad un membro dell'organizzazione qualora la proposta venga accolta. E' inoltre possibile delegare il voto a più di un membro e revocare le delege inserite. <br>
Ogni voto è in DNA Shares (o Shares), quindi quante più Shares si possiedono quanto più il voto inserito incide sulla sua esecuzione o respingimento.
Quando un delegato vota, lo stesso voto sarà registrato anche per tutti i suoi delegatari, esclusi quei membri che hanno già eseguito l'operazione di voto.<br>
>
>Il contratto **DNADAO** (contratto DAO) rappresenta le funzionalità di gestione della DAO per l'organizzazione DNA in relazione al suo applicativo front-end. La principali differenze con il contratto DAO_basic sono la presenza di funzioni a favore dell'interfaccia grafica, e l'introduzione degli eventi Solidity a supporto della gestione dei tempismi sull'applicativo.
In questa versione, ad ogni proposta viene associato un indirizzo, generato a partire dal titolo e dalla descrizioni scelti: sia i voti che le esecuzioni sono gestiti tramite l'indizzo associato alla proposta.
>
>Le uniche funzioni di scrittura riservate all'Owner sono l'aggiornamento del prezzo dei DNA Token, l'abilitazione e la disattivazione della vendita degli Shares e l'esecuzione delle proposte.
Il metodo di aggiornamento del prezzo dei DNA Token vuole essere una sorta di isolamento della DAO dal Token. In questo caso se l'Owner vuole duplicare il prezzo delle Shares, otterrà lo stesso risultato duplicando il prezzo dei DNA Token.
>
>La cartella **/ignition** contiene i moduli di deploy per i contratti del progetto
>
>La cartella **/test** contiene una serie di test su funzioni ed eventi dei contratti del progetto.


<h3> Compilazione </h3>

>*npx hardhat compile*

<h3> Test </h3>

>*npx hardhat test test\tst_\<nomeContratto>.ts*

<h3> Deploy </h3>

La rete di testnet configurata è Sepolia, è possibile configurare un'altra rete nel file hardhat.config.ts. Per il deploy su Sepolia Testnet eseguire

>npx hardhat ignition deploy ./ignition/modules/\<NomeContratto>.ts --network sepolia --reset

<h4>Attenzione</h4>
<u>Deployare prima il contratto DNAERC20</u>: l'indirizzo del contratto Token dovrà essere utilizzato nel modulo ignition del contratto DAO (o DAO_basic) che si vuole rilasciare.
<br><br>

<h3>Sitemap</h3>

Dapp Repo: https://github.com/OtreborHub/dna-dapp <br>
Deployed DApp: https://dna-dapp.vercel.app <br>
Contratto DNAERC20: https://sepolia.etherscan.io/address/0x56c5b5d0dd6ee0934dde01f7240f16c90af16173 <br>
Contratto DNADAO: https://sepolia.etherscan.io/address/0xfce9b898e6caa81e08f55d4bf950f646d1c656d1