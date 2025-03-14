import { useRef, useState } from "react";
import "../assets/Seller.css";
import { InputRef, Steps } from "antd";
import { Button, List } from "antd";
import algosdk from "algosdk";
import { message, Input } from "antd";
import { Arc18Client } from "./Arc18Client";
import {
  ALGOD_PORT,
  ALGOD_TOKEN,
  ALGOD_URL,
  ARC18_APP_ADDRESS,
  ARC18_APP_ID,
} from "./config";

// Seller component
export const Seller = () => {
  // State variables
  const [current, setCurrent] = useState(0); // Current step in the selling process
  const [account, setAccount] = useState<algosdk.Account | undefined>(
    undefined
  ); // Algorand account of the seller
  const [isCreatingAccount, setIsCreatingAccount] = useState(false); // Flag to indicate if an account is being created
  const [balance, setBalance] = useState<number>(0); // Balance of the seller's account
  const [assetId, setAssetId] = useState<number | undefined>(undefined); // Asset ID of the NFT being sold
  const [isMinting, setIsMinting] = useState(false); // Flag to indicate if an NFT is being minted
  const [offeredAddress, setOfferedAddress] = useState<string | undefined>(
    undefined
  ); // Address the NFT is offered to
  const [isOffering, setIsOffering] = useState(false); // Flag to indicate if an NFT is being offered
  const [messageApi, contextHolder] = message.useMessage(); // Ant Design message API

  // Function to display loading messages
  const openMessage = (key: string, message: string) => {
    messageApi.open({
      key,
      type: "loading",
      content: message,
      duration: 0,
    });
  };

  // Function to close messages and display success/error messages
  const closeMessage = (
    key: string,
    type: "success" | "error",
    message: string
  ) => {
    messageApi.open({
      key,
      type: type,
      content: message,
    });
  };

  // Function to generate a random string
  function generateRandomString(length: number) {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomString = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      randomString += charset[randomIndex];
    }

    return randomString;
  }

  // Algod client
  const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_URL, ALGOD_PORT);

  // Arc18 client
  const appCaller = new Arc18Client(
    {
      resolveBy: "id",
      id: ARC18_APP_ID,
    },
    algodClient
  );
  
  // Function to create an Algorand account
  const createAccount = async () => {
    const key = generateRandomString(8);
    try {
      openMessage(key, "Creating Account..");
      setIsCreatingAccount(true);
      const account = algosdk.generateAccount();
      setAccount(account);
      await transferTestTokens(account.addr);
      await refreshBalanceOfAccount(account);
      closeMessage(key, "success", "Account Created & Funded Successfully");
    } catch (e: any) {
      closeMessage(key, "error", e.message);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Function to transfer test tokens to an account
  const transferTestTokens = async (reciever: string) => {
    const mastet_private = import.meta.env
      .VITE_MASTER_WALLET_MNEMONIC as string;
    const account = algosdk.mnemonicToSecretKey(mastet_private);
    const suggestedParams = await algodClient.getTransactionParams().do();
    const xferTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: reciever,
      suggestedParams,
      amount: 2500000,
    });
    const signedXferTxn = xferTxn.signTxn(account.sk);
    await algodClient.sendRawTransaction(signedXferTxn).do();
    await algosdk.waitForConfirmation(
      algodClient,
      xferTxn.txID().toString(),
      3
    );
  };

  // Function to refresh the balance of the current account
  const refreshBalance = async () => {
    if (account) {
      const accountInfo = await algodClient
        .accountInformation(account.addr)
        .do();
      setBalance(algosdk.microalgosToAlgos(accountInfo.amount));
    }
  };

  // Function to refresh the balance of a given account
  const refreshBalanceOfAccount = async (account: algosdk.Account) => {
    if (account) {
      const accountInfo = await algodClient
        .accountInformation(account.addr)
        .do();
      setBalance(algosdk.microalgosToAlgos(accountInfo.amount));
    }
  };

  // Component to display a list of key-value pairs
  const ShowList = ({
    title,
    listData,
  }: {
    title: string;
    listData: { key: string; value: any }[];
  }) => {
    return (
      <List
        size="small"
        header={<h3 style={{ margin: 0, color: "#1677ff" }}>{title}</h3>}
        bordered
        dataSource={listData}
        renderItem={(item) => (
          <List.Item>
            <b>{item.key}</b> {item.value}
          </List.Item>
        )}
      />
    );
  };

  // Function to mint an NFT
  const mintNFT = async (account: algosdk.Account) => {
    const key = generateRandomString(8);
    setIsMinting(true);
    openMessage(key, "Minting NFT..");
    try {
      var suggestedParams = await algodClient.getTransactionParams().do();
      const nft_txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: account.addr,
        suggestedParams,
        defaultFrozen: true,
        unitName: "RLT",
        assetName: "Royalty NFT",
        manager: undefined,
        reserve: undefined,
        freeze: undefined,
        clawback: ARC18_APP_ADDRESS,
        assetURL: "ipfs://QmbL3okWpqbEtNhSrkzkYNvdMdtAy2auonwPs7fgpAX1CB#arc3",
        total: 1,
        decimals: 0,
      });
      const signed_nft_txn = nft_txn.signTxn(account.sk);
      await algodClient.sendRawTransaction(signed_nft_txn).do();
      const res = await algosdk.waitForConfirmation(
        algodClient,
        nft_txn.txID().toString(),
        3
      );
      await refreshBalance();
      setAssetId(Number(res["asset-index"]));
      closeMessage(key, "success", "NFT Minted Successfully");
    } catch (e: any) {
      closeMessage(key, "error", e.message);
    } finally {
      setIsMinting(false);
    }
  };

  // Ref for input field
  const addressref = useRef<InputRef>(null);

  // Function to place an order
  const placeOrder = async (account: algosdk.Account, assetId: number) => {
    const key = generateRandomString(8);
    if (addressref.current?.input) {
      const address = addressref.current.input.value;
      openMessage(key, "Offering NFT..");
      try {
        setIsOffering(true);
        if (address && algosdk.isValidAddress(address)) {
          await appCaller.optIn.optInToApplication({}, { sender: account });

          await appCaller.offer(
            {
              royalty_asset: assetId,
              royalty_asset_amount: 1,
              auth_address: address,
              offered_amount: 0,
              offered_auth_addr:
                "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
            },
            { sender: account, assets: [assetId] }
          );
          await refreshBalance();
          setOfferedAddress(address);
          closeMessage(key, "success", "NFT Offered Successfully");
        } else {
          closeMessage(key, "error", "Please enter a valid address");
        }
      } catch (e: any) {
        closeMessage(key, "error", e.message);
      } finally {
        setIsOffering(false);
      }
    }
  };
  // JSX rendering
  return (
    <div className="Main">
      {/* Steps component */}
      <Steps
        current={current}
        items={[
          {
            title: "Account",
            description: "Create a New Account & Fund it",
          },
          {
            title: "Mint NFT",
            description: "Mint a new NFT",
          },
          {
            title: "Place Order",
            description: "Give Permission to Buyer",
          },
        ]}
      />

      {/* Account creation step */}
      {current === 0 && (
        <div className="section">
          <div className="center">
            <Button
              onClick={createAccount}
              disabled={isCreatingAccount ? true : false}
            >
              {isCreatingAccount ? "Creating Account.." : "Create Account"}
            </Button>
          </div>
          {account && !isCreatingAccount && (
            <>
              <div>
                <ShowList
                  title="Account Details"
                  listData={[
                    { key: "Address:", value: account.addr },
                    {
                      key: "Mnemonic:",
                      value: algosdk.secretKeyToMnemonic(account.sk),
                    },
                    {
                      key: "Balance:",
                      value: balance,
                    },
                  ]}
                />
              </div>
              <div className="center">
                <Button onClick={() => refreshBalance()}>
                  Refresh Balance
                </Button>
                <Button disabled={!(balance > 0)} onClick={() => setCurrent(1)}>
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mint NFT step */}
      {current === 1 && account && balance > 0 && (
        <div className="section">
          {account && (
            <>
              <div>
                <ShowList
                  title="Account Details"
                  listData={[
                    { key: "Address:", value: account.addr },
                    {
                      key: "Mnemonic:",
                      value: algosdk.secretKeyToMnemonic(account.sk),
                    },
                    {
                      key: "Balance:",
                      value: balance,
                    },
                    {
                      key: "Asset ID:",
                      value: assetId
                        ? assetId
                        : isMinting
                        ? "Minting.."
                        : "Not Minted",
                    },
                  ]}
                />
              </div>
              <div className="center">
                <Button
                  disabled={isMinting ? true : assetId ? true : false}
                  onClick={() => mintNFT(account)}
                >
                  Mint NFT
                </Button>
                <Button
                  disabled={assetId ? false : true}
                  onClick={() => setCurrent(2)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Place order step */}
      {current === 2 && account && balance > 0 && assetId && (
        <div className="section">
          {account && (
            <>
              <div>
                <ShowList
                  title="Details"
                  listData={[
                    { key: "Address:", value: account.addr },
                    {
                      key: "Mnemonic:",
                      value: algosdk.secretKeyToMnemonic(account.sk),
                    },
                    {
                      key: "Balance:",
                      value: balance,
                    },
                    {
                      key: "Asset ID:",
                      value: assetId,
                    },
                    {
                      key: "Offered To:",
                      value: offeredAddress
                        ? offeredAddress
                        : isOffering
                        ? "Offering.."
                        : "Not Offered",
                    },
                  ]}
                />
              </div>
              <div className="center">
                <Input ref={addressref} placeholder="Enter Buyer Address" />
                <Button
                  disabled={isOffering ? true : offeredAddress ? true : false}
                  onClick={() => placeOrder(account, assetId)}
                >
                  Place Order
                </Button>
              </div>
              {offeredAddress && (
                <div className="center">
                  <p>
                    Now Buyer [{offeredAddress}] can buy the NFT [{assetId}]
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* Message context holder */}
      {contextHolder}
    </div>
  );
};
