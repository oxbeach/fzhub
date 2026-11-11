/*

import DevAutoLogin from '../Utils/DevAutoLogin';

export const metadata = {
  title: 'Financial Zone',
  description: 'Portfolio Analysis Tool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <DevAutoLogin />
        {children}
      </body>
    </html>
  );
}

*/

/*
export const metadata = {
  title: 'Financial Zone',
  description: 'Portfolio Analysis Tool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
 */

import { HelpProvider } from '../Help/HelpContext';
import { HelpPortal } from '../Help/HelpPortal';
import { getHelpTopics } from '../Help/getHelpTopics';

import '../Styles/Global/Help.css';

export const metadata = {
  title: 'Financial Zone',
  description: 'Portfolio AnalysisTool',
};

export default async function RootLayout({ children }) {
  let initialTopics = {};

  try {
    initialTopics = await getHelpTopics();
  } catch (err) {
    //console.error('❌ Failed loading help topics in layout:', err);
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <HelpProvider initialTopics={initialTopics}>
          <div id="global-hint-root"></div>
          {children}
          <HelpPortal />
        </HelpProvider>
      </body>
    </html>
  );
}