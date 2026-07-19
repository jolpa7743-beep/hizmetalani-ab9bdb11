import * as React from "react";
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  code?: string;
  name?: string;
}

const Email = ({ code = "000000", name }: Props) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>Profil doğrulama kodunuz: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Profil Doğrulama</Heading>
        <Text style={text}>
          Merhaba{name ? ` ${name}` : ""},
        </Text>
        <Text style={text}>
          Hizmet Alanı profilinizi doğrulamak için aşağıdaki 6 haneli kodu doğrulama
          ekranına girin. Bu işlem tamamlandığında profilinize <strong>Doğrulanmış</strong>{" "}
          rozeti otomatik olarak eklenir.
        </Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{code}</Text>
        </Section>
        <Text style={muted}>
          Kod 15 dakika boyunca geçerlidir. Bu isteği siz yapmadıysanız e-postayı
          görmezden gelebilirsiniz.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Hizmet Alanı — hizmetalani.com</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Profil doğrulama kodunuz",
  displayName: "Profil Doğrulama Kodu",
  previewData: { code: "482913", name: "Ahmet" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { color: "#0f172a", fontSize: "22px", margin: "0 0 16px" };
const text = { color: "#334155", fontSize: "15px", lineHeight: "1.6", margin: "0 0 12px" };
const codeBox = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px",
  textAlign: "center" as const,
  margin: "20px 0",
};
const codeStyle = {
  fontSize: "34px",
  letterSpacing: "10px",
  fontWeight: 700 as const,
  color: "#0f172a",
  margin: 0,
};
const muted = { color: "#64748b", fontSize: "13px", margin: "8px 0 0" };
const hr = { borderColor: "#e2e8f0", margin: "24px 0" };
const footer = { color: "#94a3b8", fontSize: "12px", textAlign: "center" as const };
