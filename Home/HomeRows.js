
import React, { useRef } from 'react';

//import { FzLogo3d } from '../Utils/Logo/FzLogo3d';
import { FzLogoFlat } from '../Utils/Logo/FzLogoFlat';
import { Hint }       from '../Help/Hint';

export function BannerRow() {
  return (
    <header className="top-banner-container">
      <FzLogoFlat className="banner-logo" />
      <p className="banner-text">
        Analysis for long-term investing: revealing buy/hold performance patterns hiding behind dense charts, annoying statistics, and volatile&nbsp;markets.
      </p>
    </header>
  );
}


// ROW 1: ACTION PANELS
export function ActionPanelsRow({
  isLoggedIn,
  loginEmail,
  daysRemaining,
  handleLogin,
  handleLogout,
  handleManageAccount,
  handleSubscriptions,
  handleCreateAccount,
  handleEnterClick,
  openHelp
}) {

  // className="basic-3d-button logout home-card-btn"   
  // className="basic-3d-button home-card-btn enter"

  // Check if subscription is expired (numeric daysRemaining < 1)
  const isExpired = typeof daysRemaining === 'number' && daysRemaining < 1;

  const userDisplay = isLoggedIn ? loginEmail : 'Guest';
  const daysDisplay = isLoggedIn ? daysRemaining : 'unlimited';
  
  return (
    <div className="home-panels-container">
      {/* CARD 1: Swappable Guest / Account Panel */}
      <div className="global-settings-container home-action-card">


      <div className={`login-credentials ${isLoggedIn ? 'login-credentials-highlight' : ''}`}>

        <div className="account-status-display">
          <div className="user-email-container" title={userDisplay}>
              <strong>User:</strong> <span className="login-name">{userDisplay}</span>
          </div>
            <p><strong>Days until expiration:</strong> {daysDisplay}</p>
        </div>
      
      </div>





        <div className="home-card-button-group">

          {isLoggedIn ? (
            <Hint text="Log out of this session.  Unsaved work will be lost." position="bottom">
              <button
              className="basic-3d-button home-card-btn logout-highlight"  
              onClick={handleLogout}>
                Log Out
              </button>
          </Hint>
          ) : (
            <Hint text="Log in as a subscriber" position="bottom">
              <button 
              className="basic-3d-button home-card-btn"  
              onClick={handleLogin}>
                Log In
              </button>
            </Hint>
          )}
         
          <Hint text="Edit account credentials" position="bottom">
            <button 
              className="basic-3d-button home-card-btn"
              onClick={handleManageAccount} 
              disabled={!isLoggedIn}
            >
              Manage Account
            </button>
          </Hint>
        </div>
      </div>

      

      {/* CARD 3: Getting Started Panel */}
      <div className="global-settings-container home-action-card">
        <div className="login-credentials">
          <p><strong>Access</strong></p>
          <p><strong>Free Guest or Subscriber</strong></p>
        </div>
        <div className="home-card-button-group">
         


          <Hint text="Enter FZ workspace as a subscriber or guest" position="bottom">
            <button 
              className={`basic-3d-button home-card-btn ${isExpired ? 'disabled' : ''}`}
              onClick={handleEnterClick}
              disabled={isExpired}
              style={isExpired ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <span className="enter-btn-text-normal">Enter</span>
              <span className="enter-btn-text-accent">FZ</span>
              <span className="enter-btn-text-normal">Workplace</span>
            </button>
          </Hint>  

          <Hint text="Overview of FZ and navigation tips" position="bottom">
            <button 
              className="basic-3d-button home-card-btn"
              onClick={() => openHelp('get-started')}
            >
              Overview
            </button>
          </Hint>


        </div>
      </div>

      {/* CARD 2: Subscription Panel */}
      <div className="global-settings-container home-action-card">
        <div className="login-credentials">
            <p><strong>Subscriptions</strong></p>
            <p><strong>New or Renewal</strong></p>
        </div>     
        <div className="home-card-button-group">
          <Hint text="Subscribers can renew a subscription.  Guests can start a new subscription. " position="bottom">
            <button 
              className="basic-3d-button home-card-btn"
              onClick={handleCreateAccount} 
            >
              Sign up | Renew
            </button>
          </Hint>

          <Hint text="Subscription details" position="bottom">
            <button 
              className="basic-3d-button home-card-btn"
              onClick={handleSubscriptions} 
            >
              Details
            </button>
          </Hint>
        </div>
      </div>

    </div>
  );
}



  // ROW 2: INTRODUCTION ROW
export function IntroductionRow_ORIGINAL() {
  return (
    <div className="home-intro-container">
      <p>
        Traditional financial charts obscure real entry and exit risks. FZ was built to solve three core challenges:
      </p>

      <ol className="intro-challenges-list">
        <li>
          <strong>Uncovering Real Holding Period Performance:</strong> The Rolling Matrix analyzes all 465 buy-and-hold combinations across a 30-year span to show your true distribution of outcomes.
        </li>
        <li>
          <strong>Personalized Portfolio Ranking:</strong> The FZ Factor condenses multi-variable statistics into a single intuitive rank based on the metrics that matter most to you.
        </li>
        <li>
          <strong>Bringing Dead Statistics to Life:</strong> FZ replaces raw data avalanches with color-mapped heatmaps and targeted plots so you can spot hidden patterns instantly.
        </li>
      </ol>

      <p className="intro-cta-prompt">
        <strong>Explore the Platform:</strong> Take a quick guided Tour to see FZ in action, or continue as a Guest to start analyzing portfolios right away. Hover over the thumbnails below for interactive previews.
      </p>

      <p>
        While past data doesn{"'"}t guarantee future results, every strategy relies on historical odds. FZ shows you how investments actually recover across real holding periods—giving you the true bottom line.
      </p>

      <p className="intro-disclaimer">
        Financial Zone is a self-directed education platform, not a financial advisor. All investment decisions should be made with the assistance of a professional money manager.
      </p>
    </div>
  );
}


export function IntroductionRow_1() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Uncovering Real Holding Period Performance</h2>
      <p className="home-intro-text">
        Traditional financial charts only show point-in-time performance—obscuring what actually happens 
        if you buy or sell at different moments in a market cycle. FZ solves this with the Rolling Matrix, 
        analyzing every possible buy-and-hold combination across a 30-year span (all 465 holding periods). 
        Instead of relying on a single start date, you see your true distribution of outcomes, realistic 
        recovery times, and risk profiles across real market history.
      </p>

    <p className="home-intro-text">
      drawdown stat limitations.  CAGR is a ..., this shows much more than how much is lost.  it shows
      the recovery.  All portfolios go thru down times.  Most important, how do they recover: how soon do
      you get back to even and continue advancing.
    </p>

    </div>
  );
}







