import { AntelopeError } from '../types';

import * as Buffer from 'buffer';
import { BehaviorSubject, Subject } from 'rxjs';

import { Logger } from './Logger';

const logger = new Logger('GoogleOneTap');

export interface GoogleCredentials {
    email: string;
    jwt?: string;
    account?: string;
}

interface GoogleOneTap {
    accounts: {
        id: {
            initialize: (config: { client_id: string, callback: (notification: GoogleNotification) => void }) => void;
            prompt: (callback: (notification: GoogleNotification) => void) => void;
            renderButton: (element: HTMLElement, config: { theme: string, size: string }) => void;
            disableAutoSelect: () => void;
        }
    }
}

interface GoogleNotification {
    getMomentType: () => string;
    isDisplayed: () => boolean;
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    isDismissedMoment: () => boolean;
    getNotDisplayedReason: () => string;
    getSkippedReason: () => string;
    getDismissedReason: () => string;
    credential: string;
}

interface SuccessResponse {
    header: {
        alg: string;
        kid: string;
        typ: string;
    };
    payload: {
        iss: string;
        azp: string;
        aud: string;
        sub: string;
        email: string;
        email_verified: boolean;
        at_hash: string;
        nonce: string;
        exp: number;
        iat: number;
    };
}

let google: GoogleOneTap | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _window = (window as any);

export class GoogleOneTapController {

    onSuccessfulLogin = new BehaviorSubject<GoogleCredentials | null>(null);
    onError = new BehaviorSubject<string | null>(null);
    onMoment = new Subject<{type: string, status:string, reason:string}>();
    clientId = '';

    buttonConfig = { theme: 'outline', size: 'large' }; // default config

    constructor() {
    }

    init(clientId: string) {
        logger.method('init', clientId);
        this.clientId = clientId;
        this.installGoogleOneTapScript();
    }

    installGoogleOneTapScript() {
        const trace = logger.method('installGoogleOneTapScript');
        if (google) {
            trace('Google One Tap library already loaded');
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        _window.onGoogleLibraryLoad = () => {
            this.onGoogleLibraryLoad();
        };
    }

    onGoogleLibraryLoad() {
        const trace = logger.method('onGoogleLibraryLoad');
        if(!google){
            if (_window.google) {
                google = _window.google;
            } else {
                throw new AntelopeError('Google One Tap library not loaded');
            }
        }
        if (google) {
            trace('loaded. initializing');
            google.accounts.id.initialize({
                client_id: this.clientId,
                callback: (response: GoogleNotification | null) => {
                    if (response) {
                        const jwt = response.credential;
                        const decoded = this.decodeJWT(jwt);
                        this.handleOneTapSuccess(decoded, jwt);
                    } else {
                        this.handleOneTapError(JSON.stringify(response));
                    }
                },
            });
        }
    }

    decodeJWT(jwt: string) {
        const parts = jwt.split('.');
        const header = parts[0];
        const payload = parts[1];

        const decodedHeader = Buffer.Buffer.from(header, 'base64').toString('utf8');
        const decodedPayload = Buffer.Buffer.from(payload, 'base64').toString('utf8');

        return {
            header: JSON.parse(decodedHeader),
            payload: JSON.parse(decodedPayload),
        };
    }

    setButtonConfig(config: { theme: string, size: string }) {
        logger.method('setButtonConfig', config);
        this.buttonConfig = config;
    }

    timer = setTimeout(() => { /**/ }, 0);
    renderButton(tag_id = 'google_btn') {
        const trace = logger.method('renderButton', tag_id);
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            const btn = document.getElementById(tag_id);
            // we check if the first child element of the btn is a div, if so, then the button is already rendered
            if (btn && btn.children[0] && btn.children[0].tagName === 'DIV') {
                trace('button already rendered');
                clearInterval(this.timer);
                return;
            }
            if (!btn) {
                trace('button not found');
            }
            if (!google) {
                trace('google not loaded yet');
            }
            if (google && btn) {
                trace('rendering button');
                google.accounts.id.renderButton(
                    btn, this.buttonConfig,
                );
                clearInterval(this.timer);
            }
        }, 100);

        // we clear the interval after 5 seconds
        setTimeout(() => {
            clearInterval(this.timer);
        }, 5000);
    }


    handleOneTapMoment(type: string, status: string, reason: string) {
        logger.method('handleOneTapMoment', { type, status, reason });
        this.onMoment.next({ type, status, reason });
    }

    handleOneTapSuccess(response: SuccessResponse, jwt: string) {
        logger.method('handleOneTapSuccess', response);
        const email = response.payload.email;
        this.onSuccessfulLogin.next({ email, jwt });
    }

    handleOneTapError (error: string) {
        logger.method('handleOneTapError', error);
        this.onError.next(error);
    }

    logout() {
        logger.method('logout');
        if (google) {
            google.accounts.id.disableAutoSelect();
            this.onSuccessfulLogin.next(null);
        }
    }

}

export const googleCtrl = new GoogleOneTapController();
