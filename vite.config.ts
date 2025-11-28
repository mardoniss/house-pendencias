import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// __dirname é o diretório do arquivo atual (vite.config.js)
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente, garantindo que o prefixo 'VITE_' não seja necessário
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // Configurações do servidor de desenvolvimento
    server: {
      port: 3000,
      host: '0.0.0.0', // Permite acesso via IP local na rede
    },
    
    // Plugins do Vite
    plugins: [react()],
    
    // Define variáveis globais no seu código (usado para injeção de .env)
    define: {
      // Adiciona apenas a chave necessária e já stringificada
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    
    // Configurações de resolução de módulos (aliases)
    resolve: {
      alias: {
        // AJUSTE MELHORIA:
        // O Alias '@' agora aponta para './src', que é a prática comum para
        // imports absolutos (ex: import Button from '@/components/Button')
        '@': path.resolve(__dirname, './src'), 
      },
    }
  };
});