export function IntroductionRow_2() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Personalized Portfolio Ranking</h2>
      <p className="home-intro-text">
        Comparing multiple investment strategies across scattered spreadsheets leads to data fatigue. 
        FZ condenses multi-variable statistics—including CAGR, max drawdowns, Sharpe ratios, and holding 
        period consistency—into a single, customizable metric called the FZ Factor. You can weigh the 
        metrics that matter most to your personal strategy and rank complex multi-asset portfolios instantly.
      </p>
    </div>
  );
}



export function IntroductionRow_3() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Bringing Dead Statistics to Life</h2>
      <p className="home-intro-text">
        Raw numbers rarely tell a clear and understandable story. Financial Zone converts overwhelming data  
        into color-mapped heatmaps, interactive scatter plots, and targeted distribution charts. 
        By visually encoding performance metrics, you can spot hidden return patterns, evaluate 
        risk clusters, and make better informed allocation decisions at a glance.
      </p>
    </div>
  );
}

export function IntroductionRow_4() {
  return (
    <div className="home-intro-card highlight-card">
      <h2 className="home-intro-title">Disclosures</h2>
      
      <p className="home-intro-text">
        Financial Zone is designed as a self-directed educational tool to analyze historical data, not as an automated trading platform or
         personalized financial advisory service. While historical patterns help evaluate holding period behavior, past performance does not guarantee future results.
          All investment strategies should be reviewed in consultation with a professional financial advisor.
      </p>
    </div>
  );
}

