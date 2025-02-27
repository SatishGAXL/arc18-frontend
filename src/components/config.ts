// Check if environment variables are missing
if (
  !import.meta.env.VITE_ALGOD_PORT ||
  !import.meta.env.VITE_ALGOD_URL ||
  !import.meta.env.VITE_ALGOD_TOKEN ||
  !import.meta.env.VITE_MASTER_WALLET_MNEMONIC ||
  !import.meta.env.VITE_ARC18_APP_ID ||
  !import.meta.env.VITE_ARC18_APP_ADDRESS
) {
  // Throw an error if any of the required environment variables are missing
  throw new Error(
    "Missing environment variables. Please make sure to create a .env file in the root directory of the project and add the following variables: VITE_ALGOD_PORT, VITE_ALGOD_URL, VITE_ALGOD_TOKEN, VITE_MASTER_WALLET_MNEMONIC, VITE_ARC18_APP_ID, VITE_ARC18_APP_ADDRESS"
  );
}

// Export the environment variables
export const ALGOD_PORT = Number(import.meta.env.VITE_ALGOD_PORT);
export const ALGOD_URL = import.meta.env.VITE_ALGOD_URL;
export const ALGOD_TOKEN = import.meta.env.VITE_ALGOD_TOKEN;
export const MASTER_WALLET_MNEMONIC = import.meta.env.VITE_MASTER_WALLET_MNEMONIC;
export const ARC18_APP_ID = Number(import.meta.env.VITE_ARC18_APP_ID);
export const ARC18_APP_ADDRESS = import.meta.env.VITE_ARC18_APP_ADDRESS;
