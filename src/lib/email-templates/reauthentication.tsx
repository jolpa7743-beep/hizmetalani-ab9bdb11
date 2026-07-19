import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>Doğrulama kodunuz</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>hizmetalanı.com</Text>
        </Section>
        <Heading style={h1}>Kimliğinizi doğrulayın</Heading>
        <Text style={text}>
          İşleminizi tamamlamak için aşağıdaki tek kullanımlık doğrulama
          kodunu kullanın:
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Bu kod kısa süre içinde geçerliliğini yitirecektir. Bu talebi siz
          yapmadıysanız, bu e-postayı güvenle görmezden gelebilirsiniz.
        </Text>
        <Text style={footerBrand}>© hizmetalanı.com — Türkiye'nin Güvenilir Hizmet İlan Platformu</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '32px',
  fontWeight: 700 as const,
  color: '#0f172a',
  letterSpacing: '10px',
  backgroundColor: '#f1f5f9',
  padding: '16px 24px',
  borderRadius: '10px',
  display: 'inline-block',
  margin: 0,
}
const hr = { borderColor: '#eef1f6', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#64748b', lineHeight: '1.6', margin: '0 0 8px' }
const footerBrand = { fontSize: '11px', color: '#94a3b8', margin: 0 }
