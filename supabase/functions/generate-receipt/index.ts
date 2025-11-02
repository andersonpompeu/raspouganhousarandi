import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import QRCode from 'https://esm.sh/qrcode@1.5.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateReceiptHTML(data: any): Promise<string> {
  const qrCodeDataURL = await QRCode.toDataURL(data.verificationCode, {
    width: 200,
    margin: 2,
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .receipt {
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #4CAF50;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #4CAF50;
      margin: 0;
    }
    .subtitle {
      color: #666;
      margin: 5px 0 0 0;
    }
    .qr-code {
      text-align: center;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .label {
      font-weight: bold;
      color: #333;
    }
    .value {
      color: #666;
    }
    .prize-box {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      text-align: center;
    }
    .prize-name {
      font-size: 20px;
      font-weight: bold;
      color: #4CAF50;
    }
    .prize-value {
      font-size: 28px;
      font-weight: bold;
      color: #FF9800;
      margin: 10px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #4CAF50;
      color: #666;
      font-size: 12px;
    }
    .success-badge {
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      display: inline-block;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1 class="title">🎉 Comprovante de Prêmio</h1>
      <p class="subtitle">Raspadinha da Sorte</p>
      <div class="success-badge">✓ VALIDADO</div>
    </div>

    <div class="prize-box">
      <div class="prize-name">${data.prizeName}</div>
      <div class="prize-value">R$ ${data.prizeValue.toFixed(2)}</div>
    </div>

    <div class="info-row">
      <span class="label">Cliente:</span>
      <span class="value">${data.customerName}</span>
    </div>

    <div class="info-row">
      <span class="label">Telefone:</span>
      <span class="value">${data.customerPhone}</span>
    </div>

    <div class="info-row">
      <span class="label">Código Serial:</span>
      <span class="value">${data.serialCode}</span>
    </div>

    <div class="info-row">
      <span class="label">Data de Registro:</span>
      <span class="value">${new Date(data.registeredAt).toLocaleString('pt-BR')}</span>
    </div>

    ${data.redeemedAt ? `
    <div class="info-row">
      <span class="label">Data de Retirada:</span>
      <span class="value">${new Date(data.redeemedAt).toLocaleString('pt-BR')}</span>
    </div>
    <div class="info-row">
      <span class="label">Atendente:</span>
      <span class="value">${data.attendantName}</span>
    </div>
    ` : ''}

    <div class="qr-code">
      <img src="${qrCodeDataURL}" alt="QR Code de Verificação" />
      <p style="font-size: 12px; color: #666; margin-top: 10px;">
        Código de Verificação<br/>
        <strong>${data.verificationCode}</strong>
      </p>
    </div>

    <div class="footer">
      <p>Este comprovante é válido para retirada do prêmio.</p>
      <p>Apresente este comprovante na loja.</p>
      <p style="margin-top: 10px;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registrationId } = await req.json();
    
    if (!registrationId) {
      throw new Error('Registration ID is required');
    }

    console.log('📄 Gerando comprovante para registration:', registrationId);

    // Buscar dados do registro
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select(`
        *,
        scratch_cards!inner(
          serial_code,
          prizes(name, prize_value)
        ),
        redemptions(redeemed_at, attendant_name)
      `)
      .eq('id', registrationId)
      .single();

    if (regError || !registration) {
      throw new Error('Registration not found');
    }

    // Verificar se já existe comprovante
    const { data: existingReceipt } = await supabase
      .from('digital_receipts')
      .select('*')
      .eq('registration_id', registrationId)
      .maybeSingle();

    if (existingReceipt) {
      console.log('✅ Comprovante já existe');
      return new Response(
        JSON.stringify({ 
          success: true, 
          receiptUrl: existingReceipt.receipt_url,
          qrCode: existingReceipt.qr_code_data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar código de verificação único
    const verificationCode = `${registration.scratch_cards.serial_code}-${Date.now()}`;

    // Preparar dados para o comprovante
    const receiptData = {
      customerName: registration.customer_name,
      customerPhone: registration.customer_phone,
      prizeName: registration.scratch_cards.prizes?.name || 'Prêmio',
      prizeValue: registration.scratch_cards.prizes?.prize_value || 0,
      serialCode: registration.scratch_cards.serial_code,
      registeredAt: registration.registered_at,
      redeemedAt: registration.redemptions?.[0]?.redeemed_at,
      attendantName: registration.redemptions?.[0]?.attendant_name,
      verificationCode,
    };

    // Gerar HTML do comprovante
    const html = await generateReceiptHTML(receiptData);

    // Converter HTML para base64 e salvar no storage
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const fileName = `receipt-${registrationId}-${Date.now()}.html`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('qr-codes')
      .upload(fileName, htmlBlob, {
        contentType: 'text/html',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('❌ Erro ao fazer upload:', uploadError);
      throw uploadError;
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('qr-codes')
      .getPublicUrl(fileName);

    // Salvar no banco de dados
    const { error: insertError } = await supabase
      .from('digital_receipts')
      .insert({
        registration_id: registrationId,
        receipt_url: publicUrl,
        qr_code_data: verificationCode,
      });

    if (insertError) {
      console.error('❌ Erro ao salvar comprovante:', insertError);
      throw insertError;
    }

    console.log('✅ Comprovante gerado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        receiptUrl: publicUrl,
        qrCode: verificationCode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao gerar comprovante:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});