export function IntroductionRow_5() {
  return (
    <div className="home-intro-card highlight-card">
      <h2 className="home-intro-title">Privacy and Security</h2>
      
      <p className="home-intro-text">
        Financial Zone does not collect, track, or store credit card credentials, payment account details, or personal financial information.
        All payment transactions are handled solely and securely by an independent, unaffiliated third-party processor.
      </p>
    </div>
  );
}

export function IntroductionRow_6() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Analysis Goals</h2>

    <p>
    Traditional financial charts paint a deceptively simple picture: over decades, the market goes up. What those static charts
      neglect are the painful dips and recovery periods between your actual entry and exit dates. 
      That long-term upward trend doesn't help when you need to withdraw funds in the middle of a downturn—and
      you have no way of knowing whether
      that market decline will turn around or get worse. Financial Zone was built from the
        ground up to focus on two core challenges and reveal patterns that are hiding behind mounds of data:

    1. Uncovering Real Holding Period Performance: The Rolling Return Matrix reveals how portfolios behaved across every historical buy and sell window—showing true behavior in good markets, bad markets, and inevitable downturns.

    2. Personalized Portfolio Ranking: The FZ Factor condenses complex multi-variable statistics into a single intuitive number, allowing you to rank and compare portfolios based strictly on the metrics that matter most to you.

    Rolling Matrix: for 15 year history, 120 combinations, 30 year history 465 combinations

    FZ Factor: ranking system produce a single number to compare portfolios.  using only statistics that are important to the individual investor.

    Viualiation thru heatmaps that use color extensively.  this reveals patterns that raw numbers obscure.  Instantly giving a good grasp
    of how portfolios perform over time.  This is critical to determining how an portfolio recovers in a volatile market.

    </p>





      <ol className="intro-challenges-list">
        <li>
          buy/hold combinations
        </li>
        <li>
          FZ Factor
        </li>
        <li>
          Visualization using color heatmap
        </li>
      </ol>
    </div>
  );
}

export function IntroductionRow_7() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">History vs. Predictions</h2>
      <p className="home-intro-text space-below ">
        Investors often get bogged down chasing complex statistics, searching for the few metrics that might magically predict future performance.
         But actual compounded returns incorporate all of those statistics into the true bottom line.  Past performance does not guarantee future results, 
         and FZ does not claim otherwise.  Yet short of throwing darts, every strategy relies on historical performance, whether through hard statistical
          numbers or a manager's track record.
           </p>
           
            <p className="home-intro-text">
            Financial Zone ignores speculative predictions and focuses on how investments actually performed and recovered across any holding period or entry date.
      </p>
    </div>
  );
}

export function IntroductionRow_8() {
  const quotes = [
    {
      text: "I can calculate the motion of heavenly bodies, but not the madness of people.",
      author: "Isaac Newton"
    },

    {
      text: "The premise that a person can sit down, crunch some numbers, and accurately predict what an irrational crowd of terrified or euphoric humans will do with their money next week is one of the great delusions of our species.",
      author: "Morgan Housel"
    },

    {
      text: "Wall Street indexes have predicted nine of the last five recessions.",
      author: "Paul Samuelson"
    },

    {
      text: "The broad pattern of market action in the past is the best guide to the future—but it is not an infallible guide.",
      author: "Benjamin Graham"
    },
    {
      text: "If you aren't thinking about owning a stock for 10 years, don't even think about owning it for 10 minutes.",
      author: "Warren Buffett"
    },
    
    {
      text: "Far more money has been lost by investors preparing for corrections, or trying to anticipate corrections, than has been lost in corrections themselves.",
      author: "Peter Lynch"
    },
    {
      text: "In the short run, the market is a voting machine, but in the long run, it is a weighing machine.",
      author: "Benjamin Graham"
    },
    {
      text: "Don't look for the needle in the haystack. Just buy the haystack.",
      author: "Jack Bogle"
    },
    {
      text: "We have long felt that the only value of stock forecasters is to make fortune-tellers look good.",
      author: "Warren Buffett"
    },
    {
      text: "Over the very long run, it is the economics of investing—enterprise—that has determined total return; the evanescent emotions of investing—speculation—have ultimately proven to be virtually meaningless.",
      author: "Jack Bogle"
    }
  ];

  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Quotes</h2>
      
      {quotes.map((item, index) => (
        <p key={index} className="home-intro-text space-below">
          "{item.text}" — <span className="quote-author">{item.author}</span>
        </p>
      ))}
    </div>
  );
}

