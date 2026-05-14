/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail no VetorPro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bem-vindo ao VetorPro</Heading>
        <Text style={text}>
          Obrigado por criar sua conta em{' '}
          <Link href={siteUrl} style={link}>
            <strong>VetorPro</strong>
          </Link>
          . Para ativar o acesso à plataforma, confirme seu e-mail (
          <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
          ) clicando no botão abaixo:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar meu e-mail
        </Button>
        <Text style={footer}>
          Se você não criou esta conta, pode ignorar este e-mail com segurança.
          <br />— Equipe VetorPro
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(212, 84%, 27%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(222, 47%, 11%)',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const link = { color: 'hsl(212, 84%, 27%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(212, 84%, 27%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#777', margin: '32px 0 0', lineHeight: '1.5' }
