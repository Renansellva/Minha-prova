// Configurações do Sistema Minha Prova
// Copie este arquivo para config.js e ajuste conforme necessário

module.exports = {
  // Ambiente
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Porta do servidor
  PORT: process.env.PORT || 3000,
  
  // Sessão secreta (gere uma nova para produção)
  SESSION_SECRET: process.env.SESSION_SECRET || 'sua_chave_secreta_aqui',
  
  // Banco de dados
  DATABASE_URL: process.env.DATABASE_URL || './database.db',
  
  // Configurações específicas do ambiente
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // URLs (para produção, será definido pela Vercel)
  BASE_URL: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'
};
