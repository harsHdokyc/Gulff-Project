import { ReactNode } from 'react';

export interface RouteConfig {
  path: string;
  element: ReactNode;
  protected?: boolean;
  requireOnboarding?: boolean;
}

export interface PublicRoute extends RouteConfig {
  protected: false;
}

export interface ProtectedRoute extends RouteConfig {
  protected: true;
  requireOnboarding: boolean;
}

export interface AuthRoute extends RouteConfig {
  protected: false;
}
