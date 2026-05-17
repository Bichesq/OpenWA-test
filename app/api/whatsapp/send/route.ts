import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { sendWhatsAppMessage } from '@/lib/whatsapp/service';
import { messageTemplates, TemplateKey } from '@/lib/whatsapp/templates';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scenario } = body;

    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Missing "scenario" parameter in request body.' },
        { status: 400 }
      );
    }

    const config = getWhatsAppConfig();

    if (!config.enabled) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp integration is disabled in system configurations.' },
        { status: 403 }
      );
    }

    // 1. Resolve target identifier and description
    let target = '';
    let targetDescription = '';

    switch (scenario as TemplateKey) {
      case 'personal':
        target = config.myNumber;
        targetDescription = 'Personal WhatsApp Number';
        break;
      case 'registration':
        target = config.myNumber;
        targetDescription = 'Personal Number (Registration Alert)';
        break;
      case 'group':
        target = config.updatesGroupId;
        targetDescription = 'Updates Group Chat';
        break;
      case 'private':
        target = config.testClientId;
        targetDescription = 'Private Client Chat';
        break;
      case 'ping':
        target = config.myNumber;
        targetDescription = 'Personal Number (Ping)';
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Invalid test scenario: "${scenario}".` },
          { status: 400 }
        );
    }

    // 2. Validate target existence
    if (!target) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Target variable is not configured for scenario "${scenario}". Please set the correct environment variables.` 
        },
        { status: 400 }
      );
    }

    // 3. Generate message content
    const templateFunction = messageTemplates[scenario as TemplateKey];
    const messageContent = templateFunction();

    console.log(`[API Send Route] Sending ${scenario} message to: ${targetDescription}`);

    // 4. Forward message to Render API
    const result = await sendWhatsAppMessage(target, messageContent);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully sent "${scenario}" message!`,
        messageId: result.messageId,
        target: targetDescription,
        content: messageContent,
        timestamp: result.timestamp,
      }, { status: 200 });
    }

    // Return detailed API errors
    return NextResponse.json({
      success: false,
      error: result.error || 'Failed to dispatch WhatsApp message.',
      details: result.details,
    }, { status: 502 }); // Bad Gateway since Render failed

  } catch (error: any) {
    console.error('[API Send Route] Internal execution error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error occurred.',
    }, { status: 500 });
  }
}
