import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { colors, inputFontSize } from '@/theme';

/**
 * HTML-Gerüst für den statischen Web-Export.
 * Läuft nur beim Build (Node), nie im Browser – hier daher keine Browser-APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  // SDK 58: Skripte, Styles und Meta-Daten kommen über diesen Kontext.
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  const css = `
html, body, #root { height: 100%; background-color: ${colors.background}; }
body {
  margin: 0;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: ${colors.transparent};
  -webkit-text-size-adjust: 100%;
  touch-action: manipulation;
  color: ${colors.text};
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
/* Mindestens 17 px – sonst zoomt iOS beim Tippen hinein. Komponenten setzen größere Werte selbst. */
input, textarea, select { font-size: ${inputFontSize}px; }
* { -webkit-touch-callout: none; }
input, textarea { -webkit-user-select: text; user-select: text; }
`;
  return (
    <html {...htmlAttributes} lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={colors.background} />
        <meta name="color-scheme" content="dark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Training" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="description" content="Schneller Trainingslogger mit Gewichtsassistent – funktioniert auch offline." />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
