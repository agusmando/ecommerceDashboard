"use client";
import React from "react";
import { SuperTokensWrapper } from "supertokens-auth-react";
import SuperTokens from "supertokens-auth-react";
import { SuperTokensConfig } from "../config/supertokens";

if (typeof window !== "undefined") {
  SuperTokens.init(SuperTokensConfig);
}

export function SuperTokensProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
}
