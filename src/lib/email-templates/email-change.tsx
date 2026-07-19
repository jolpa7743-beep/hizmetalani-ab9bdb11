import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>E-posta değişikliğini onaylayın — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>Hizmet Alanı</Text>
        </Section>
        <Heading style={h1}>E-posta değişikliğini onaylayın</Heading>
        <Text style={text}>
          {siteName} hesabınızın e-posta adresini{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>
          {' '}adresinden{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>
          {' '}adresine değiştirme talebi aldık. Değişikliği tamamlamak için
          aşağıdaki butona tıklayın.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Değişikliği Onayla
          </Button>
        </Section>
        <Text style={smallText}>
          Buton çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırabilirsiniz:
          <br />
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Bu talebi siz yapmadıysanız hesabınızın güvenliği için lütfen
          derhal şifrenizi değiştirin ve bizimle iletişime geçin.
        </Text>
        <Text style={footerBrand}>© {siteName} — Türkiye'nin Güvenilir Hizmet İlan Platformu</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#f6f8fb', fontFamily: 'Inter, Arial, sans-serif' }
const container = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '32px 32px 24px',
  margin: '24px auto',
  maxWidth: '560px',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
}
const brandBar = { paddingBottom: '16px', borderBottom: '1px solid #eef1f6', marginBottom: '24px' }
const brandText = { fontSize: '16px', fontWeight: 700 as const, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '12px', color: '#64748b', lineHeight: '1.6', margin: '16px 0 0', wordBreak: 'break-all' as const }
const link = { color: '#2563eb', textDecoration: 'underline' }
const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#eef1f6', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#64748b', lineHeight: '1.6', margin: '0 0 8px' }
const footerBrand = { fontSize: '11px', color: '#94a3b8', margin: 0 }
