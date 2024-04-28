// Most of this code was taken and addapted from https://gist.github.com/aaroncox/d74a73b3d9fbc20836c32ea9deda5d70
import {
    SignTransactionConfig,
    SignTransactionResponse,
} from 'universal-authenticator-library';
import {
    ABI,
    APIClient,
    AnyTransaction,
    PackedTransaction,
    PermissionLevel,
    Serializer,
    Signature,
    SignedTransaction,
    Transaction,
} from '@greymass/eosio';

import { User } from 'universal-authenticator-library';
import { Subject } from 'rxjs';

import { Logger } from './Logger';
const logger = new Logger('FuelUserWrapper');

export interface FuelUserWrapperConfig {
    rpcEndpoint: string,
    hyperionEndpoint: string,
}

export interface ResourceProviderResponse {
    code: number;
    data: {
        request: [string, SignedTransaction];
        signatures: Signature[];
    };
}

// Wrapper for the user to intersect the signTransaction call
// Use initFuelUserWrapper() method to initialize an instance of the class

class FuelUserWrapper extends User {
    user: User;
    fuelServiceEnabled = false;
    fuelRpc: string | undefined;
    resourceProviderEndpoint: string | undefined;
    client: APIClient | undefined;
    // The maximum fee per transaction this script is willing to accept
    maxFee: number = 0.05;
    // expire time in millisec
    expireSeconds: number = 3600;


    constructor(user: User, public onStep: Subject<void|null>) {
        super();
        logger.method('constructor', { user });
        this.user = user;
    }

    init(config: FuelUserWrapperConfig) {
        logger.method('init', { config });
        this.client = new APIClient({
            url: config.hyperionEndpoint,
        });
        this.fuelRpc = config.rpcEndpoint;
        this.resourceProviderEndpoint = `${this.fuelRpc}/v1/resource_provider/request_transaction`;
    }

    // called immediately after class instantiation in initFuelUserWrapper()
    async setAvailability() {
        logger.method('setAvailability');
        if (!this.fuelRpc){
            return;
        };
        try {
            // verify fuel service is available
            this.fuelServiceEnabled = (await fetch(this.fuelRpc)).status === 200;
        } catch(e) {
            console.error(e);
        }
    }