export function IntroductionRow_9() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Two Ways to Explore</h2>
      
        <p className="home-intro-text">Get Started with an "Overview" of FZ analysis tools and capabilites. </p>
      
        <p>"Enter FZ Workplace" as a Free Guest and you can use all of FZ tools.  You will be restricted to historical data up to 2020 and unable to save any of your work.</p>
      
    </div>
  );
}

export function IntroductionRow_10_original() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Introduction</h2>
      
        <p className="home-intro-text space-below">
          Traditional financial charts paint a deceptively simple picture: over decades,
           the market goes up. What static charts gloss over are the painful dips, real-world entry and exit dates, 
           and recovery times during inevitable downturns. A long-term upward trend doesn't help when you need funds during an unexpected market decline.</p>

        <p className="home-intro-text space-below">To explore FZ, select <strong>"Overview"</strong> to tour our analysis tools and capabilities, 
          or <strong>"Enter FZ Workplace"</strong> as a Free Guest to access all features. Guests are restricted to  historical data up to 2020 and
          cannot save any work.</p>

        <p className="home-intro-text">
        Hover over any of the thumbnail images above to preview a sample of what FZ produces.
        </p>
      
      
    </div>
  );
}

export function IntroductionRow_10() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Introduction</h2>
      
      <p className="home-intro-text space-below">
        Traditional financial charts paint a deceptively simple picture: over decades, the market goes up.
         What static charts gloss over are the painful dips, real-world entry and exit dates, and recovery times
          during inevitable downturns. A long-term upward trend is little solace when you need to liquidate a portfolio during an unexpected market decline.
          Financial Zone (FZ) shows historical trends and how a portfolio has reacted before, during, and after market declines.
      </p>

      <p className="home-intro-text space-below">
        Financial Zone is built specifically for long-term investing. Using up to 30 years of historical data,
         FZ analyzes every possible buy/hold period to uncover true holding patterns, return consistency, and risk exposure.
      </p>

      <p className="home-intro-text space-below">
        Select <strong>"Overview"</strong> to review our analysis tools, capabilities, and site navigation tips.  Select <strong>"Enter FZ Workplace"</strong> as
         a Free Guest to try all of the analysis features. Guests cannot save work, and their historical data excludes the most recent five years.
         Subscribers get the full data range and can save their work.
      </p>

      <p className="home-intro-text">
        Hover over any of the thumbnail images above to preview a sample of what FZ produces.
      </p>
    </div>
  );
}




export function IntroductionRow_11() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Key Analysis Features</h2>
      
      <p className="home-intro-text">
       The Rolling Return Matrix: Evaluates every buy/sell window across 15-year (120 periods) and 30-year (465 periods) spans
        to reveal realistic probability of success, drawdown limits, and recovery times.
      </p>

      <p className="home-intro-text">
      Color Heatmaps & Dynamic Visualization: Converts dense financial statistics into visual heatmaps, scatter plots,
      and distribution charts. Color encoding brings "dead statistics" to life, letting you spot return patterns and risk clusters instantly.
      </p>

    <p className="home-intro-text">
      The FZ Factor: A customizable ranking system that condenses complex portfolio metrics into a single score based
      strictly on the parameters that matter most to individual investors.
      </p>

    <p className="home-intro-text">
      Historical Probability vs. Market Timing: Rather than chasing predictive magic numbers or short-term noise,
      FZ leverages total compounded return (CAGR) across real historical windows to evaluate true resilience.
      </p>
            
    </div>
  );
}

