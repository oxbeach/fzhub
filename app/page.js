'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../Utils/supabase';

import { LAST_FULL_YEAR, LAST_RESTRICTED_YEAR, FIRST_FULL_YEAR } from '../app/api/utils/constants';
import { daysRemaining } from '../app/api/utils/general';

import { processDummyPayment } from '../Home/Payment/ProcessPayment_Dummy';



import { initialSettings } from './GlobalSettings';



import GlobalSettingsInitialize from './GlobalSettingsInitialize';
import LibraryUI from './LibraryUI';
import { GlobalRepository } from '../Utils/GlobalRepository';
import { LoginModal } from '../Home/LoginModal';
import { AccountModal } from '../Home/AccountModal';
import { SubscriptionModal } from '../Home/SubscriptionModal';
import { CheckoutModal } from '../Home/CheckoutModal';
import { ManageAccountModal } from '../Home/ManageAccountModal'; // <-- Added Import for Manage Account Modal
import { ProgressBar, ProgressCountdown } from '../Utils/ProgressBar';
import { updateSubscription } from '../Utils/Math';

import { ActionPanelsRow, BannerRow, ShowcaseRow, ShowcaseStage, QuoteRow } from '../Home/HomeRows';
import { IntroductionRow_1, IntroductionRow_2, IntroductionRow_3, IntroductionRow_4, IntroductionRow_5, 
         IntroductionRow_6, IntroductionRow_7, IntroductionRow_8, IntroductionRow_9,
         IntroductionRow_10, IntroductionRow_11, IntroductionRow_12, IntroductionRow_13,
         IntroductionRow_14, IntroductionRow_15, IntroductionRow_16, IntroductionRow_17 } from '../Home/HomeRows';

// Help System Hook (provider is now in layout.js)
import { useHelp } from '../Help/HelpContext';

import '../Home/Homepage.css';
import { fetchSymbolList } from '../src/DataManagement/fetchSymbolList';

import '../Styles/Buttons/PrimaryActions.css'; 
import './Style_Home.css';
import '../Styles/Global/global-charts.css';
import '../Styles/Global/Define.css';
import '../Styles/Global/Style_Library.css';
import '../Styles/Global/General.css';
import '../Styles/Global/Buttons.css';
import '../Styles/Global/Ellipsis.css';
import '../Styles/Global/GlobalControl.css';
import '../Styles/Global/Help.css';
import '../Styles/Global/Hint.css';
import '../Styles/Global/Home.css';
import '../Styles/Global/File.css';
import '../Styles/Global/Subscription.css';
import '../Styles/Login.css';

const monthPrice = 30;
const yearPrice = 150;

const calculateSubPricing = (dbPassType) => {
    const isMonthPass = dbPassType === 'month' || dbPassType === '30_day';
    if (isMonthPass) {
        return {
            monthPrice: monthPrice,
            yearPrice: yearPrice - monthPrice,
            canUpgrade: true
        };
    }
    return {
        monthPrice: monthPrice,
        yearPrice: yearPrice,
        canUpgrade: false
    };
};

const SHOWCASE_KEYS = [
    'rolling-matrix',
    'distribution-plot',
    'comparison-plot',
    'rank',
    'analyze-plot'
];

