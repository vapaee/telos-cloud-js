export interface TelosCloudOptions {
    appName?: string;
    login: { 
        iframe?: {
            usePopUp?: boolean;
            syncWithWallet?: boolean;
            containerElementId?: string;
            width?: string;
            height?: string;
        };
        redirect?: {
            callbackUrl?: string;
        };
        local?: {
            // If you want to use Google One Tap, you need to provide the appId
            googleOneTap?: {
                appId: string;
                buttonId?: string;
                config?: {
                    theme: string;
                    size: string;
                };
            };
            // your own rpc endpoint
            accountCreationEndpoint: string;
            /*
            this will create the following call in the user does not have an account:
            curl 'https://accounts.create.foo/' \
            --data-raw '{
                "ownerKey": "EOS581My48JQK2gjpHcEg...FWkrAtF2M5qefcr",
                "activeKey": "EOS581My48JQK2gjpHcEg...FWkrAtF2M5qefcr",
                "jwt": "eyJhb...isRJig",
                "suggestedName": ""
            }'
            */             
        };
    };
    chain: {
        chainId: string;
        rpcEndpoint: string;
    };
    fuel?: {
        rpcEndpoint: string;
        hyperionEndpoint: string;
    };
    metakeep: {
        appId: string;
        accountCreateAPI?: string;
    };
    logger?: boolean;
    walletTrace?: boolean;
}

export interface TelosCloudLoggedUser {
    account: string;
    permission: string;
    email: string;
    keys: string[];
}
