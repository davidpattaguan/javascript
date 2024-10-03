import type { __internal_ProtectConfiguration } from '@clerk/shared';
import { __internal_findFailedProtectConfiguration } from '@clerk/shared';
import type {
  __experimental_SessionVerificationLevel,
  CheckAuthorizationWithCustomPermissions,
  HandleOAuthCallbackParams,
  OrganizationCustomPermissionKey,
  OrganizationCustomRoleKey,
} from '@clerk/types';
import React from 'react';

import { useAuthContext } from '../contexts/AuthContext';
import { useIsomorphicClerkContext } from '../contexts/IsomorphicClerkContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useAuth } from '../hooks';
import { useAssertWrappedByClerkProvider } from '../hooks/useAssertWrappedByClerkProvider';
import type { RedirectToSignInProps, RedirectToSignUpProps, WithClerkProp } from '../types';
import { UserVerificationModal, UserVerificationTrigger } from './complementary-components';
import { withClerk } from './withClerk';

export const SignedIn = ({ children }: React.PropsWithChildren<unknown>): JSX.Element | null => {
  useAssertWrappedByClerkProvider('SignedIn');

  const { userId } = useAuthContext();
  if (userId) {
    return <>{children}</>;
  }
  return null;
};

export const SignedOut = ({ children }: React.PropsWithChildren<unknown>): JSX.Element | null => {
  useAssertWrappedByClerkProvider('SignedOut');

  const { userId } = useAuthContext();
  if (userId === null) {
    return <>{children}</>;
  }
  return null;
};

export const ClerkLoaded = ({ children }: React.PropsWithChildren<unknown>): JSX.Element | null => {
  useAssertWrappedByClerkProvider('ClerkLoaded');

  const isomorphicClerk = useIsomorphicClerkContext();
  if (!isomorphicClerk.loaded) {
    return null;
  }
  return <>{children}</>;
};

export const ClerkLoading = ({ children }: React.PropsWithChildren<unknown>): JSX.Element | null => {
  useAssertWrappedByClerkProvider('ClerkLoading');

  const isomorphicClerk = useIsomorphicClerkContext();
  if (isomorphicClerk.loaded) {
    return null;
  }
  return <>{children}</>;
};

export type ProtectProps = React.PropsWithChildren<
  (
    | {
        condition?: never;
        role: OrganizationCustomRoleKey;
        permission?: never;
      }
    | {
        condition?: never;
        role?: never;
        permission: OrganizationCustomPermissionKey;
      }
    | {
        condition: (has: CheckAuthorizationWithCustomPermissions) => boolean;
        role?: never;
        permission?: never;
      }
    | {
        condition?: never;
        role?: never;
        permission?: never;
      }
  ) & {
    fallback?: React.ReactNode;
  }
>;

/**
 * Use `<Protect/>` in order to prevent unauthenticated or unauthorized users from accessing the children passed to the component.
 *
 * Examples:
 * ```
 * <Protect permission="a_permission_key" />
 * <Protect role="a_role_key" />
 * <Protect condition={(has) => has({permission:"a_permission_key"})} />
 * <Protect condition={(has) => has({role:"a_role_key"})} />
 * <Protect fallback={<p>Unauthorized</p>} />
 * ```
 */
export const Protect = ({ children, fallback, ...restAuthorizedParams }: ProtectProps) => {
  useAssertWrappedByClerkProvider('Protect');

  const { isLoaded, has, userId } = useAuth();

  /**
   * Avoid flickering children or fallback while clerk is loading sessionId or userId
   */
  if (!isLoaded) {
    return null;
  }

  /**
   * Fallback to UI provided by user or `null` if authorization checks failed
   */
  const unauthorized = <>{fallback ?? null}</>;

  const authorized = <>{children}</>;

  if (!userId) {
    return unauthorized;
  }

  /**
   * Check against the results of `has` called inside the callback
   */
  if (typeof restAuthorizedParams.condition === 'function') {
    if (restAuthorizedParams.condition(has)) {
      return authorized;
    }
    return unauthorized;
  }

  if (restAuthorizedParams.role || restAuthorizedParams.permission) {
    if (has(restAuthorizedParams)) {
      return authorized;
    }
    return unauthorized;
  }

  /**
   * If neither of the authorization params are passed behave as the `<SignedIn/>`.
   * If fallback is present render that instead of rendering nothing.
   */
  return authorized;
};
/* eslint-enable react-hooks/rules-of-hooks */

type ReactProtectConfiguration = __internal_ProtectConfiguration & {
  fallback?: React.ComponentType | 'modal';
};

type MyAuth = ReturnType<typeof useAuth>;
type InferStrictTypeParams<T extends WithProtectComponentReactParams> = T;

type NonNullable<T> = T extends null | undefined ? never : T;
type NonNullableRecord<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? NonNullable<T[P]> : T[P];
};

type WithProtectComponentReactParams =
  | {
      role: OrganizationCustomRoleKey;
      permission?: never;
      reverification?: never;
      fallback?: React.ComponentType;
    }
  | {
      role?: never;
      permission: OrganizationCustomPermissionKey;
      reverification?: never;
      fallback?: React.ComponentType;
    }
  | {
      condition?: never;
      role?: never;
      permission?: never;
      reverification:
        | 'veryStrict'
        | 'strict'
        | 'moderate'
        | 'lax'
        | {
            level: __experimental_SessionVerificationLevel;
            afterMinutes: number;
          };
      fallback?: React.ComponentType | 'modal';
    };

