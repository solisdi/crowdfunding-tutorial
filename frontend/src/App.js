import './App.css';
import idl from "./idl.json";
import { Connection, PublicKey, clusterApuUrl, clusterApiUrl } from "@solana/web3.js";
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  BN,
} from "@project-serum/anchor";
import { useEffect, useState } from "react";
import { Buffer } from 'buffer';

// INFO NEEDED to connect to IDL
window.Buffer = Buffer;
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};
const { SystemProgram } = web3;

const App = () => {
  // CONNECT WALLET -START-
  const [walletAddress, setWalletAddress] = useState(null);
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          const response = await solana.connect({
            onlyIfTrusted: true
          });
          console.log("Connected with public key:", response.publicKey.toString());
          setWalletAddress(response.publicKey.toString());
        }
      }
      else {
        alert("Solana object not found! Get a phantom wallet.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect()
      console.log("Connected with public key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected()
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad);
  }, []);
  // CONNECT WALLET -END-

  // CREATE CAMPAIGN -START-
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment);
    return provider;
  }

  const createCampaign = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      const [campaign] = await PublicKey.findProgramAddress([
        utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
        provider.wallet.publicKey.toBuffer(),
      ],
        program.programId
      );

      // this calls the CREATE function that was created in lib.rs
      await program.rpc.create('campaign name', 'campaign description', {
        accounts: {
          campaign,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      console.log(
        "Created a new campaign w/ address:",
        campaign.toString()
      );
    } catch (error) {
      console.error('Error creating campaign account:', error);
    };
  };

  // CREATE CAMPAIGN -END-

  // GET CAMPAIGN -START-
  const [campaigns, setCampaigns] = useState([]);

  const getCampaigns = async () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = getProvider()
    const program = new Program(idl, programID, provider)

    Promise.all((await connection.getProgramAccounts(programID)).map(
      async (campaign) => ({
        ...(await program.account.campaign.fetch(campaign.pubkey)),
        pubkey: campaign.pubkey,
      })
    )
    ).then(campaigns => setCampaigns(campaigns));
  };
  // GET CAMPAIGN -END-

  // DONATE -START-
  const donate = async (publicKey) => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      
      // need to convert the 0.2 to SOL which is why we use web3.LAMPORTS_PER_SOL
      await program.rpc.donate(new BN(0.2 * web3.LAMPORTS_PER_SOL), {
        accounts: {
          campaign: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        }
      });
      console.log('Donation Successful to:', publicKey.toString());
      getCampaigns();
    } catch (error){
      console.error('Error donating campaign account:', error);
    }
  }
  // DONATE -END-

  return (
    <div className="App">
      {!walletAddress &&
        <button onClick={connectWallet}>Connect to Wallet</button>
      }
      {walletAddress &&
        <>
          <button onClick={createCampaign}>Create a campaign</button>
          <button onClick={getCampaigns}>Get list of campaigns</button>
          <br />
          {
            campaigns.map(campaign => (<>
              <p>Campaign ID: {campaign.pubkey.toString()}</p>
              <p>
                Balance: { " " }
                {(
                  campaign.amountDonated / web3.LAMPORTS_PER_SOL
                ).toString()}
              </p>
              <p>{campaign.name}</p>
              <p>{campaign.description}</p>
              <button onClick={() => donate(campaign.pubkey)}>Click to donate!</button>
              <br />
            </>))
          }
        </>

      }
    </div>

  );
};

export default App;