    async signTransaction(
        originalTransaction: AnyTransaction,
        originalConfig: SignTransactionConfig,
    ): Promise<SignTransactionResponse> {
        const trace = logger.method('signTransaction', { originalTransaction, originalConfig });
        try {
            // if fuel service disabled, send tx using generic ual user method
            if (!this.fuelServiceEnabled) {
                return this.user.signTransaction(originalTransaction, originalConfig);
            }

            if (!this.client) {
                throw new Error('FuelUserWrapper not initialized. client not set');
            }

            if (!this.resourceProviderEndpoint) {
                throw new Error('FuelUserWrapper not initialized. resourceProviderEndpoint not set');
            }

            const client = this.client;

            // Retrieve transaction headers
            const info = await client.v1.chain.get_info();
            const header = info.getTransactionHeader(this.expireSeconds);
            trace('Step 1 - got transaction header:', header);
            this.onStep.next();

            const actions = originalTransaction.actions ?? [];

            // collect all contract abis
            const abi_promises = actions.map(a =>
                client.v1.chain.get_abi(a.account),
            );
            const responses = await Promise.all(abi_promises);
            const abis = responses.map(x => x.abi).filter(x => x !== undefined) as ABI.Def[]
            const abis_and_names = actions.map((x, i) => ({
                contract: x.account,
                abi: abis[i],
            }));
            trace('Step 2 - got abis:', abis_and_names);
            this.onStep.next();

            // create complete well formed transaction
            const transaction = Transaction.from(
                {
                    ...header,
                    actions: originalTransaction.actions,
                },
                abis_and_names,
            );

            // Pack the transaction for transport
            const packedTransaction = PackedTransaction.from({
                signatures: [],
                packed_context_free_data: '',
                packed_trx: Serializer.encode({ object: transaction }),
            });

            const signer = PermissionLevel.from({
                actor: (await this.user.getAccountName()),
                permission: this.requestPermission,
            });

            // Submit the transaction to the resource provider endpoint
            const cosigned = await fetch(this.resourceProviderEndpoint, {
                body: JSON.stringify({
                    signer,
                    packedTransaction,
                }),
                method: 'POST',
            });

            // Interpret the resulting JSON
            const rpResponse: ResourceProviderResponse = await cosigned.json();
            trace('Step 3 - provider response:', { code: rpResponse.code, rpResponse, cosigned });
            this.onStep.next();
            switch (rpResponse.code) {
            case 402:
                // Resource Provider provided signature in exchange for a fee
                // is ok to treat them with the same logic of code = 200?
                // Yes according to this: https://gist.github.com/aaroncox/d74a73b3d9fbc20836c32ea9deda5d70#file-fuel-core-presign-js-L128-L159
                // Aron rightly suggests that we should show and confirm the fee costs for this service:
                // https://github.com/telosnetwork/open-block-explorer/pull/477#discussion_r1053417964
                
            case 200: 
            // Resource Provider provided signature for free

                const { data } = rpResponse;
                const [, returnedTransaction] = data.request;
                const modifiedTransaction: SignedTransaction = returnedTransaction;

                modifiedTransaction.signatures = [...data.signatures];
                // Sign the modified transaction
                const locallySigned: SignTransactionResponse =
                await this.user.signTransaction(
                    modifiedTransaction,
                    Object.assign(originalConfig, { broadcast: false }),
                );
                trace('Step 8 - locally signed:', locallySigned);
                this.onStep.next();

                // When using CleosAuthenticator the transaction returns empty
                if (!locallySigned.transaction.signatures) {
                    return Promise.reject(
                        'The transaction was not broadcasted because no signatures were obtained',
                    );
                }

                // Merge signatures from the user and the cosigned response tab
                modifiedTransaction.signatures = [
                    ...locallySigned.transaction.signatures,
                    ...data.signatures,
                ];

                // Broadcast the signed transaction to the blockchain
                trace('broadcasting transaction:', modifiedTransaction);
                const pushResponse = await client.v1.chain.push_transaction(
                    modifiedTransaction,
                );

                // we compose the final response
                const finalResponse = {
                    wasBroadcast: true,
                    transactionId: pushResponse.transaction_id,
                    status: pushResponse.processed.receipt.status,
                    transaction: modifiedTransaction,
                } as SignTransactionResponse;

                trace('Step 9 - final response:', finalResponse);
                this.onStep.next();

                return Promise.resolve(finalResponse);
            
            case 400: 
                // Resource Provider refused to sign the transaction, aborting
                // "Network resources not required by this account."
                trace('Steps 4-5 - Resource Provider refused to sign the transaction, aborting');
                this.onStep.next();
                this.onStep.next();
                break;
            
            default:
                throw (
                    'Code ' +
                    (+rpResponse.code).toString() +
                    ' not expected from resource provider endpoint: ' +
                    this.resourceProviderEndpoint
                );
            }

            // If we got here it means the resource provider will not participate in this transaction
            return this.user.signTransaction(originalTransaction, originalConfig);
        } catch (e) {
            throw e;
        }
    }

    // since this is a wrapper is also wraps the possible requestPermission hidden property
    get requestPermission() {
        return 'active';
    }

    // These functions are just proxies
    signArbitrary = async (
        publicKey: string,
        data: string,
        helpText: string,
    ): Promise<string> => this.user.signArbitrary(publicKey, data, helpText);
    verifyKeyOwnership = async (challenge: string): Promise<boolean> =>
        this.user.verifyKeyOwnership(challenge);
    getAccountName = async (): Promise<string> => this.user.getAccountName();
    getChainId = async (): Promise<string> => this.user.getChainId();
    getKeys = async (): Promise<string[]> => this.user.getKeys();
}

// create an instance of FuelUserWrapper class and check fuel service availability
export async function initFuelUserWrapper(user: User, config: FuelUserWrapperConfig, onStep: Subject<void|null>): Promise<User> {
    const fuelUserWrapper = new FuelUserWrapper(user, onStep);
    fuelUserWrapper.init(config);
    await fuelUserWrapper.setAvailability();
    return fuelUserWrapper;
}
