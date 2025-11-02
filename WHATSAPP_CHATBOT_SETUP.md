# Configuração do Chatbot WhatsApp

## 📱 Funcionalidades Implementadas

### 1. **Gamificação Completa**
- ✅ Sistema de conquistas/badges desbloqueáveis
- ✅ 10 conquistas padrão (prêmios, pontos, tiers)
- ✅ Display visual de conquistas no dashboard do cliente
- ✅ Notificações automáticas quando conquistas são desbloqueadas
- ✅ Ranking de pontos (Top 10 clientes)

### 2. **Chatbot WhatsApp**
- ✅ Webhook para receber mensagens
- ✅ Comandos disponíveis:
  - `PONTOS` - Consultar saldo de pontos
  - `PREMIOS` - Ver histórico de prêmios
  - `CONQUISTAS` - Ver badges desbloqueados
  - `AJUDA` - Menu de comandos
- ✅ Respostas automáticas inteligentes
- ✅ Log de conversas no banco de dados

### 3. **Comprovante Digital**
- ✅ Geração automática de comprovante HTML
- ✅ QR Code de verificação único
- ✅ Dados completos: cliente, prêmio, datas
- ✅ Armazenamento no Supabase Storage
- ✅ Botão "Gerar Comprovante" no dashboard do cliente

---

## 🔧 Configuração do Webhook WhatsApp

### Passo 1: Obter URL do Webhook

A URL do webhook é:
```
https://qtcvgixswhahwtfvhelp.supabase.co/functions/v1/whatsapp-webhook
```

### Passo 2: Configurar na Evolution API

1. Acesse seu painel da Evolution API
2. Navegue até **Configurações de Webhooks**
3. Configure o webhook para o evento `messages.upsert`
4. Cole a URL acima no campo de webhook
5. Salve as configurações

### Passo 3: Testar o Chatbot

Envie mensagens para o número do WhatsApp conectado:

- Digite: `AJUDA` - para ver os comandos
- Digite: `PONTOS` - para ver saldo de pontos
- Digite: `PREMIOS` - para ver histórico
- Digite: `CONQUISTAS` - para ver badges

---

## 📊 Estrutura do Banco de Dados

### Novas Tabelas Criadas:

1. **achievements** - Conquistas disponíveis no sistema
2. **customer_achievements** - Conquistas desbloqueadas por clientes
3. **whatsapp_messages** - Log de mensagens do chatbot
4. **digital_receipts** - Comprovantes digitais gerados

### Edge Functions Criadas:

1. **whatsapp-webhook** - Recebe e processa mensagens
2. **generate-receipt** - Gera comprovantes digitais
3. **check-achievements** - Verifica e desbloqueia conquistas

---

## 🎮 Como Usar as Funcionalidades

### Para Clientes:

1. **Ver Conquistas**: Acesse o dashboard de clientes em `/meus-pontos`
2. **Chatbot**: Envie mensagens pelo WhatsApp conectado
3. **Comprovante**: Clique em "Gerar Comprovante" no histórico de prêmios

### Para Administradores:

1. **Ranking**: Veja o top 10 na aba "Fidelidade"
2. **Conquistas**: Monitoradas automaticamente pelo sistema
3. **Logs WhatsApp**: Armazenados na tabela `whatsapp_messages`

---

## 🚀 Próximos Passos

1. Configure o webhook na Evolution API
2. Teste os comandos do chatbot
3. Verifique se as conquistas estão sendo desbloqueadas
4. Teste a geração de comprovantes

---

## 💡 Dicas

- As conquistas são verificadas automaticamente após cada resgate
- O chatbot responde apenas a mensagens recebidas (não enviadas)
- Os comprovantes são salvos no bucket `qr-codes`
- O ranking é atualizado em tempo real

---

## 🔍 Troubleshooting

### Chatbot não responde?
- Verifique se o webhook está configurado corretamente
- Confira os logs na tabela `whatsapp_messages`
- Verifique as variáveis de ambiente (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME)

### Conquistas não desbloqueiam?
- Verifique os logs da edge function `check-achievements`
- Certifique-se de que o cliente tem pontos/prêmios suficientes

### Comprovante não gera?
- Verifique permissões do bucket `qr-codes`
- Confira logs da edge function `generate-receipt`

---

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Logs das edge functions no Supabase
2. Tabela `whatsapp_logs` para erros de envio
3. Tabela `whatsapp_messages` para histórico do chatbot