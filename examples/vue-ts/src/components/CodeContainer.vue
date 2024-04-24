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

const codeVisible = ref(false);

const toggleCodeVisibility = () => {
    codeVisible.value = !codeVisible.value;
};


const copyCodeToClipboard = async () => {
    await navigator.clipboard.writeText(configs[props.config]);
    alert('Code copied to clipboard!');
};

</script>

<template>
    <footer class="code-container">
        <a class="code-container__link" href="https://github.com/vapaee/telos-cloud-js" target="_blank">TelosCloud.js on GitHub</a>
        <span class="code-container__link" @click="toggleCodeVisibility">Vew code</span>

        <div v-if="codeVisible" class="code-container__popup">
            <div class="code-container__popup_content">
                <span class="code-container__popup_close" @click="toggleCodeVisibility">&#10005;</span>
                <pre class="code-container__popup_code">{{ configs[props.config] }}</pre>
                <div class="code-container__popup_footer">
                    <span class="code-container__link" @click="copyCodeToClipboard">Copy code</span>
                    <a class="code-container__link" :href="urls[props.config]" target="_blank">View on GitHub</a>
                </div>
            </div>
        </div>
    </footer>
</template>

<style lang="scss" scoped>
.code-container {
    display: flex;
    justify-content: space-between;
    background-color: transparent;
    padding: 10px 20px 0px 20px;
    margin-top: 20px;
    min-width: 400px;
    //border-top: 1px solid #cccccc;

    
    &__link {
        font-size: 16px;
        text-decoration: none;
        color: black;
        &:hover {
            color: #007bff;
            text-decoration: underline;
            cursor: pointer;
        }
    }

    &__popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10;        
        &_content {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            position: relative;
        }
    
        &_close {
            position: absolute;
            top: 1px;
            right: 10px;
            border: none;
            background: none;
            font-size: 22px;
            font-weight: bold;
            cursor: pointer;
        }
    
        &_code {
            text-align: left;
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            font-size: 16px;
            color: #363636;
        }
    
        &_footer {
            display: flex;
            gap: 10px;
            justify-content: space-between;
            margin-top: 20px;
        }
    }

}

</style>
