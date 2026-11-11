'use client';

import GlobalSettings, { initialSettings, broadcastSettingsChange } from './GlobalSettings';
//////////////////////////////////////import { FZDataManager } from '../src/DataManagement/DataManager';


export default function GlobalSettingsInitialize(minYear, maxYear) {
    if (!initialSettings.isInitialized) {
        Object.assign(initialSettings, new GlobalSettings(minYear, maxYear));
        initialSettings.isInitialized = true;
    }

    /******************************* no longer needed for return fetch, since that is now done on the server 
    // 2. THE ADMIN HANDSHAKE
    try {
        const tpConnect = { marketSource: "FZDUMMY" };
        
        // Turn the key to initialize DataManager
        FZDataManager.initialize(tpConnect);
        
        // Clear any previous handshake error state
        initialSettings.handshakeError = null;
    } catch (err) {
        // Flag the failure on initialSettings so parent components can inspect it
        initialSettings.handshakeError = err?.message || "DataManager handshake failed.";
        
        // Return failure early—do NOT broadcast settings change as valid
        return false;
    }
    *************************************************************************************************************/


    // 3. Signal subscribers only when handshake succeeds
    broadcastSettingsChange();
    return true;
}

/*
export default function GlobalSettingsInitialize_ORIGINAL(minYear, maxYear) {

    if (!initialSettings.isInitialized) {
        Object.assign(initialSettings, new GlobalSettings(minYear, maxYear));
        initialSettings.isInitialized = true;
    }

    // 2. THE ADMIN HANDSHAKE
    try {
        const tpConnect = { marketSource: "FZDUMMY" };
        
        // Turn the key to initialize DataManager
        FZDataManager.initialize(tpConnect);

        if (FZDataManager.DEBUG) {
            console.log("UI: Handshake Sent. DataManager Initialized with FZDUMMY.");
        }
    } catch (err) {
        console.error("UI ERROR: Handshake Failed. Check DataManager paths.", err);
    }

    // 3. Signal subscribers
    broadcastSettingsChange();
}
*/