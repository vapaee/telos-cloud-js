<script lang="ts">
import { defineComponent, ref } from 'vue';
import { TelosCloud } from '@vapaee/telos-cloud';

import NavegationBar from '@/components/NavegationBar.vue';

export default defineComponent({
    name: 'TelosCloudPage',
    components: {
        NavegationBar,
    },
    setup() {
        // -- variables --
        const userAccount = ref('');
        const pubKeys = ref([] as string[]);
        const isLogged = ref(false);
        const isLoading = ref(false);
        const transactionId = ref('');

        // -- telos cloud instance --
        const telos = new TelosCloud({
            appName: 'Telos Zero',
            chain: {
                chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11', // telos mainnet
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
                buttonId: 'google_btn',
            },
            accountCreation: {
                // your own rpc endpoint
                rpcEndpoint: 'https://accounts.create.foo',
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
            },
            logger: true
        });
        
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
            telos.reset();
        });

        // Check if we are already logged in
        telos.checkAutoLogin();
    
        // -- actions --

        // Logout button
        const logout = async () => {
            try {
                await telos.logout();
                userAccount.value = '';
                pubKeys.value = [];
                isLogged.value = false;
            } catch (error) {
                console.error(error);
            }
        };

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

        // Visit account
        const visitAccount = () => {
            window.open(`https://explorer.telos.net/account/${telos.userAccount}`, '_blank');
        };

        // necesitamos escuchar la respuesta para poder loguear al usuario con esas credenciales
        window.addEventListener('message', (event) => {
            console.log('event.data', event);
            try {
                if (typeof event.data === 'string') {
                    const credentials = JSON.parse(event.data);
                    console.log('credentials', credentials);
                    userAccount.value = credentials.account;
                    isLogged.value = true;
                    pubKeys.value = credentials.keys;
                }
            } catch (error) {
                // console.error('Error parsing credentials:', error);
            }
        });

        return {
            logout,
            signExampleTransaction,
            visitAccount,
            userAccount,
            pubKeys,
            isLogged,
            transactionId,
            isLoading,
        };
    },
});
</script>

<template>
    <NavegationBar />
    <div class="p-telos-cloud">
        <!-- Necesitamos un Card en el medio de la pantalla que tenga la siguiente información dependiendo si estamos logueados o no: -->
        
            <template v-if="!isLogged">
                <div class="p-telos-cloud__welcome-card">
                    <h1 class="p-telos-cloud__welcome-title">Cloud Login for Telos Zero</h1>
                    <div class="c-login-buttons__google-btn" id="google_btn" data-client_id="${googleCtrl.clientId}">loading...</div>
                </div>
            </template>

            <template v-else>
                <div class="p-telos-cloud__logged_card">
                    <h1 class="p-telos-cloud__logged-title" @click="visitAccount">account: {{ userAccount }}</h1>
                    <p class="p-telos-cloud__logged-pubkeys">key: {{ pubKeys[0] }}</p>

                    <div class="p-telos-cloud__logged-btns">
                        <button class="p-telos-cloud__logged-logout-btn" @click="logout">Logout</button>
                        <button
                            :class="{'p-telos-cloud__logged-stake-btn': true, 'p-telos-cloud__logged-stake-btn--loading': isLoading }"
                            @click="signExampleTransaction">
                                Stake 0.0001 TLOS for CPU
                        </button>
                    </div>
                    
                    <a class="p-telos-cloud__trx" v-if="transactionId" :href="'https://explorer.telos.net/transaction/' + transactionId" target="_blank">
                        {{ transactionId }}
                    </a>
                </div>
            </template>


            <iframe v-if="!isLogged" src="http://localhost:8081/?login=zero&iframe=http://localhost:8082/telos-cloud-redirect" width="377px" height="600px"></iframe>
    </div>
</template>

<style lang="scss">

.p-telos-cloud {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
    background-image: linear-gradient(0.4turn,#071033,#6039a4);
        

    &__welcome-card, &__logged_card {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        padding: 20px;
        border-radius: 10px;
        background-color: #fff;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    &__welcome-card {
        align-items: center;
    }

    &__welcome-title {
        font-size: 24px;
        margin-bottom: 20px;
    }

    &__logged-btns {
        display: flex;
        justify-content: space-between;
        gap: 10px;
    }

    &__trx {
        padding-top: 40px;
        display: block;
        text-decoration: none;
        color: blue;
    }

    &__welcome-login-btn, &__logged-logout-btn, &__logged-stake-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
    }
    
    &__logged-title {
        font-size: 24px;
        margin-bottom: 20px;
        cursor: pointer;
    }

    &__logged-sub-title {
        font-size: 20px;
        margin-bottom: 10px;
    }

    &__logged-pubkeys {
        font-size: 16px;
        margin-bottom: 20px;
    }

    &__welcome-login-btn {
        background-color: #007bff;
        color: #fff;
    }

    &__logged-logout-btn {
        background-color: #dc3545;
        color: #fff;
    }
    
    &__logged-stake-btn {
        background-color: #007bff;
        color: #fff;
        &--loading {
            background-color: rgb(197, 197, 197);
            color: #fff;
            cursor: not-allowed;
        }
    }

    &__logged-logout-btn:hover {
        background-color: #c82333;
    }

    &__welcome-login-btn:hover {
        background-color: #0056b3;
    }

    &__logged-stake-btn:hover {
        background-color: #0056b3;
    }

}
</style>
