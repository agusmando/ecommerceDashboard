"use client";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import ThirdParty, { Google } from "supertokens-auth-react/recipe/thirdparty";
import Session from "supertokens-auth-react/recipe/session";
import { JSX } from "react";

export const SuperTokensConfig = {
  appInfo: {
    // learn more about this on https://supertokens.com/docs/references/frontend-sdks/reference#sdk-configuration
    appName: "Canela en Rama",
    apiDomain: "https://canelaenramaback.onrender.com",
    websiteDomain: "http://localhost:5173",
    apiBasePath: "/api/auth",
    websiteBasePath: "/login",
  },
  recipeList: [
    EmailPassword.init(),
    ThirdParty.init({
      signInAndUpFeature: {
        providers: [Google.init()],
      },
    }),
    Session.init(),
  ],
};
export const ComponentWrapper = (props: {
  children: JSX.Element;
}): JSX.Element => {
  return props.children;
};
