<script setup lang="ts">
import { ref } from 'vue';

const config_for_iframe = 
`const telos = new TelosCloud({
    appName: 'Telos Zero',
    login: {
        iframe: {
            usePopUp: true,
            syncWithWallet: true,
            containerElementId: 'google_btn',
            width: "377px",
            height: "600px",
        },
    },
    chain: {
        // telos mainnet
        chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11',
        rpcEndpoint: 'https://mainnet.telos.net',
    },
    fuel: {
        // currently only mainnet is supported
        rpcEndpoint: 'https://telos.greymass.com',
        hyperionEndpoint: 'https://mainnet.telos.net',
    },
    metakeep: {
        // your own metakeet app id
        appId: 'ad5e05fb-280a-41ae-b186-67b925a26545',
    },
    logger: false
});`;

const config_for_local = 
`const telos = new TelosCloud({
    appName: 'Telos Zero',
    login: {
        local: {
            // your own google client id
            googleOneTap: {
                appId: '639241197544-kcubenhmti6u7ef3uj360n2lcl5cmn8c.apps.googleusercontent.com',
                buttonId: 'google_btn',
            },
            // your own rpc endpoint
            accountCreationEndpoint: 'https://accounts.create.foo',
        }
    },
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
    logger: true
});`;

const config_for_redirect = 
`const telos = new TelosCloud({
    appName: 'Telos Zero',
    login: {
        redirect: {
            callbackUrl: window.location.origin + window.location.pathname,
        },
    },
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
    logger: false
});`;


const configs = {
    config_for_iframe,
    config_for_local,
    config_for_redirect,
} as {[keys: string]: string};

const urls = {
    config_for_iframe: 'https://github.com/vapaee/telos-cloud-js/blob/main/examples/vue-ts/src/views/iframe/TelosCloudPage.vue',
    config_for_local: 'https://github.com/vapaee/telos-cloud-js/blob/main/examples/vue-ts/src/views/local/TelosCloudPage.vue',
    config_for_redirect: 'https://github.com/vapaee/telos-cloud-js/blob/main/examples/vue-ts/src/views/redirect/TelosCloudPage.vue',
} as {[keys: string]: string};

const props = defineProps<{
    config: string;
}>();

</script>
<template>
    <div class="c-app-header">
        <div class="c-app-header__code">
            <div class="c-app-header__code-title">
                <h3>{{ props.config.split('_').join(' ') }}</h3>
            </div>
            <pre>{{ configs[props.config] }}</pre>
            <div class="c-app-header__code-links">
                <a class="c-app-header__code-link" :href="urls[props.config]" target="_blank">View on GitHub</a>
                <a class="c-app-header__code-link" href="https://github.com/vapaee/telos-cloud-js" target="_blank">TelosCloud.js</a>
            </div>
        </div>
    </div>
</template>

<style lang="scss">

.c-app-header {

    &__code {
        background-color: #f5f5f5;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
        margin: 20px 0;
        &-title {
            margin-bottom: 20px;
            h3 {
                font-size: 24px;
                font-weight: 500;
                color: #363636;
            }
        }
        pre {
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
            font-size: 16px;
            font-weight: 400;
            color: #363636;
            text-align: left;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        &-links {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            &-link {
                text-decoration: none;
                color: #363636;
                font-size: 16px;
                font-weight: 500;
            }
        }
    }

}
</style>