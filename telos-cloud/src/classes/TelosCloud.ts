import { googleCtrl } from './GoogleOneTap';
import { TelosCloudLoggedUser, TelosCloudOptions } from '../types';
import { GoogleCredentials, version } from '..';
import { Subject, Subscription } from 'rxjs';
import { MetakeepAuthenticator, UserCredentials } from './MetakeepUAL';
import { initFuelUserWrapper } from './GraymassFuel';

import { User } from 'universal-authenticator-library';
import { Logger } from './Logger';

const logger = new Logger('TelosCloud');

const TELOS_CLOUD_LOGGED_USER = 'telos-cloud.logged';
const CAIN_ID__TELOS_MAINNET = '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11';

const LOGGIN_STEPS = 7;
const TRANSACTION_STEPS = 8;

const MAINNET_URL = 'https://deploy-preview-796--wallet-develop-mainnet.netlify.app';
const STAGING_URL = 'https://deploy-preview-796--wallet-staging.netlify.app';

export class TelosCloud {
    googleSubscription: Subscription | null = null;
    onLogin = new Subject<void>();
    onLogout = new Subject<void>();
    auth: MetakeepAuthenticator | null = null;
    config: TelosCloudOptions | null = null;
    user: User | null = null;
    logged: TelosCloudLoggedUser | null = null;

    onStep = new Subject<void|null>();
    onReset = new Subject<number>();
    onProgress = new Subject<number>();
    step = -1;
    steps = 5;
    stepsEnabled = true;

    endPoint = '';

    constructor(config: TelosCloudOptions) {
        logger.method('constructor', config);
        this.onReset.subscribe({
            next: (steps) => {
                logger.method('onReset', steps);
                this.steps = steps;
                this.step = -1;
                this.onStep.next();
            },
        });
        this.onStep.subscribe({
            next: (_null) => {
                if (_null === null) {
                    this.onProgress.next(-1);
                } else {
                    this.step++;
                    logger.method('onStep', this.step);
                    if (this.stepsEnabled) {
                        this.onProgress.next(this.step/this.steps);
                    }
                }
            },
        });
        this.onProgress.subscribe({
            next: (progress) => {
                logger.method('onProgress', progress);
                if (progress === 1) {
                    setTimeout(() => {
                        this.onProgress.next(-1);
                    }, 1500);
                }
            },
        });
        if (config.logger) {
            logger.enable();
        }
        if (config.login?.local?.googleOneTap) {
            // if we are using google to login
            this.googleSubscription = googleCtrl.onSuccessfulLogin.subscribe({
                next: (data) => {
                    if (data) {
                        this.performTelosCloudLogin(data);
                    }
                },
            });
        }
        this.init(config);
    }

    init(config: TelosCloudOptions) {
        const trace = logger.method('init', config);
        this.config = config;

        const url = config.chain.rpcEndpoint;
        const protocol = url.split('://')[0];
        const host = url.split('://')[1].split(':')[0];
        const port = parseInt(url.split('://')[1].split(':')[1] || (protocol === 'https' ? '443' : '80'));

        const chain = {
            chainId: config.chain.chainId,
            rpcEndpoints: [
                { protocol, host, port },
            ],
        };

        this.auth = new MetakeepAuthenticator([chain], {
            appName: config.appName ?? 'TelosCloud',
            appId: config.metakeep.appId,
            accountCreateAPI: config.login?.local?.accountCreationEndpoint,
            onStep: this.onStep,
        });

        trace('auth:', this.auth);

        if (!config.login) {
            throw new Error('Login configuration MUST be set. Options are: local, redirect, iframe');
        }

        if (config.login.local) {
            // if we are using local login
            if (config.login.local?.googleOneTap) {
                trace('Local login with googleOneTap:', config.login.local.googleOneTap);
                // if we are using google to login
                googleCtrl.init(config.login.local?.googleOneTap.appId);
                googleCtrl.renderButton(config.login.local?.googleOneTap.buttonId);

            } else {
                trace('Local login with credentials:', config.login.local);
            }
            
        } else if (config.login.redirect) {
            // if we are using redirect login
            config.login.redirect.callbackUrl = config.login.redirect.callbackUrl || window.location.href;
            trace('Redirect login:', config.login.redirect);
        } else if (config.login.iframe) {
            // if we are using iframe login
            trace('Iframe login:', config.login.iframe);

            this.events.onLogin.subscribe(() => {
                trace('always closing iframe on login');
                this.closeIframe();
            });

            if (config.login.iframe.syncWithWallet) {        
                this.events.onLogout.subscribe(() => {
                    trace('only on sync we reopen the iframe on logout');
                    this.login();
                });
            }

            // Check iframe callback params
            window.addEventListener('message', async (event) => {
                try {
                    if (typeof event.data === 'string') {
                        const credentials = JSON.parse(event.data);
                        trace('credentials', credentials);
                        this.logged = {
                            permission: 'active',
                            ...credentials,
                        };
                        this.saveLoggedUser();
                        this.stepsEnabled = false;
                        await this.performTelosCloudLogin(credentials);
                        this.stepsEnabled = true;
                    }
                } catch (error) {
                    // console.error('Error parsing credentials:', error);
                }
            });


        }

        if (this.config?.chain.chainId === CAIN_ID__TELOS_MAINNET) {
            this.endPoint = MAINNET_URL;
        } else {
            this.endPoint = STAGING_URL;
        }
    }