export default function Home() {
    const { openHelp, helpTopics } = useHelp();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginEmail, setLoginEmail] = useState('Guest');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginDaysRemaining, setLoginDaysRemaining] = useState('unlimited');

    const [subUseExistingAccount, setSubUseExistingAccount] = useState(false);
    const [subNewEmail, setSubNewEmail] = useState('');
    const [subNewPassword, setSubNewPassword] = useState('');
    const [subNewPassType, setSubNewPassType] = useState('guest');
    const [subNewAmount, setSubNewAmount] = useState('0');

    const [dbStartDate, setDbStartDate] = useState(null);
    const [dbEndDate, setDbEndDate] = useState(null);
    const [dbPassType, setDbPassType] = useState('guest');

    const [isProcessing, setIsProcessing] = useState(false);
    const subPricing = calculateSubPricing(dbPassType);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passcode,   setPasscode]    = useState('');

    const handlePasscodeSubmit = (e) => {
        e.preventDefault();
        if (passcode === 'canyouhearmenow') { // Change to your password
        setIsUnlocked(true);
        }
    };
    // UC GATE
  if (!isUnlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif'
      }}>
        <form onSubmit={handlePasscodeSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            autoFocus
            style={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              color: '#f9fafb',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              outline: 'none'
            }}
          />

          {/*
          <button
            type="submit"
            style={{
              backgroundColor: '#f9fafb',
              color: '#111827',
              fontWeight: '600',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Enter
          </button>
          */}
        </form>
      </div>
    );
  }



    const handleLoginSuccess = async (success, userAuthData) => {
        if (!success || !userAuthData) return;

        const { 
            email, 
            password, 
            subscriptionStart, 
            subscriptionEnd, 
            subscriptionType 
        } = userAuthData;

        const numRemaining = daysRemaining(subscriptionEnd);

        setLoginEmail            (email || 'Guest');
        setLoginPassword         (password || '');
        setLoginDaysRemaining    (numRemaining);
        setSubUseExistingAccount (true);
        setDbStartDate           (subscriptionStart || null);
        setDbEndDate             (subscriptionEnd || null);
        setDbPassType            (subscriptionType || 'guest');
           
        setIsLoggedIn(true);

        if (numRemaining === -1) {
            openHelp('ERR_SUBSCRIPTION_DATES', false, false, true);
        } else if (numRemaining < 1) {
            openHelp('ERR_SUBSCRIPTION_EXPIRED', false, false, true);
        } 

    };

    const handleProceedToPayment = async (checkoutParams, closeCheckoutModal) => {
        const {
            subUseExistingAccount,
            subNewEmail,
            subNewPassword,
            subNewPassType,
            subNewAmount,
            simulateSuccess = true
        } = checkoutParams;

        setIsProcessing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token || '';

            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({                        
                    subUseExistingAccount,
                    subNewEmail,
                    subNewPassword,
                    subNewPassType,
                    subNewAmount,
                    simulateSuccess
                })
            });

            const data = await res.json();
            if (!res.ok) {
                const errorCode = data?.code || 'ERR_ACCOUNT_PROCESSING';
                openHelp(errorCode, false, false, true);
                return;
            }

            if (data.isSelfRenewal) {
                setDbStartDate(data.newStart);
                setDbEndDate(data.newEnd);
                setDbPassType(subNewPassType);
                setLoginDaysRemaining(data.updatedDaysRemaining);
            }

            openHelp(data.code, false, false, false);
            closeCheckoutModal?.();

        } catch (error) {
            openHelp('ERR_ACCOUNT_PROCESSING', false, false, true);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAccountCheckoutSubmit = (checkoutData, closeCreateModal, openCheckoutModal) => {
        if (checkoutData) {
            setSubNewEmail(checkoutData.email);
            setSubNewPassword(checkoutData.password);
            setSubNewPassType(checkoutData.passType);
            setSubNewAmount(checkoutData.amount);
            setSubUseExistingAccount(checkoutData.useExistingAccount);
        }
        closeCreateModal?.();
        openCheckoutModal?.();
    };

    const handleEmailUpdated = (newEmail) => {
        setLoginEmail(newEmail);
    };




    return (
        <HomeContent 
            key={loginEmail}
            isLoggedIn                 ={isLoggedIn}
            loginEmail                 ={loginEmail}
            loginDaysRemaining         ={loginDaysRemaining}
            subUseExistingAccount      ={subUseExistingAccount}
            subNewEmail                ={subNewEmail}
            subNewPassword             ={subNewPassword}
            subNewPassType             ={subNewPassType}
            subNewAmount               ={subNewAmount}
            dbPassType                 ={dbPassType}
            subPricing                 ={subPricing}
            isProcessing               ={isProcessing}
            handleLoginSuccess         ={handleLoginSuccess}
            handleProceedToPayment     ={handleProceedToPayment}
            handleAccountCheckoutSubmit={handleAccountCheckoutSubmit}
            handleEmailUpdated         ={handleEmailUpdated}
        />
    );
}

