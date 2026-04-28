// LTI 1.3 claim keys and type definitions

export const LTI_VERSION = '1.3.0';
export const LTI_MESSAGE_TYPE_LAUNCH = 'LtiResourceLinkRequest';
export const LTI_MESSAGE_TYPE_DEEP_LINK = 'LtiDeepLinkingRequest';
export const LTI_MESSAGE_TYPE_SUBMISSION_REVIEW = 'LtiSubmissionReviewRequest';

export interface LtiClaims {
  // Standard OIDC
  sub: string; // platform user id
  iss: string; // platform issuer
  aud: string; // client_id
  exp: number;
  iat: number;
  nonce: string;

  // LTI core claims
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
  'https://purl.imsglobal.org/spec/lti/claim/version': string;
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;

  // Context
  'https://purl.imsglobal.org/spec/lti/claim/context'?: {
    id: string;
    label?: string;
    title?: string;
    type?: string[];
  };

  // Resource link
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
    id: string;
    title?: string;
    description?: string;
  };

  // Roles
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];

  // Names and email
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;

  // AGS claim
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'?: {
    scope: string[];
    lineitems?: string;
    lineitem?: string;
  };

  // NRPS claim
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'?: {
    context_memberships_url: string;
    service_versions: string[];
  };

  // Deep linking settings
  'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'?: {
    deep_link_return_url: string;
    accept_types: string[];
    accept_presentation_document_targets: string[];
    accept_multiple: boolean;
    auto_create: boolean;
    title?: string;
  };

  // Custom
  'https://purl.imsglobal.org/spec/lti/claim/custom'?: Record<string, string>;
}

export interface LtiPlatformConfig {
  id: string;
  name: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  keySetUrl: string;
  accessTokenUrl: string;
}

export interface AgsScore {
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string;
  timestamp: string;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
}
