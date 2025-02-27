import { useRef, useState } from "react";
import "../assets/Seller.css";
import { InputRef, Steps } from "antd";
import { Button, List } from "antd";
import algosdk from "algosdk";
import { message, Input } from "antd";
import * as algokit from "@algorandfoundation/algokit-utils";
import { Arc18Client } from "./Arc18Client";
import {
  ALGOD_PORT,
  ALGOD_TOKEN,
  ALGOD_URL,
  ARC18_APP_ADDRESS,
  ARC18_APP_ID,
  MASTER_WALLET_MNEMONIC,
} from "./config";

// Buyer component
export const Buyer = () => {
  // State variables
  const [current, setCurrent] = useState(0); // Current step in the buying process
  const [account, setAccount] = useState<algosdk.Account | undefined>(
    undefined
  ); // Algorand account of the buyer
  const [isCreatingAccount, setIsCreatingAccount] = useState(false); // Flag to indicate if an account is being created

  const [balance, setBalance] = useState<number>(0); // Balance of the buyer's account

  const [messageApi, contextHolder] = message.useMessage(); // Ant Design message API

  // Function to display error messages
  const error = (msg: string) => {
    messageApi.open({
      type: "error",
      content: msg,
    });
  };

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
    openMessage(key, "Creating Account..");
    try {
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

  // State variables for offer details
  const [assetId, setAssetId] = useState<number | undefined>(undefined); // Asset ID of the NFT being offered
  const [offeredTo, setofferedTo] = useState<string | undefined>(undefined); // Address the offer is made to
  const [offeredFrom, setofferedFrom] = useState<string | undefined>(undefined); // Address the offer is made from
  const [offeredAmount, setOfferedAmount] = useState<number | undefined>(
    undefined
  ); // Amount of the NFT being offered
  const [royaltyRecipient, setRoyaltyRecipient] = useState<string | undefined>(
    undefined
  ); // Address of the royalty recipient
  const [royaltyPercent, setRoyaltyPercent] = useState<number | undefined>(
    undefined
  ); // Royalty percentage
  const [isFetchingOffer, setIsFetchingOffer] = useState<boolean>(false); // Flag to indicate if the offer is being fetched

  // Refs for input fields
  const addressref = useRef<InputRef>(null);
  const assetref = useRef<InputRef>(null);

  // Function to fetch the offer details
  const fetchOffer = async () => {
    if (account) {
      const key = generateRandomString(8);
      openMessage(key, "Fetching Offer..");
      try {
        setIsFetchingOffer(true);
        const global = await appCaller.appClient.getGlobalState();
        setRoyaltyPercent(Number(global.royalty_basis.value) / 100);
        if ("valueRaw" in global.royalty_receiver) {
          setRoyaltyRecipient(
            algosdk.encodeAddress(global.royalty_receiver.valueRaw)
          );
        }
        console.log(global);
        if (assetref.current?.input && addressref.current?.input) {
          const assetId = parseInt(assetref.current.input.value);
          const address = addressref.current.input.value;
          if (!algosdk.isValidAddress(address)) {
            throw new Error("Invalid Address");
          }
          const local = await appCaller.appClient.getLocalState(address);
          var localState: {
            [key: number]: { address: string; amount: number };
          } = {};
          Object.keys(local).forEach((key) => {
            const value = local[key];
            if ("keyRaw" in value && "valueRaw" in value) {
              const keyRaw = value["keyRaw"];
              const valueRaw = value["valueRaw"];
              const keyasset = Number(algosdk.bytesToBigInt(keyRaw));
              const valueasset = {
                address: algosdk.encodeAddress(valueRaw.subarray(0, 32)),
                amount: Number(
                  algosdk.bytesToBigInt(valueRaw.subarray(32, 40))
                ),
              };
              localState[keyasset] = valueasset;
            }
          });
          if (assetId in localState) {
            setofferedTo(localState[assetId].address);
            setOfferedAmount(localState[assetId].amount);
            setofferedFrom(address);
            setAssetId(assetId);
            if (localState[assetId].address != account.addr) {
              throw new Error(
                "You can't buy this NFT, as this offer is not for you"
              );
            }
            if (localState[assetId].amount <= 0) {
              throw new Error("Invalid Offer Amount");
            }
            closeMessage(key, "success", "Offer Fetched & You can Buy it");
          } else {
            throw new Error("Offer Not Found");
          }
        } else {
          throw new Error("Invalid Inputs");
        }
      } catch (e: any) {
        closeMessage(key, "error", e.message);
        error(e.message);
      } finally {
        setIsFetchingOffer(false);
      }
    }
  };

  // State variables for balances before buying
  const [
    beforeBuyRoyaltyRecipientBalance,
    setBeforeBuyRoyaltyRecipientBalance,
  ] = useState<number | undefined>(undefined);
  const [beforeBuySellerBalance, setBeforeBuySellerBalance] = useState<
    number | undefined
  >(undefined);
  const [beforeBuyBuyerBalance, setBeforeBuyBuyerBalance] = useState<
    number | undefined
  >(undefined);
  const [isFetchingBeforeBalances, setIsFetchingBeforeBalances] =
    useState<boolean>(false);

  // Function to fetch balances before buying
  const fetchBeforeBalances = async () => {
    try {
      setIsFetchingBeforeBalances(true);
      if (account && royaltyRecipient && offeredFrom && offeredAmount) {
        const royaltyRecipientBalance = await algodClient
          .accountInformation(royaltyRecipient)
          .do();
        const sellerBalance = await algodClient
          .accountInformation(offeredFrom)
          .do();
        const buyerBalance = await algodClient
          .accountInformation(account.addr)
          .do();
        setBeforeBuyRoyaltyRecipientBalance(
          algosdk.microalgosToAlgos(royaltyRecipientBalance.amount)
        );
        setBeforeBuySellerBalance(
          algosdk.microalgosToAlgos(sellerBalance.amount)
        );
        setBeforeBuyBuyerBalance(
          algosdk.microalgosToAlgos(buyerBalance.amount)
        );
      }
    } catch (e: any) {
      error(e.message);
    } finally {
      setIsFetchingBeforeBalances(false);
    }
  };

  // Ref for amount input
  const amountref = useRef<InputRef>(null);
  const [isBuying, setIsBuying] = useState<boolean>(false); // Flag to indicate if the offer is being bought

  // Function to buy the offer
  const buyOffer = async (
    account: algosdk.Account,
    assetId: number,
    offeredAmount: number,
    offeredFrom: string,
    royaltyRecipient: string
  ) => {
    const key = generateRandomString(8);
    try {
      openMessage(key, "Buying Offer..");
      setIsBuying(true);
      if (amountref.current?.input) {
        const amountToBePaid = parseFloat(amountref.current.input.value);
        var suggestedParams = await algodClient.getTransactionParams().do();
        const asset_optin_txn =
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            assetIndex: assetId,
            amount: 0,
            suggestedParams,
            from: account.addr,
            to: account.addr,
          });
        const signed_asset_optin_txn = asset_optin_txn.signTxn(account.sk);
        await algodClient.sendRawTransaction(signed_asset_optin_txn).do();
        await algosdk.waitForConfirmation(
          algodClient,
          asset_optin_txn.txID().toString(),
          3
        );

        suggestedParams = await algodClient.getTransactionParams().do();
        const xferTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: account.addr,
          to: ARC18_APP_ADDRESS,
          suggestedParams,
          amount: algosdk.algosToMicroalgos(amountToBePaid),
        });
        await appCaller.transferAlgoPayment(
          {
            royalty_asset: assetId,
            royalty_asset_amount: offeredAmount,
            from: offeredFrom,
            to: account.addr,
            royalty_receiver: royaltyRecipient,
            payment: { transaction: xferTxn, signer: account },
            current_offer_amount: offeredAmount,
          },
          {
            sender: account,
            assets: [assetId],
            accounts: [offeredFrom, royaltyRecipient],
            sendParams: { fee: algokit.algos(0.004) },
          }
        );
      }
      await fetchAfterBalances();
      closeMessage(key, "success", "Offer Bought Successfully");
    } catch (e: any) {
      closeMessage(key, "error", e.message);
    } finally {
      setIsBuying(false);
    }
  };

  // State variables for balances after buying
  const [afterBuyRoyaltyRecipientBalance, setAfterBuyRoyaltyRecipientBalance] =
    useState<string | undefined>(undefined);
  const [afterBuySellerBalance, setAfterBuySellerBalance] = useState<
    string | undefined
  >(undefined);
  const [afterBuyBuyerBalance, setAfterBuyBuyerBalance] = useState<
    string | undefined
  >(undefined);

  // Function to fetch balances after buying
  const fetchAfterBalances = async () => {
    if (
      account &&
      royaltyRecipient &&
      offeredFrom &&
      offeredAmount &&
      beforeBuyBuyerBalance &&
      beforeBuySellerBalance &&
      beforeBuyRoyaltyRecipientBalance
    ) {
      const royaltyRecipientBalance = await algodClient
        .accountInformation(royaltyRecipient)
        .do();
      const sellerBalance = await algodClient
        .accountInformation(offeredFrom)
        .do();
      const buyerBalance = await algodClient
        .accountInformation(account.addr)
        .do();
      setAfterBuyRoyaltyRecipientBalance(
        String(algosdk.microalgosToAlgos(royaltyRecipientBalance.amount)) +
          " Algos (+" +
          String(
            roundwithScale(
              algosdk.microalgosToAlgos(royaltyRecipientBalance.amount) -
                beforeBuyRoyaltyRecipientBalance,
              3
            )
          ) +
          " Algos)"
      );
      setAfterBuySellerBalance(
        String(algosdk.microalgosToAlgos(sellerBalance.amount)) +
          " Algos (+" +
          String(
            roundwithScale(
              algosdk.microalgosToAlgos(sellerBalance.amount) -
                beforeBuySellerBalance,
              3
            )
          ) +
          " Algos)"
      );
      setAfterBuyBuyerBalance(
        String(algosdk.microalgosToAlgos(buyerBalance.amount)) +
          " Algos (" +
          String(
            roundwithScale(
              algosdk.microalgosToAlgos(buyerBalance.amount) -
                beforeBuyBuyerBalance,
              3
            )
          ) +
          " Algos)"
      );
    }
  };

  // Function to transfer test tokens to an account
  const transferTestTokens = async (reciever: string) => {
    const account = algosdk.mnemonicToSecretKey(MASTER_WALLET_MNEMONIC);
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

  // Function to round a number to a specific scale
  const roundwithScale = (num: number, scale: number) => {
    return Math.round((num + Number.EPSILON) * 10 ** scale) / 10 ** scale;
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
            title: "Order Details",
            description: "Enter Order Details",
          },
          {
            title: "Buy Order",
            description: "Buy Order & Compare Balances for Royalty",
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
            </Button>{" "}
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

      {/* Order details step */}
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
                  ]}
                />
              </div>
              <div>
                <ShowList
                  title="Order Details"
                  listData={[
                    {
                      key: "Asset ID:",
                      value: assetId
                        ? assetId
                        : isFetchingOffer
                        ? "Fetching.."
                        : "Not Fetched",
                    },
                    {
                      key: "Offered To:",
                      value: offeredTo
                        ? offeredTo
                        : isFetchingOffer
                        ? "Fetching.."
                        : "Not Fetched",
                    },
                    {
                      key: "Offered By:",
                      value: offeredFrom
                        ? offeredFrom
                        : isFetchingOffer
                        ? "Fetching.."
                        : "Not Fetched",
                    },
                    {
                      key: "Offered Amount:",
                      value: offeredAmount
                        ? offeredAmount
                        : isFetchingOffer
                        ? "Fetching.."
                        : "Not Fetched",
                    },
                    {
                      key: "Royalty Recipient:",
                      value: royaltyRecipient
                        ? royaltyRecipient
                        : isFetchingOffer
                        ? "Fetching.."
                        : "Not Fetched",
                    },
                    {
                      key: "Royalty Percent:",
                      value: royaltyPercent
                        ? royaltyPercent
                        : isFetchingOffer
                        ? "Fetching.."
                        : "Not Fetched",
                    },
                  ]}
                />
              </div>
              <div className="center">
                <Input ref={assetref} placeholder="Enter Asset ID" />
                <Input ref={addressref} placeholder="Enter Seller Address" />
                <Button
                  disabled={isFetchingOffer ? true : false}
                  onClick={() => fetchOffer()}
                >
                  Fetch Offer
                </Button>
              </div>
              <div className="center">
                <Button
                  disabled={
                    assetId && offeredTo && offeredAmount
                      ? offeredTo == account.addr
                        ? offeredAmount > 0
                          ? false
                          : true
                        : true
                      : true
                  }
                  onClick={() => setCurrent(2)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Buy order step */}
      {current === 2 &&
        account &&
        balance > 0 &&
        assetId &&
        offeredFrom &&
        offeredTo &&
        offeredAmount &&
        royaltyPercent &&
        royaltyRecipient && (
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
                    ]}
                  />
                </div>
                <div>
                  <ShowList
                    title="Offer Details"
                    listData={[
                      {
                        key: "Asset ID:",
                        value: assetId,
                      },
                      {
                        key: "Offered To:",
                        value: offeredTo,
                      },
                      {
                        key: "Offered By:",
                        value: offeredFrom,
                      },
                      {
                        key: "Offered Amount:",
                        value: offeredAmount,
                      },
                      {
                        key: "Royalty Recipient:",
                        value: royaltyRecipient,
                      },
                      {
                        key: "Royalty Percent:",
                        value: royaltyPercent,
                      },
                    ]}
                  />
                </div>
                <div className="center">
                  <Button
                    disabled={
                      isFetchingBeforeBalances
                        ? true
                        : beforeBuyBuyerBalance &&
                          beforeBuySellerBalance &&
                          beforeBuyRoyaltyRecipientBalance
                        ? true
                        : false
                    }
                    onClick={() => fetchBeforeBalances()}
                  >
                    Fetch Before Balances
                  </Button>
                </div>
                <div>
                  <ShowList
                    title="Before Buy Balances"
                    listData={[
                      {
                        key: "Royalty Recipient Balance:",
                        value: beforeBuyRoyaltyRecipientBalance
                          ? beforeBuyRoyaltyRecipientBalance
                          : isFetchingBeforeBalances
                          ? "Fetching.."
                          : "Not Fetched",
                      },
                      {
                        key: "Seller Balance:",
                        value: beforeBuySellerBalance
                          ? beforeBuySellerBalance
                          : isFetchingBeforeBalances
                          ? "Fetching.."
                          : "Not Fetched",
                      },
                      {
                        key: "Buyer Balance:",
                        value: beforeBuyBuyerBalance
                          ? beforeBuyBuyerBalance
                          : isFetchingBeforeBalances
                          ? "Fetching.."
                          : "Not Fetched",
                      },
                    ]}
                  />
                </div>
                <div className="center">
                  <Input ref={amountref} placeholder="Enter Payment Amount" />
                  <Button
                    disabled={
                      beforeBuyBuyerBalance &&
                      beforeBuyRoyaltyRecipientBalance &&
                      beforeBuySellerBalance
                        ? afterBuyBuyerBalance &&
                          afterBuyRoyaltyRecipientBalance &&
                          afterBuySellerBalance
                          ? true
                          : isBuying
                          ? true
                          : false
                        : true
                    }
                    onClick={() =>
                      buyOffer(
                        account,
                        assetId,
                        offeredAmount,
                        offeredFrom,
                        royaltyRecipient
                      )
                    }
                  >
                    Buy Offer
                  </Button>
                </div>
                {afterBuyBuyerBalance &&
                  afterBuySellerBalance &&
                  afterBuyRoyaltyRecipientBalance && (
                    <div>
                      <ShowList
                        title="After Buy Balances"
                        listData={[
                          {
                            key: "Royalty Recipient Balance:",
                            value: afterBuyRoyaltyRecipientBalance,
                          },
                          {
                            key: "Seller Balance:",
                            value: afterBuySellerBalance,
                          },
                          {
                            key: "Buyer Balance:",
                            value: afterBuyBuyerBalance,
                          },
                        ]}
                      />
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