export function IntroductionRow_12() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Rank</h2>
      
      <p className="home-intro-text space-below">
        Evaluating multiple portfolios usually requires flipping between tabs to compare disparate statistics—a cumbersome process for two portfolios,
         and nearly impossible for five. The Rank feature consolidates all portfolio metrics into a single comparison table,
          ranking each statistic from 1 (best) to <em>N</em> (worst) across <em>N</em> portfolios.
      </p>

      <p className="home-intro-text">
       This is where the FZ Factor completes the picture. A table shows each portfolio's individual statistics and ranks alongside its FZ Factor,
        so comparisons are tailored to your preferences. The portfolio with the FZ Factor closest to 1 aligns best with your strategy.
      </p>
    </div>
  );
}

export function IntroductionRow_13() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Compound Annual Growth Rate</h2>
      
      <p className="home-intro-text space-below">
      Compound Annual Growth Rate (CAGR) is the foundation of Financial Zone. It is a pure mathematical calculation: the single constant annual rate at
       which capital would have to compound to turn its starting value into its actual ending value. Unlike a simple average of yearly returns,
        it accounts for the way losses compound.
      </p>

      <p className="home-intro-text">
        A single CAGR smooths a journey into one number, so FZ doesn’t stop at one number. It calculates CAGR for every possible buy/hold period
         (up to a maximum of 30 years) and presents the results in heatmaps, charts, and plots instead of a table of numbers.
          Across all entry and exit dates, you can see how an investment behaves, absorbs losses, and recovers.
      </p>

    </div>
  );
}


export function IntroductionRow_14() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Rolling Matrix{'\u2122'}</h2>
      
      <p className="home-intro-text space-below">
        FZ analyzes every possible buy/hold period using CAGR. For a 15-year history, that means fifteen 1-year periods, fourteen 2-year periods,
         thirteen 3-year periods, and so on. For a history running from 2011 through 2025, one 3-year period might run from Jan 2012 through Dec 2014,
          while another runs from Jan 2021 through Dec 2023. In total, a 15-year history yields 120 unique combinations, and a 30-year history yields 465.
      </p>

      <p className="home-intro-text space-below">
        FZ has developed the Rolling Matrix{'\u2122'} to capture all of these combinations across your selected timeframe (maximum 30 years) and to render them as
         an intuitive heatmap table. That is a lot of cells, so color does the reading for you: instead of scanning hundreds of numbers, you see at a
          glance where returns were strong, weak, or consistent. Statistics computed from the matrix are presented as interactive charts and plots,
           turning raw data into reports that are easy to read.
      </p>
      <p className="home-intro-text space-below">
     The matrix is also a diagnostic tool, focusing your attention on specific timeframes, such as the 2008 financial crisis or the 2020 pandemic crash, 
     so you can dig deeper into the underlying numbers. Hover over any cell to see the details of that CAGR, including the return, the buy and sell dates,
      and the hold time. You can also refine the portfolio or its start and end dates at any time, and a new matrix is computed instantly, 
      so you can target the specific years that interest you.
      </p>

     
    </div>
  );
}

export function IntroductionRow_15() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">FZ Factor{'\u2122'}</h2>
      
      <p className="home-intro-text space-below">
       FZ computes a set of statistics for every portfolio, including success rate, average and median return, standard deviation, and the Sharpe and Sortino ratios.
        The FZ Factor{'\u2122'} combines them into a single score. You choose the statistics that matter to you and assign a weight to each. 
        FZ ranks your portfolios from 1 to N on every selected statistic, with 1 being best, and a portfolio's FZ Factor is the weighted average of those ranks.
         The closer to 1, the better the portfolio matches your priorities.
      </p>

      <p className="home-intro-text">
       The FZ Factor does not impose a fixed, one-size-fits-all rating. Instead, you decide which statistics matter and how much, so the score reflects
        your own investment strategy.
      </p>
    </div>
  );
}