function HomeContent({ 
    isLoggedIn, 
    loginEmail, 
    loginDaysRemaining, 
    subUseExistingAccount, 
    subNewEmail, 
    subNewPassword, 
    subNewPassType, 
    subNewAmount, 
    dbPassType, 
    subPricing,
    isProcessing,
    handleLoginSuccess,
    handleProceedToPayment,
    handleAccountCheckoutSubmit,
    handleEmailUpdated
}) {
    const { openHelp, helpTopics } = useHelp();

    const [symbolList, setSymbolList] = useState([]);

    const loadSymbols = async () => {
        try {
            const symbols = await fetchSymbolList(isLoggedIn);

            if (symbols.length === 1) {
                //openHelp('ERR_SYMBOL_FAILURE', false, false, true);
            }
            setSymbolList(symbols);
        } catch (err) {
             //openHelp('ERR_SYMBOL_FAILURE', false, false, true);
        }
    };

    useEffect(() => {
        loadSymbols();
    }, [isLoggedIn, loginDaysRemaining]);

    const [activeShowcaseKey, setActiveShowcaseKey] = useState(null);
    const [isHomeActive, setIsHomeActive]           = useState(true);
    const [isGuest, setIsGuest]                     = useState(true);
    const [showLibrary, setShowLibrary]             = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen]   = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isManageAccountModalOpen, setIsManageAccountModalOpen] = useState(false); // <-- Added State for Manage Account Modal

  
    const countdown = ProgressCountdown(isProcessing);
    
    const [repository, setRepository] = useState(() => new GlobalRepository());

    const updateRepository = (key, value) => {
        setRepository(prevRepo => {
            const nextRepo = new GlobalRepository(prevRepo.serialize());
            nextRepo[key] = value;
            return nextRepo;
        });
    };

    const handleLogin = () => setIsLoginModalOpen(true);

    const handleRenewalLogin = () => {
        setIsCreateModalOpen(false);
        setIsLoginModalOpen(true);
    }
        

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/'; 
    };

    const handleManageAccount = () => setIsManageAccountModalOpen(true);

  
   
    const handleEnterClick = () => {
        if (typeof loginDaysRemaining === 'number' && loginDaysRemaining < 1) {
            return; 
        }

        const guestStatus = !isLoggedIn;
        setIsGuest(guestStatus);

        const minYear = FIRST_FULL_YEAR; 
        const maxYear = guestStatus ? LAST_RESTRICTED_YEAR : LAST_FULL_YEAR;

        const allYears = Array.from(
            { length: maxYear - minYear + 1 }, 
            (_, i) => maxYear - i
        );

        
        //alert(' handle enter click');

        repository.setYearData({ allYears, minYear, maxYear });
        GlobalSettingsInitialize(minYear, maxYear);
        setIsHomeActive(false);


        // Inspect the global singleton state in console
        console.log("Home - initialSettings snapshot:", { ...initialSettings });
    };
 
    const handleCreateAccount = () => setIsCreateModalOpen(true);
    const handleSubscriptions = () => setIsSubscriptionModalOpen(true);

    return (
        <div className="home-root-container" style={{ position: 'relative' }}>

            <ProgressBar isProcessing={isProcessing} countdown={countdown} />

            <div className={`home-dashboard-wrapper ${isHomeActive ? 'is-visible' : 'is-hidden'}`}>
                <BannerRow />
                
                <ActionPanelsRow 
                    isLoggedIn={isLoggedIn}
                    loginEmail={loginEmail}
                    daysRemaining={loginDaysRemaining}
                    handleLogin={handleLogin}
                    handleLogout={handleLogout}
                    handleManageAccount={handleManageAccount}
                    handleSubscriptions={handleSubscriptions}
                    handleCreateAccount={handleCreateAccount}
                    handleEnterClick={handleEnterClick}
                    openHelp={openHelp}
                />

                <ShowcaseRow 
                    showcaseKeys={SHOWCASE_KEYS}
                    helpTopics={helpTopics}
                    setActiveShowcaseKey={setActiveShowcaseKey}
                />

                <IntroductionRow_10 />   
                <IntroductionRow_7 />   
                
                <IntroductionRow_13 />   
                <IntroductionRow_14 />     
                <IntroductionRow_15 />     
                <IntroductionRow_12 />   
               
                <IntroductionRow_16 />   

                <IntroductionRow_5 />
                <IntroductionRow_4 />
                <IntroductionRow_17 />   
                <IntroductionRow_8 />    

                <ShowcaseStage 
                    activeShowcaseKey={activeShowcaseKey}
                    helpTopics={helpTopics}
                />
            </div>

            <div className={`library-wrapper ${!isHomeActive ? 'is-visible' : 'is-hidden'}`}>
                <LibraryUI 
                    showLibrary={showLibrary}
                    setShowLibrary={setShowLibrary}
                    onGoHome={() => setIsHomeActive(true)}
                    repository={repository}
                    updateRepository={updateRepository}
                    symbolList={symbolList}
                    isGuest={isGuest}
                />
            </div>

            <LoginModal 
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onSuccess={handleLoginSuccess}
            />

            <AccountModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
                subPricing={subPricing}
                handleRenewalLogin={handleRenewalLogin}
                loginEmail={loginEmail}
                isLoggedIn={isLoggedIn}
                onProceedToCheckout={(checkoutData) => handleAccountCheckoutSubmit(
                    checkoutData, 
                    () => setIsCreateModalOpen(false), 
                    () => setIsCheckoutModalOpen(true)
                )}
            />
           
            <SubscriptionModal 
                isOpen={isSubscriptionModalOpen}
                onClose={() => setIsSubscriptionModalOpen(false)}
                subPricing={subPricing}
                onEnterGuestMode={() => {
                    setIsSubscriptionModalOpen(false);
                    handleEnterClick();
                }}
            />

            <CheckoutModal 
                isOpen={isCheckoutModalOpen}
                selectedPass={subNewPassType}
                amount={subNewAmount}
                onClose={() => setIsCheckoutModalOpen(false)}
                onBack={() => {
                    setIsCheckoutModalOpen(false);
                    handleCreateAccount();
                }}
                onProceedToPayment={() => {
                    handleProceedToPayment(
                        {
                            subUseExistingAccount,
                            subNewEmail,
                            subNewPassword,
                            subNewPassType,
                            subNewAmount,
                            simulateSuccess: true
                        },
                        () => setIsCheckoutModalOpen(false)
                    );
                }}
            />

            {/* --- MANAGE ACCOUNT MODAL (DUMMY MOCK) --- */}
            <ManageAccountModal 
                isOpen={isManageAccountModalOpen}
                onClose={() => setIsManageAccountModalOpen(false)}
                handleEmailUpdate={handleEmailUpdated}
            />
        </div>
    );
}