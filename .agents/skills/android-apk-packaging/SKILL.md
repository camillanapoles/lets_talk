---
name: android-apk-packaging
description: Procedimentos e especificações para geração de APK Android a partir do PWA utilizando Trusted Web Activities (TWA) e Bubblewrap CLI.
---

# Android APK & TWA Packaging Skill

Esta habilidade orienta o empacotamento do **Dialética** em um aplicativo Android nativo (APK/AAB) utilizando o padrão Trusted Web Activity (TWA) do Google Chrome e a ferramenta oficial Bubblewrap CLI.

## 1. Pré-Requisitos do PWA para TWA
O aplicativo atende a todos os critérios de instalabilidade Android:
- **Manifesto PWA**: `public/manifest.json` com `display: standalone`, `theme_color: #0b0f19` e ícones 192x192, 512x512 e `maskable`.
- **Permissão de Microfone**: Declarada no `metadata.json` e solicitada sob demanda do navegador/WebView.
- **HTTPS Obrigatório**: O TWA exige protocolo seguro HTTPS com certificado válido.

## 2. Geração do Projeto Android com Bubblewrap
Instalação da CLI:
```bash
npm install -g @bubblewrap/cli
```

Inicialização da TWA a partir do manifesto web:
```bash
bubblewrap init --manifest https://SEU-DOMINIO-PROD/manifest.json
```

Compilação do APK nativo:
```bash
bubblewrap build
```
Isso gera o arquivo `app-release-signed.apk` ou `app-release-unsigned.apk` pronto para instalação em dispositivos Android ou publicação na Google Play Store.

## 3. Verificação Digital Asset Links
Para remover a barra de endereço do navegador na TWA e torná-la 100% nativa em tela cheia:
- Gere a chave de assinatura SHA-256 da keystore.
- Publique o arquivo em `/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.dialetica.twa",
    "sha256_cert_fingerprints": ["SUA_CHAVE_SHA256_AQUI"]
  }
}]
```