export function IntroductionRow_16() {
  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Data Rules & Methodology</h2>
      
      <p className="home-intro-text space-below">
        Financial Zone relies on historical market data provided by an independent, unaffiliated third party.
         To keep portfolio comparisons clean, accurate, and relevant for long-term investors,
          FZ applies strict baseline ingestion rules across its entire database.
      </p>

      {/*
      <p className="home-intro-text space-below">
        <strong>Total Returns:</strong> All calculations use adjusted closing prices, which capture stock splits,
         dividend reinvestments, and capital distributions.
      </p>
      */}

      <p className="home-intro-text space-below">
        <strong>Full-Year Periods:</strong> Returns for active assets are calculated on a year-to-year basis using the last trading day of each calendar year.
         Partial inception years and current incomplete years are excluded.  FZ data updates once annually, during the first days of each new year.
      </p>

      <p className="home-intro-text space-below">
        <strong>5-Year History Minimum:</strong> Because FZ is designed for long-term investing, assets require at least 5 consecutive
         calendar years of history. Younger assets are excluded from the database.
      </p>

      <p className="home-intro-text space-below">
        <strong>30-Year History Cap:</strong> Historical records are capped at a maximum of 30 years. Three decades capture multiple market cycles
         and economic environments while keeping the focus on modern, relevant market behavior.
      </p>

        {/*
      <p className="home-intro-text space-below">
        <strong>Active Assets:</strong> Only assets with returns through the last full calendar year are included. Assets that stopped trading earlier are excluded.
      </p>
      */}

      
       <p className="home-intro-text space-below">
        <strong>Equities & Exchange-Traded Funds (ETFs):</strong> Assets are sourced from primary US exchanges (NYSE, NYSE American, NYSE Arca, and Nasdaq).
        Penny stocks, warrants, rights, preferred shares, and units are excluded. Calculations use total adjusted closing prices to incorporate stock splits,
         dividend reinvestments, and capital distributions.
      </p>

       <p className="home-intro-text space-below">
        <strong>Open-End Mutual Funds:</strong> Assets are sourced directly from official SEC EDGAR regulatory registries across traditional 5-letter institutional and retail share classes.
         Performance is calculated using native end-of-day Net Asset Value (NAV) percentage-return tracking.
      </p>

    </div>
  );
}







export function IntroductionRow_17() {
  const emailSubject = encodeURIComponent("Financial Zone Feedback / Inquiry");
  const emailBody = encodeURIComponent(
    "Hello Financial Zone Team,\n\nI would like to share the following feedback/issue:\n\n"
  );

  return (
    <div className="home-intro-card">
      <h2 className="home-intro-title">Contact & Accuracy</h2>
      
      <p className="home-intro-text">
        We strive to ensure every calculation is accurate and error-free. If you spot an error, inconsistency,
         or have ideas for improvement, we encourage your feedback.
      </p>

      <div style={{ marginTop: "12px", textAlign: "center" }}>
        <a 
          href={`mailto:fzhubsupport@gmail.com?subject=${emailSubject}&body=${emailBody}`}
          className="basic-3d-button fz-contact-button"
        >
          <span className="fz-contact-label">Contact</span>
          <span className="fz-contact-brand">FZ</span>
        </a>
      </div>

    </div>
  );
}










// ROW 3: DESCRIPTION PARAGRAPH (Slot ready for Step 3)
export function DescriptionRow() {
  return (
    <div className="home-description-container">
      {/* Description paragraph content will go here */}
    </div>
  );
}

// ROW 3: SHOWCASE THUMBNAILS ONLY

