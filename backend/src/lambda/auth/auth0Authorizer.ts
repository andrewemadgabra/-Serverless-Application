import { CustomAuthorizerHandler, CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'

import { verify, decode } from 'jsonwebtoken'
//import { verify } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
//import Axios from 'axios'
import { Jwt } from '../../auth/Jwt'
import { JwtPayload } from '../../auth/JwtPayload'

const logger = createLogger('auth')

// TODO: Provide a URL that can be used to download a certificate that can be used
// to verify JWT token signature.
// To get this URL you need to go to an Auth0 page -> Show Advanced Settings -> Endpoints -> JSON Web Key Set
//const jwksUrl = 'https://dev-lpxl6oat.auth0.com/.well-known/jwks.json'

const cert = `-----BEGIN CERTIFICATE-----
MIIDBzCCAe+gAwIBAgIJGlE3uYNmrfqmMA0GCSqGSIb3DQEBCwUAMCExHzAdBgNV
BAMTFmRldi1scHhsNm9hdC5hdXRoMC5jb20wHhcNMjAwMzI5MTUxMzMwWhcNMzMx
MjA2MTUxMzMwWjAhMR8wHQYDVQQDExZkZXYtbHB4bDZvYXQuYXV0aDAuY29tMIIB
IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4pFHfG18lJmWVcEAyj0U+/7u
rSTca98ew2nlpqiivDSRij17LvV6dtwmKPc2T9sx6+jYXQ5AN4UUP1wY5uzEh4i0
qwYE1pw2bo47a+HcMf3Ny1i9VzieQtJRl+8nOiUaaA7JJ+90KIU1S8SQNWBw8b97
qrc7dLCCojOobxufgrVyi5svR1FCzukmMxepugOw51RaSc6Qsn8Xa20pRuDW8R2T
Cdnd9oBBJuRNEf0WtbUD1TsB3M1ZqeYsm82SkDHrwWVg09CMJ5Upe7u9rbqAECsc
1yWkO6pTg3NsPrYK5Znnj0ywgTl9GDZ3tTqyf/6wBnJLaXhUB2/zUWJzaMBr/wID
AQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSdq/lKvVzjqKvFPF42
bHozBKKTkTAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEBAH9hInm2
RB8hqUHK27xLmrojU2plbSuTP46emQdouFb7g4tBoj8P3ov0sVLvcD1Eun22HojD
+AkrZgOXQRR1X0wPwnMFg4F7dDe0RAJoeVVoZB9MqcXNK/T38MBsncKsDmtvKJ8S
p/zvqzGgrubQXomrDRJhcdE56/mnArgeJ5mw/88AB+8H/p1/KKFPVB1us+u93geV
viVLwuFM64P7W11nM0G/ezWoztTo+nLTTekP9LseBuhIaHqP5XeTuwJpIs39+gif
hjWw8pKIbywJ7DFiOL4Pg9NlRW6p44EqLLDyZOQULVwxqsRBosRXnSbfmiUykyPj
pUu6Jvrs+FnZLlA=
-----END CERTIFICATE-----`


export const handler: CustomAuthorizerHandler = async (event: CustomAuthorizerEvent): Promise<CustomAuthorizerResult> => {
  logger.info('Authorizing a user', event.authorizationToken)
  try {
    const decodeToken = verifyToken(event.authorizationToken)
    logger.info('User was authorized', decodeToken)

    return {
      principalId: decodeToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.info('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

function verifyToken(authHeader: string): JwtPayload {
  const token = getToken(authHeader)
  const jwt: Jwt = decode(token, { complete: true }) as Jwt

  logger.info('jwt token', jwt)


  // TODO: Implement token verification
  // You should implement it similarly to how it was implemented for the exercise for the lesson 5
  // You can read more about how to do this here: https://auth0.com/blog/navigating-rs256-and-jwks/
  return verify(token, cert, { algorithms: ['RS256'] }) as JwtPayload
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return token
}