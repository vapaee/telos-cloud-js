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
        if (config.googleOneTap) {
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

        if (config.googleOneTap) {
            // if we are using google to login
            googleCtrl.init(config.googleOneTap.appId);
            googleCtrl.renderButton(config.googleOneTap.buttonId);
        }

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
            accountCreateAPI: config.accountCreation?.rpcEndpoint,
            onStep: this.onStep,
        });

        if (config.accountCreation && config.accountCreation.allowRedirect) {
            trace('allowRedirect');
            this.auth.setAccountCreateCallback(() => {
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
                    if (config.chain.chainId === CAIN_ID__TELOS_MAINNET) {
                        window.open(`https://deploy-preview-783--wallet-develop-mainnet.netlify.app/?redirect=${current_url}`, '_self');
                    } else {
                        window.open(`https://deploy-preview-783--wallet-staging.netlify.app/?redirect=${current_url}`, '_self');
                    }
                });
            });
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
