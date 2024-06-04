# telos-cloud.js

### [Check the Demo](https://vapaee.github.io/telos-cloud-js)

## Intro
Bridging the gap between the traditional web2 world and the emerging web3 landscape is a crucial step toward massive adoption, yet it poses significant challenges due to the complexity of the technologies involved. 

**telos-cloud.js** addresses these challenges by simplifying the process of integrating web2 access to web3 projects. It wraps all the complexity and offers a simple solution for the developer to use.

It covers the key generation and transaction signing on behalf of the user (Metakeep), the initial resources coverage for new users (GrayMass Fuel), and even easy user authentication (Google One Tap). With **telos-cloud.js**, developers can leverage a straightforward API to welcome web2 users, making development effort low seamlessly.

## Install package

You can install the package using npm

```bash
npm install @vapaee/telos-cloud
```
or yarn

```bash
yarn add @vapaee/telos-cloud
```

## Create Instance

To interact with the web2 functionalities provided by telos-cloud, the first step is to create an instance of TelosCloud with the desired configuration. This setup allows you to specify parameters such as the blockchain to connect to, authentication services to use, and initial resources for new users.

```ts
import { TelosCloud } from '@vapaee/telos-cloud';

// -- telos cloud instance --
const telos = new TelosCloud({
    appName: 'App Name',
    chain: {
         // telos mainnet
        chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11',
        rpcEndpoint: 'https://mainnet.telos.net',
    },
    fuel: {
        rpcEndpoint: 'https://telos.greymass.com',
        hyperionEndpoint: 'https://mainnet.telos.net',
    },
    metakeep: {
        appId: 'ad5e05fb-280a-41ae-b186-5a2654567b92',
    },
    googleOneTap: {
        appId: '639241197544-kcubenhmti6u7ef3uj360n2lcl5cmn8c.apps.googleusercontent.com',
    },
    accountCreation: {
        // your own rpc endpoint
        rpcEndpoint: 'https://accounts.create.foo',
    },
    logger: false
});
```

## Parameters
- appName: only used by MetaKeep for now.
- chain: info about the Antelope blockchain to connect to.
  - only tested on Telos (Testnet and Mainnet).
  - Fuel only supports Mainnet for now.
- fuel: configuration for the GreyMass fuel service.
- metakeep: you need to register your own application on MetaKeep and obtain the appId from it.
- googleOneTap: you need to register your own application on Google and obtain the appId from it. Only necessary if you want to use Google One Tap to easily authenticate the user.
- accountCreation: this parameter is still under construction and contains configuration about what to do when first-time users try to login and they don't have an account already created. Let's talk more about this.

## Account creation
As an important part of the process of welcoming new users, account creation should be a smooth step in the way of authenticating and logging in the user into the app. Unfortunately, this requires backend support, and we don't have an official solution for that (yet, I'm working on it).

For now, the only option ready to use is the configuration of your own RPC endpoint to be called when the library needs to create an account for the new user. If that is the case, the library will attempt to perform the following HTTP POST:

```bash
curl 'https://accounts.create.foo/' \
--data-raw '{
    "ownerKey": "EOS581My48JQK2gjpHcEg...FWkrAtF2M5qefcr",
    "activeKey": "EOS581My48JQK2gjpHcEg...FWkrAtF2M5qefcr",
    "jwt": "eyJhb...isRJig",
    "suggestedName": ""
}'
```

The response of this POST call should be a JSON containing the account name created for the user like this:
```json
{
    "accountName": "newaccount12"
}
```

## Events

You can register to the events onLogin and onLogout to update your app internal state like this:

```ts
// Handle login and logout events --
telos.events.onLogin.subscribe(() => {
    userAccount.value = telos.userAccount;
    pubKeys.value = telos.pubKeys;
    isLogged.value = true;
});

telos.events.onLogout.subscribe(() => {
    userAccount.value = '';
    pubKeys.value = [];
    isLogged.value = false;
});
```

You can also subscribe to the onProgress event which will return a -1 if the there's no action in progress. Otherwise, it will be throwing the percentage of the progress for the current action, wether is a transaction or a login action.

```ts
telos.onProgress.subscribe((p) => {
    percent.value = Math.round(p * 100);
});
```

## Sign Transactions

To sign a transaction you just need to create a standard action list structure and the call the function `telos.api.transact` like in the following example:

```ts
// Example transaction
const signExampleTransaction = async () => {
    if (isLoading.value) {
        return;
    }
    try {
        isLoading.value = true;
        const result = await telos.api.transact({
            actions: [
                {
                    account: "eosio",
                    name: "delegatebw",
                    authorization: [
                        {
                            actor: telos.userAccount,
                            permission: "active",
                        },
                    ],
                    data: {
                        from: telos.userAccount,
                        receiver: telos.userAccount,
                        stake_net_quantity: "0.0000 TLOS",
                        stake_cpu_quantity: "0.0001 TLOS",
                        transfer: false,
                    },
                },
            ],
        });
        transactionId.value = result.transaction_id as string;
        isLoading.value = false;
    } catch (error) {
        console.error('Error signing transaction:', error);
        isLoading.value = false;
    }
};
```

Calling this function will perform the following actions:
- an initial transaction is created with the action list provided
- GrayMass fuel service is used to see if we need resources coverage
  - if affirmative, the transaction is modified an partially signed
- The final transaction is sent to Metakeep for user signing
  - this action may add an extra step to verify the user by email
  - a confirmation dialog will popup.
