# 📋 Configurações da Vercel

Este documento lista todas as variáveis de ambiente e configurações necessárias para fazer o deploy na Vercel.

## 🔧 Variáveis de Ambiente Obrigatórias

### 1. **NODE_ENV**
- **Valor:** `production`
- **Descrição:** Define o ambiente como produção
- **Status:** ✅ Já configurado no `vercel.json`

### 2. **PAID_EMAILS** (Obrigatória para produção)
- **Tipo:** String (lista separada por vírgulas)
- **Formato:** `email1@exemplo.com,email2@exemplo.com,email3@exemplo.com`
- **Descrição:** Lista de e-mails dos usuários que têm plano mensal ativo
- **Exemplo:** 
  ```
  professor1@escola.com,professor2@escola.com,admin@escola.com
  ```
- **Importante:** 
  - O e-mail `admin@escola.com` sempre tem acesso (não precisa estar na lista)
  - Em desenvolvimento (localhost), essa verificação é ignorada
  - Em produção, apenas e-mails nesta lista terão acesso completo

### 3. **PLANO_PIX_LINK** (Obrigatória)
- **Tipo:** String (URL)
- **Formato:** Link do PagSeguro ou outra plataforma de pagamento
- **Descrição:** Link para pagamento do plano mensal via Pix
- **Valor padrão:** `https://pag.ae/81fwV3eHJ` (se não configurado)
- **Exemplo:**
  ```
  https://pag.ae/81fwV3eHJ
  ```
- **Onde é usado:**
  - Página `/plano-mensal`
  - Seção de assinatura no perfil
  - Mensagens de erro quando plano não está ativo

## 🔥 Variáveis de Ambiente Opcionais (Firebase)

### 4. **FIREBASE_SERVICE_ACCOUNT** (Opcional)
- **Tipo:** String (JSON completo)
- **Descrição:** Credenciais do Firebase Admin SDK em formato JSON
- **Como obter:**
  1. Acesse o [Firebase Console](https://console.firebase.google.com/)
  2. Vá em Configurações do Projeto → Contas de Serviço
  3. Clique em "Gerar nova chave privada"
  4. Copie TODO o conteúdo do JSON
- **Formato:** JSON completo em uma única linha (sem quebras)
- **Exemplo:**
  ```
  {"type":"service_account","project_id":"seu-projeto","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
  ```
- **Importante:**
  - Se não configurar, o Firebase não será inicializado (mas o app funciona sem ele)
  - O app usa banco em memória na Vercel se Firebase não estiver configurado
  - Para usar Firebase, você DEVE configurar esta variável

## 📝 Como Configurar na Vercel

### Passo a Passo:

1. **Acesse o Dashboard da Vercel**
   - Vá para [vercel.com](https://vercel.com)
   - Faça login na sua conta

2. **Selecione seu Projeto**
   - Clique no projeto que você quer configurar

3. **Vá em Settings → Environment Variables**
   - No menu lateral, clique em **Settings**
   - Depois clique em **Environment Variables**

4. **Adicione cada variável:**
   - Clique em **Add New**
   - Digite o **Name** (nome da variável)
   - Digite o **Value** (valor)
   - Selecione os **Environments** onde ela será usada:
     - ✅ Production
     - ✅ Preview (opcional, para testes)
     - ✅ Development (opcional)
   - Clique em **Save**

5. **Re-deploy após adicionar variáveis**
   - Após adicionar novas variáveis, faça um novo deploy
   - Vá em **Deployments** → Clique nos 3 pontos → **Redeploy**

## 📋 Checklist de Configuração

Marque conforme você configura:

- [ ] **NODE_ENV** = `production` (já configurado no vercel.json)
- [ ] **PAID_EMAILS** = lista de e-mails com plano ativo
- [ ] **PLANO_PIX_LINK** = link do PagSeguro/Pix
- [ ] **FIREBASE_SERVICE_ACCOUNT** = JSON do Firebase (opcional)

## 🎯 Configuração Mínima para Funcionar

Para o app funcionar na Vercel, você precisa configurar **NO MÍNIMO**:

1. ✅ **PAID_EMAILS** - Lista de e-mails autorizados
2. ✅ **PLANO_PIX_LINK** - Link de pagamento

O Firebase é opcional. Se não configurar, o app usará banco em memória (dados serão perdidos ao reiniciar).

## ⚠️ Importante

### Sobre o Banco de Dados:
- **Na Vercel:** O app usa `MemoryDatabase` (banco em memória)
- **Localmente:** O app usa SQLite (`database.db`)
- **Com Firebase:** Se configurado, pode usar Firebase Firestore

### Sobre Uploads:
- Arquivos enviados são salvos em `public/uploads/`
- Na Vercel, esses arquivos são temporários (serão perdidos em novos deploys)
- Considere usar um serviço de storage (AWS S3, Cloudinary, etc.) para produção

### Sobre Sessões:
- As sessões são armazenadas em memória
- Em produção com múltiplas instâncias, considere usar Redis ou banco de dados para sessões

## 🔍 Como Testar

Após configurar, teste:

1. **Teste de conexão:**
   - Acesse: `https://seu-dominio.vercel.app/test`
   - Deve retornar status OK

2. **Teste do Firebase (se configurado):**
   - Acesse: `https://seu-dominio.vercel.app/firebase-test`
   - Deve retornar sucesso se Firebase estiver configurado

3. **Teste de login:**
   - Tente fazer login com um e-mail da lista `PAID_EMAILS`
   - Deve funcionar normalmente

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs na Vercel (Deployments → selecione o deploy → View Function Logs)
2. Verifique se todas as variáveis estão configuradas corretamente
3. Certifique-se de que fez um novo deploy após adicionar variáveis


