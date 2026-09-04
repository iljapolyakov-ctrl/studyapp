// Anmeldung über Microsoft (MSAL.js). Liefert ein Access Token, das storage.js
// für Aufrufe an die Microsoft Graph API (OneDrive) benutzt.

const Auth = (() => {
  let msalInstance = null;
  let account = null;

  async function init() {
    msalInstance = new msal.PublicClientApplication(APP_CONFIG.msal);
    await msalInstance.initialize();

    const response = await msalInstance.handleRedirectPromise().catch(() => null);
    if (response && response.account) {
      account = response.account;
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) account = accounts[0];
    }
    return account;
  }

  async function signIn() {
    const result = await msalInstance.loginPopup({ scopes: APP_CONFIG.scopes });
    account = result.account;
    return account;
  }

  function signOut() {
    if (!account) return;
    msalInstance.logoutPopup({ account });
    account = null;
  }

  async function getAccessToken() {
    if (!account) throw new Error("Nicht angemeldet");
    const request = { scopes: APP_CONFIG.scopes, account };
    try {
      const result = await msalInstance.acquireTokenSilent(request);
      return result.accessToken;
    } catch (err) {
      const result = await msalInstance.acquireTokenPopup(request);
      return result.accessToken;
    }
  }

  function isSignedIn() {
    return !!account;
  }

  function getAccount() {
    return account;
  }

  return { init, signIn, signOut, getAccessToken, isSignedIn, getAccount };
})();