    reset() {
        logger.method('reset');
        this.init(this.config as TelosCloudOptions);
    }

    async performTelosCloudLogin(data: GoogleCredentials) {
        logger.method('performTelosCloudLogin', data);
        this.onReset.next(LOGGIN_STEPS);
        return this.setMetakeepZero(data);
    }

    async saveLoggedUser() {
        const trace = logger.method('saveLoggedUser');
        trace('logged:', [this.logged]);
        if (this.logged) {
            localStorage.setItem(TELOS_CLOUD_LOGGED_USER, JSON.stringify(this.logged));
        } else {
            localStorage.removeItem(TELOS_CLOUD_LOGGED_USER);
        }
    }

    async checkAutoLogin() {
        const trace = logger.method('checkAutoLogin');
        const data = localStorage.getItem(TELOS_CLOUD_LOGGED_USER);
        trace('data:', data);
        if (!this.logged && data) {
            this.logged = JSON.parse(data);
        }

        // Check redirect callback params
        const url = new URL(window.location.href);
        const account = url.searchParams.get('account');
        const email = url.searchParams.get('email');
        if (account && email) {
            trace('URL params found! account:', account, 'email:', email);
            this.logged = {
                account,
                email,
                permission: 'active',
                keys: [],
            };
            this.saveLoggedUser();
        }

        if (this.logged) {
            if (this.logged.email && this.logged.account) {
                trace('performing login...');
                const credentials = {
                    email: this.logged.email,
                    jwt: '',
                    account: this.logged.account,
                }
                this.stepsEnabled = false;
                await this.performTelosCloudLogin(credentials);
                this.stepsEnabled = true;
            }
        } else {
            if (this.config?.login?.iframe?.syncWithWallet) {
                trace('no logged user, trying to login with sync iframe');
                this.login();
            }            
        }
    }

    async setMetakeepZero(credentials:GoogleCredentials){
        const trace = logger.method('setMetakeepZero', credentials);
        if (this.auth) {
            this.auth.setUserCredentials(credentials as UserCredentials);
            // this are steps from accounts store loginZero()
            await this.auth.init();
            const ualUsers = await this.auth.login();
            if (ualUsers?.length) {
                const useFuel = this.config?.fuel;
                const user = useFuel ? await initFuelUserWrapper(ualUsers[0], useFuel, this.onStep) : ualUsers[0];
                trace('user:', [user]);
                if (user) {
                    this.user = user
                    const permission = (this.user as unknown as { requestPermission: string })
                    .requestPermission ?? 'active';
                    const account = await this.user.getAccountName();
                    const email= credentials.email;
                    const keys = await this.user.getKeys();
                    this.logged = {
                        account,
                        permission,
                        email,
                        keys,
                    };
                    this.saveLoggedUser();
                    this.onLogin.next();
                }
            } else {
                throw new Error('MetakeepAuthenticator login failed');
            }
        } else {
            throw new Error('MetakeepAuthenticator not initialized');
        }
    };

    get version () {
        logger.method('version');
        return version;
    }

    get userAccount() {
        logger.method('userAccount');
        return this.logged?.account ?? '';
    }

    get pubKeys() {
        logger.method('pubKeys');
        return (this.logged?.keys ?? []) as string[];
    }

    get events() {
        return {
            onLogin: this.onLogin,
            onLogout: this.onLogout,
        };
    }

    popupElement: HTMLElement | null = null;
    iframeElement: HTMLElement | null = null;