type ProtectComponentParams = {
  fallback?: React.ComponentType;
};

type ComponentParam<Props, AuthObject> = React.ComponentType<
  Props & {
    auth: AuthObject;
  }
>;

type CustomAuthObject<T extends WithProtectComponentReactParams> =
  InferStrictTypeParams<T> extends
    | { permission: any }
    | {
        role: any;
      }
    ? NonNullableRecord<MyAuth, 'orgId' | 'userId' | 'sessionId' | 'orgRole'>
    : NonNullableRecord<MyAuth, 'userId'>;

export function __experimental_protectComponent(params?: ProtectComponentParams) {
  const configs: ReactProtectConfiguration[] = params ? [params] : [];

  const withNext = <T extends WithProtectComponentReactParams>(nextParams: T) => {
    configs.push(nextParams);

    const component = <P,>(Component: ComponentParam<P, CustomAuthObject<T>>) => {
      return (props: P) => {
        const _auth = useAuth();

        const failedItem = __internal_findFailedProtectConfiguration(configs, _auth);

        if (failedItem?.fallback) {
          const Fallback = failedItem.fallback;

          if (Fallback === 'modal') {
            return <UserVerificationModal />;
          }

          // Types don't allow this
          if (typeof Fallback !== 'function') {
            throw 'As fallback, only a React Component or "modal" is allowed';
          }

          if (!failedItem.reverification) {
            return (
              // @ts-expect-error type props
              <Fallback
                {
                  // TODO-STEP-UP: Could this be unsafe ? Should we allow fallback to have access to children ?
                  ...props
                }
              />
            );
          }

          return (
            // @ts-expect-error type props
            <Fallback
              {
                // TODO-STEP-UP: Could this be unsafe ? Should we allow fallback to have access to children ?
                ...props
              }
              UserVerificationTrigger={UserVerificationTrigger}
            />
          );
        }

        if (failedItem) {
          return null;
        }

        return (
          <Component
            {...props}
            auth={_auth as CustomAuthObject<T>}
          />
        );
      };
    };

    return { with: withNext, component };
  };

  const component = <P,>(Component: ComponentParam<P, NonNullableRecord<MyAuth, 'userId'>>) => {
    return (props: P) => {
      const _auth = useAuth();

      const failedItem = __internal_findFailedProtectConfiguration(configs, _auth);

      if (failedItem?.fallback) {
        const Fallback = failedItem.fallback;

        // Types don't allow this
        if (typeof Fallback !== 'function') {
          throw 'As fallback, only a React Component is allowed';
        }

        return (
          // @ts-expect-error type props
          <Fallback
            {
              // TODO-STEP-UP: Could this be unsafe ? Should we allow fallback to have access to children ?
              ...props
            }
          />
        );
      }

      if (failedItem) {
        return null;
      }

      return (
        <Component
          {...props}
          auth={_auth as NonNullableRecord<MyAuth, 'userId'>}
        />
      );
    };
  };

  // Return the protect method and the component method to enable chaining
  return { with: withNext, component };
}

export const RedirectToSignIn = withClerk(({ clerk, ...props }: WithClerkProp<RedirectToSignInProps>) => {
  const { client, session } = clerk;
  const hasActiveSessions = client.activeSessions && client.activeSessions.length > 0;

  React.useEffect(() => {
    if (session === null && hasActiveSessions) {
      void clerk.redirectToAfterSignOut();
    } else {
      void clerk.redirectToSignIn(props);
    }
  }, []);

  return null;
}, 'RedirectToSignIn');

export const RedirectToSignUp = withClerk(({ clerk, ...props }: WithClerkProp<RedirectToSignUpProps>) => {
  React.useEffect(() => {
    void clerk.redirectToSignUp(props);
  }, []);

  return null;
}, 'RedirectToSignUp');

export const RedirectToUserProfile = withClerk(({ clerk }) => {
  React.useEffect(() => {
    void clerk.redirectToUserProfile();
  }, []);

  return null;
}, 'RedirectToUserProfile');

export const RedirectToOrganizationProfile = withClerk(({ clerk }) => {
  React.useEffect(() => {
    void clerk.redirectToOrganizationProfile();
  }, []);

  return null;
}, 'RedirectToOrganizationProfile');

export const RedirectToCreateOrganization = withClerk(({ clerk }) => {
  React.useEffect(() => {
    void clerk.redirectToCreateOrganization();
  }, []);

  return null;
}, 'RedirectToCreateOrganization');

export const AuthenticateWithRedirectCallback = withClerk(
  ({ clerk, ...handleRedirectCallbackParams }: WithClerkProp<HandleOAuthCallbackParams>) => {
    React.useEffect(() => {
      void clerk.handleRedirectCallback(handleRedirectCallbackParams);
    }, []);

    return null;
  },
  'AuthenticateWithRedirectCallback',
);

export const MultisessionAppSupport = ({ children }: React.PropsWithChildren<unknown>): JSX.Element => {
  useAssertWrappedByClerkProvider('MultisessionAppSupport');

  const session = useSessionContext();
  return <React.Fragment key={session ? session.id : 'no-users'}>{children}</React.Fragment>;
};
