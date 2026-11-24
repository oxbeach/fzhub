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

import { ActionPanelsRow, BannerRow, ShowcaseRow, ShowcaseStage, QuoteRow } from '../Home/HomeRows_TERSE';
import { IntroductionRow_1, IntroductionRow_2, IntroductionRow_3, IntroductionRow_4, IntroductionRow_5, 
         IntroductionRow_6, IntroductionRow_7, IntroductionRow_8, IntroductionRow_9,
         IntroductionRow_10, IntroductionRow_11, IntroductionRow_12, IntroductionRow_13,
         IntroductionRow_14, IntroductionRow_15, IntroductionRow_16, IntroductionRow_17 } from '../Home/HomeRows_TERSE';

import { NewHome_1, NewHomeGuestRow, NewHomePrivacy, NewHomeDisclosures, NewHomeContact, NewHomeQuotes } from '../Home/HomeRows_TERSE';
         

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

//export const GuestSession = { processed: false, rawData: null };

export const GuestSession = {
  processed: false,
  rawData:   null,
  firstView: false,
  view:      {
    rrTable:      true,
    plot:         true,
    distribution: true,
    compare:      true,
    buysell:      true,
    analyze:      true
  }
};



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

    const [isLoggedIn, setIsLoggedIn]                 = useState(false);
    const [loginEmail, setLoginEmail]                 = useState('Guest');
    const [loginPassword, setLoginPassword]           = useState('');
    const [loginDaysRemaining, setLoginDaysRemaining] = useState('unlimited');

    const [subUseExistingAccount, setSubUseExistingAccount] = useState(false);
    const [subNewEmail, setSubNewEmail]                     = useState('');
    const [subNewPassword, setSubNewPassword]               = useState('');
    const [subNewPassType, setSubNewPassType]               = useState('guest');
    const [subNewAmount, setSubNewAmount]                   = useState('0');

    const [dbStartDate, setDbStartDate]                     = useState(null);
    const [dbEndDate, setDbEndDate]                         = useState(null);
    const [dbPassType, setDbPassType]                       = useState('guest');

    const [isProcessing, setIsProcessing] = useState(false);
    const subPricing                      = calculateSubPricing(dbPassType);

    const [isUnlocked, setIsUnlocked]  = useState(false);
    const [passcode,   setPasscode]    = useState('');

   

    const handlePasscodeSubmit = (e) => {
        e.preventDefault();
        if (passcode === 'canyouhearmenow') { 
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
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder=""
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

        GuestSession.processed = false;
        GuestSession.rawData   = null;
        GuestSession.firstView = false;
        GuestSession.view      = null;
        

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



const handleProceedToPayment_new_final_version = async (checkoutParams, closeCheckoutModal) => {
        const {
            subUseExistingAccount,
            subNewEmail,
            subNewPassword,
            subNewPassType,
            subNewAmount,
            simulateSuccess = true
        } = checkoutParams;

        //setIsProcessing(true);  // this will show the progress bar

        //setIsProcessing(false);     // turn on/off progress bar, turn on Pending card

        //openHelp("payment-processing");

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token || '';

            const res = await fetch('/api/payment', {
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

            /********************************************************************************
            if (data.isSelfRenewal) {
                setDbStartDate(data.newStart);
                setDbEndDate(data.newEnd);
                setDbPassType(subNewPassType);
                setLoginDaysRemaining(data.updatedDaysRemaining);
            }
            ****************************************************************************************/


            if (data.checkoutUrl) {
                window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');

                // Pause execution right here until the user brings focus back to this FZ tab
                await new Promise((resolve) => {
                    const handleFocus = () => {
                        window.removeEventListener('focus', handleFocus);
                        resolve();
                    };
                    window.addEventListener('focus', handleFocus);
                });

                // Now start the progress bar and 10-second countdown
                setIsProcessing(true);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }

            openHelp(data.code, false, false, false);
            closeCheckoutModal?.();

        } catch (error) {
            openHelp('ERR_ACCOUNT_PROCESSING', false, false, true);
        } finally {
            setIsProcessing(false);
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

        setIsProcessing(true);  // show the 10s progress bar

        try {

            //throw new Error('Forced test failure');


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

            // Hold progress bar for 10 seconds to simulate external payment processing
            await new Promise((resolve) => setTimeout(resolve, 10000));

            if (data.isSelfRenewal) {
                setDbStartDate(data.newStart);
                setDbEndDate(data.newEnd);
                setDbPassType(subNewPassType);
                setLoginDaysRemaining(data.updatedDaysRemaining);
            }

            openHelp(data.code, false, false, false);
            //closeCheckoutModal?.();

        } catch (error) {
            openHelp('ERR_ACCOUNT_PROCESSING', false, false, true);
        } finally {
            setIsProcessing(false);  // turn off progress bar after delay (or immediately on error)
            closeCheckoutModal?.();
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
    const [showLibrary, setShowLibrary]             = useState(false);
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

  
    const loadGuestSessionData = async () => {
        try {
            const response = await fetch('/api/guest-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                GuestSession.rawData = result.data;
                return true;
            }

            throw new Error(result.error || 'Invalid guest session payload');
        } catch (err) {
            //alert(' error in guestSession ');
            openHelp('ERR_GUEST_LOAD_FAILURE', false, false, true);
            return false;
        }
        };
        
    const handleEnterClick = async () => {
        if (typeof loginDaysRemaining === 'number' && loginDaysRemaining < 1) {
            return; 
        }

        const guestStatus = !isLoggedIn;

        if (guestStatus && !GuestSession.processed && !Array.isArray(GuestSession.rawData)) {
            const loaded = await loadGuestSessionData();
            //if (!loaded) return;   // will get an error inside loadGuest... and put up error there.
        } else {
            //alert(" Enter Click...already processed or not a guest");
        }

        const minYear = FIRST_FULL_YEAR; 
        const maxYear = guestStatus ? LAST_RESTRICTED_YEAR : LAST_FULL_YEAR;

        const allYears = Array.from(
            { length: maxYear - minYear + 1 }, 
            (_, i) => maxYear - i
        );
        
        repository.setYearData({ allYears, minYear, maxYear });
        GlobalSettingsInitialize(minYear, maxYear);

        setIsGuest(guestStatus);
        setShowLibrary(true);
        setIsHomeActive(false);

        // Inspect the global singleton state in console
        //console.log("Home - initialSettings snapshot:", { ...initialSettings });
    };

    useEffect(() => {
        if (isLoggedIn) {
            handleEnterClick();
        }
    }, []);
 
    const handleCreateAccount = () => setIsCreateModalOpen(true);
    const handleSubscriptions = () => setIsSubscriptionModalOpen(true);



    return (
        <div className="home-root-container" style={{ position: 'relative' }}>

            <ProgressBar isProcessing={isProcessing} countdown={countdown} />

            <div className={`home-dashboard-wrapper ${isHomeActive ? 'is-visible' : 'is-hidden'}`}>
                <BannerRow />
                
                <ActionPanelsRow 
                    isLoggedIn          ={isLoggedIn}
                    loginEmail          ={loginEmail}
                    daysRemaining       ={loginDaysRemaining}
                    handleLogin         ={handleLogin}
                    handleLogout        ={handleLogout}
                    handleManageAccount ={handleManageAccount}
                    handleSubscriptions ={handleSubscriptions}
                    handleCreateAccount ={handleCreateAccount}
                    handleEnterClick    ={handleEnterClick}
                    openHelp            ={openHelp}
                />

                
                {/*
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
                */}
                

                <NewHome_1
                    topic      = 'rolling-matrix'
                    text       = "THE ROLLING MATRIX \u2122 calculates all possible combinations of rolling returns using up to 30 years of a portfolio's CAGR (Compound Annual Growth Rate)."
                    helpTopics ={helpTopics}
                    setActiveShowcaseKey={setActiveShowcaseKey}
                />
                <NewHome_1
                    topic      = 'distribution-plot'
                    text       = "DISTRIBUTION AND CUMULATION HISTOGRAMS show two views of Rolling Matrix values.  Up to three portfolios can be compared simultaneously."
                    helpTopics ={helpTopics}
                    setActiveShowcaseKey={setActiveShowcaseKey}
                />

                <NewHomeGuestRow
                    isLoggedIn={isLoggedIn}
                    handleEnterClick={handleEnterClick}
                />

                 <NewHome_1
                    topic      = 'buysell-matrix'
                    text       = "THE BUY/SELL MATRIX calculates all possible combinations of buying and selling a portfolio using up to 30 years of CAGR."
                    helpTopics ={helpTopics}
                    setActiveShowcaseKey={setActiveShowcaseKey}
                />


                <NewHome_1
                    topic      = 'comparison-plot'
                    text       = "COMPARE creates a scatter plot of CAGR pairs across all years and rolling periods of two portfolios.  Up to four plots are produced to show 4 portfolio pairings simultaneously."
                    helpTopics ={helpTopics}
                    setActiveShowcaseKey={setActiveShowcaseKey}
                />
                <NewHome_1
                    topic      = 'rank'
                    text       = "RANK compares Rolling Matrix statistics across multiple portfolios. FZ FACTOR™ is a custom weighted average that combines user-selected statistics."
                    helpTopics ={helpTopics}
                    setActiveShowcaseKey={setActiveShowcaseKey}
                />
                <NewHome_1
                    topic      = 'analyze-plot'
                    text       = "PLOT AND ANALYZE graph Rolling Matrix CAGR, statistics, and risk metrics across all years and rolling return periods."
                    helpTopics ={helpTopics}
                    setActiveShowcaseKey={setActiveShowcaseKey}
                />
                
                <NewHomePrivacy />
                <NewHomeDisclosures />
                <NewHomeContact />   
                <NewHomeQuotes />
          
                

                <ShowcaseStage 
                    activeShowcaseKey={activeShowcaseKey}
                    helpTopics={helpTopics}
                />
            </div>

            <div className={`library-wrapper ${!isHomeActive ? 'is-visible' : 'is-hidden'}`}>
                <LibraryUI 
                    showLibrary={showLibrary}
                    setShowLibrary={setShowLibrary}
                    onGoHome={() => {
                        setShowLibrary(false);
                        setIsHomeActive(true);
                    }}
                    repository          ={repository}
                    updateRepository    ={updateRepository}
                    symbolList          ={symbolList}
                    isGuest             ={isGuest}
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
                isOpen     ={isSubscriptionModalOpen}
                isLoggedIn ={isLoggedIn}
                onClose    ={() => setIsSubscriptionModalOpen(false)}
                subPricing ={subPricing}
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