export function ShowcaseRow({ showcaseKeys, helpTopics, setActiveShowcaseKey }) {
  const timeoutRef = useRef(null);

  const handleMouseEnter = (key) => {
    // Clear any pending timers (whether opening another or closing)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Slight delay (XXXms) so quick mouse sweeps don't trigger popups
    timeoutRef.current = setTimeout(() => {
      setActiveShowcaseKey(key);
    }, 400);
  };

  const handleRowMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Small grace period before closing when leaving the entire row
    timeoutRef.current = setTimeout(() => {
      setActiveShowcaseKey(null);
    }, 150);
  };

  return (
    <div className="showcase-card-container">
      {/* Integrated Pill Header */}
      <Hint text="Hover to expand the image" position="bottom">
        <div className="home-hover-pill">
          A sampling of FZ features - hover any thumbnail to expand
        </div>
      </Hint>

      {/* Thumbnail Grid - Container handles row-level leave */}
      <div className="showcase-row" onMouseLeave={handleRowMouseLeave}>
        {showcaseKeys.map((key) => {
          const topic = helpTopics?.[key];
          const imgSrc = typeof topic?.image === 'string' ? topic.image : topic?.image?.src;

          return (
            <div
              key={key}
              className="showcase-card tombstone"
              onMouseEnter={() => handleMouseEnter(key)}
            >
              {imgSrc && (
                <img 
                  src={imgSrc} 
                  alt={topic?.title || key} 
                  className="showcase-thumbnail-img" 
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


export function xxxxxxShowcaseRow({ showcaseKeys, helpTopics, setActiveShowcaseKey }) {
  return (
    <div className="showcase-card-container">
      {/* Integrated Pill Header */}
      <div className="home-hover-pill">
        A sampling of FZ features - hover any thumbnail to expand
      </div>

      {/* Thumbnail Grid */}
      <div className="showcase-row">
        {showcaseKeys.map((key) => {
          const topic = helpTopics?.[key];
          const imgSrc = typeof topic?.image === 'string' ? topic.image : topic?.image?.src;

          return (
            <div
              key={key}
              className="showcase-card tombstone"
              onMouseEnter={() => setActiveShowcaseKey(key)}
              onMouseLeave={() => setActiveShowcaseKey(null)}
            >
              {imgSrc && (
                <img 
                  src={imgSrc} 
                  alt={topic?.title || key} 
                  className="showcase-thumbnail-img" 
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// SEPARATE POP-UP STAGE OVERLAY
export function xxxShowcaseStage({ activeShowcaseKey, helpTopics }) {
  if (!activeShowcaseKey) return null;

  const topic = helpTopics?.[activeShowcaseKey];
  const imgSrc = typeof topic?.image === 'string' ? topic.image : topic?.image?.src;

  if (!imgSrc) return null;

  return (
    <div className="showcase-stage-container">
      <img 
        src={imgSrc} 
        alt="Feature Stage Preview" 
        className="showcase-stage-img"
      />
    </div>
  );
}

// SEPARATE POP-UP STAGE OVERLAY
export function xxxxShowcaseStage({ activeShowcaseKey, helpTopics }) {
  const topic = activeShowcaseKey ? helpTopics?.[activeShowcaseKey] : null;
  const imgSrc = typeof topic?.image === 'string' ? topic.image : topic?.image?.src;
  const isVisible = Boolean(activeShowcaseKey && imgSrc);

  return (
    <div className={`showcase-stage-container ${isVisible ? 'is-visible' : 'is-hidden'}`}>
      {imgSrc && (
        <img 
          src={imgSrc} 
          alt="Feature Stage Preview" 
          className="showcase-stage-img"
        />
      )}
    </div>
  );
}

export function ShowcaseStage({ activeShowcaseKey, helpTopics }) {
  const topic = activeShowcaseKey ? helpTopics?.[activeShowcaseKey] : null;
  const currentImgSrc = typeof topic?.image === 'string' ? topic.image : topic?.image?.src;
  
  // Cache the last valid image so it stays visible while fading out
  const lastImgSrcRef = useRef(null);
  if (currentImgSrc) {
    lastImgSrcRef.current = currentImgSrc;
  }

  const isVisible = Boolean(activeShowcaseKey && currentImgSrc);
  const displaySrc = currentImgSrc || lastImgSrcRef.current;

  return (
    <div className={`showcase-stage-container ${isVisible ? 'is-visible' : 'is-hidden'}`}>
      {displaySrc && (
        <img 
          src={displaySrc} 
          alt="Feature Stage Preview" 
          className="showcase-stage-img"
        />
      )}
    </div>
  );
}



// ROW 4: QUOTE FOOTER (Slot ready for Step 4)
export function QuoteFooterRow() {
  return (
    <div className="home-quote-container">
      {/* Slimmed down quote box content will go here */}
    </div>
  );
}


// ROW 3: QUOTE ROW