    // iframe management ---------------------------
    async handleIframeLogin(): Promise<boolean> {
        const trace = logger.method('handleIframeLogin');

        if (this.config && this.config.login?.iframe) {
            const iframe = this.config.login.iframe;
            let parent: HTMLElement | null = null;
            if (iframe.usePopUp) {
                trace('using popup');
                // TODO: create a popup component and show iframe on it
                if (!this.popupElement) {
                    trace('creating popup component');
                    const topParent = document.createElement('div');
                    topParent.classList.add('c-telos-cloud');
                    document.body.appendChild(topParent);
        
                    parent = document.createElement('div');
                    parent.classList.add('c-telos-cloud__popup-frame-container');
                    topParent.appendChild(parent);

                    this.popupElement = topParent;

                    // if user clicks on topParent we close the popup
                    topParent.addEventListener('click', () => {
                        trace('closing popup');
                        // remove the whole popupElemenmt from the DOM
                        this.closeIframe();
                    });
                }
                setTimeout(() => {
                    this.popupElement?.classList.add('c-telos-cloud--show');
                }, 0);
                
            } else if (iframe.containerElementId) {
                // TODO: show iframe on container
                parent = document.getElementById(iframe.containerElementId);
            } else {
                console.warn('telos-cloud: iframe configuration is not complete. Inserting iframe on body');
                // TODO: show iframe on body
                parent = document.body;
            }
    
            let width = iframe.width ?? '377px';
            let height = iframe.height ?? '600px';
            
            // create iframe
            const iframeElement = document.createElement('iframe');
            iframeElement.src = `${this.endPoint}/?login=zero&iframe=${window.location.origin}&${iframe.syncWithWallet ? 'logout=true' : ''}&trace=${this.config.logger ? 'true' : 'false'}`;
            iframeElement.width = width;
            iframeElement.height = height;
            trace('parent:', parent);
            trace('iframeElement:', iframeElement);
            trace('iframeElement.src:', iframeElement.src);
            parent?.appendChild(iframeElement);
            this.iframeElement = iframeElement;

            return new Promise((resolve) => {
                this.events.onLogin.subscribe({
                    next: () => {
                        resolve(true);
                    },
                });
            });
        } else {
            return false;
        }

    }

    async closeIframe() {
        if (this.iframeElement) {
            this.iframeElement.parentNode?.removeChild(this.iframeElement);
            this.iframeElement = null;
        }
        if (this.popupElement) {
            this.popupElement.parentNode?.removeChild(this.popupElement);
            this.popupElement = null;
        }
    }
    // ---------------------------------------------

    async login(credentials: TelosCloudLoggedUser | null = null): Promise<boolean> {
        // logger.method('login', credentials);
        console.log('login', credentials);
        const ever = new Promise<boolean>(() => {});

        if (!this.config?.login) {
            throw new Error('Login configuration MUST be set. Options are: local, redirect, iframe');
        }

        const loginConfig = this.config.login;

        // If local was set, we use whatever credentials the caller may provide
        if (loginConfig.local) {
            if (credentials) {
                if (!credentials.email) {
                    throw new Error('Local login requires email. Additional optional fields are account and jwt');
                }
                this.logged = credentials;
                this.saveLoggedUser();
                return this.setMetakeepZero(credentials as GoogleCredentials).then(() => {
                    return true;
                });
            } else {
                if (this.config.login.local?.googleOneTap) {
                    // if we are using google to login
                    if (!this.config.login.local?.googleOneTap.buttonId) {
                        throw new Error('Local login requires buttonId');
                    }
                    googleCtrl.renderButton(this.config.login.local?.googleOneTap.buttonId);
                    return ever;
                } else {
                    throw new Error('Local login requires credentials: {email:string, account?:string} or googleOneTap configuration');
                }                 
            }
        }
        
        
        // If redirect was set, we redirect the user to the login page
        if (loginConfig.redirect) {
            window.location.href = loginConfig.redirect.callbackUrl ?? window.location.href;
            return new Promise(() => {
                // save a partial state of logged
                this.logged = {
                    account: '',
                    permission: '',
                    email: '',
                    keys: [],
                };
                this.saveLoggedUser();
                // we redirect the user to the login page
                const current_url = window.location.href;
                if (this.config?.chain.chainId === CAIN_ID__TELOS_MAINNET) {
                    window.open(`${this.endPoint}/?redirect=${current_url}&trace=${this.config?.logger ? 'true' : 'false'}`, '_self');
                } else {
                    window.open(`${this.endPoint}/?redirect=${current_url}&trace=${this.config?.logger ? 'true' : 'false'}`, '_self');
                }
            });
        }

        // if iframe was set, we show the iframe
        if (loginConfig.iframe) {            
            return this.handleIframeLogin();
        }
        return true;
    }

    async logout(): Promise<void> {
        logger.method('logout');
        this.logged = null;
        this.saveLoggedUser();
        this.onLogout.next(); // LOGOUT
    }

    get api() {
        return {
            transact: async (trx:any) => {
                const trace = logger.method('api.transact', trx);
                if (this.user) {
                    this.onReset.next(TRANSACTION_STEPS);
                    return this.user.signTransaction(trx, { broadcast: true }).then((result) => {
                        trace('result:', result.transactionId, [result]);
                        return ({ ...result, transaction_id: result.transactionId });
                    });
                } else {
                    throw new Error('User not logged in');
                }
            }
        };
    }
}
